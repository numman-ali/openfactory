/**
 * OpenFactory - Smart Reindexing Differ
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Compares file hashes (SHA-256) against stored hashes to determine
 * which files need re-parsing and re-embedding. Only processes changed files.
 * Tracks indexing state: PENDING, INDEXING, COMPLETE, FAILED.
 */

import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { IndexedFile, IndexerRepository, GitHubClient, CodeParser, EmbeddingClient, CodeChunkWithEmbedding } from './index.js';
import { shouldSkipFile, formatChunkForEmbedding } from './index.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const IndexingState = z.enum(['PENDING', 'INDEXING', 'COMPLETE', 'FAILED']);
export type IndexingState = z.infer<typeof IndexingState>;

export const DiffResult = z.object({
  toAdd: z.array(z.object({ path: z.string(), sha: z.string() })),
  toUpdate: z.array(z.object({ path: z.string(), sha: z.string(), existingFileId: z.string() })),
  toDelete: z.array(z.object({ id: z.string(), filePath: z.string() })),
  unchanged: z.number().int().nonnegative(),
});
export type DiffResult = z.infer<typeof DiffResult>;

export const FileProcessingResult = z.object({
  filePath: z.string(),
  state: IndexingState,
  chunksCreated: z.number().int().nonnegative(),
  error: z.string().nullable(),
});
export type FileProcessingResult = z.infer<typeof FileProcessingResult>;

export const SmartReindexResult = z.object({
  commit: z.string(),
  diff: DiffResult,
  processed: z.array(FileProcessingResult),
  overallState: IndexingState,
});
export type SmartReindexResult = z.infer<typeof SmartReindexResult>;

// ---------------------------------------------------------------------------
// Smart Differ
// ---------------------------------------------------------------------------

export class SmartDiffer {
  constructor(
    private readonly repo: IndexerRepository,
    private readonly github: GitHubClient,
    private readonly parser: CodeParser,
    private readonly embedder: EmbeddingClient,
  ) {}

  /**
   * Compute the diff between the current repository state and our indexed state.
   * Returns lists of files to add, update, and delete.
   */
  async computeDiff(
    connectionId: string,
    owner: string,
    repoName: string,
    ref: string,
  ): Promise<DiffResult> {
    const repoFiles = await this.github.listFiles(owner, repoName, ref);
    const indexedFiles = await this.repo.getIndexedFiles(connectionId);
    const indexedMap = new Map(indexedFiles.map((f) => [f.filePath, f]));
    const repoFilePaths = new Set(repoFiles.map((f) => f.path));

    const toAdd: DiffResult['toAdd'] = [];
    const toUpdate: DiffResult['toUpdate'] = [];
    const toDelete: DiffResult['toDelete'] = [];
    let unchanged = 0;

    for (const repoFile of repoFiles) {
      if (shouldSkipFile(repoFile.path)) continue;

      const existing = indexedMap.get(repoFile.path);
      if (!existing) {
        toAdd.push({ path: repoFile.path, sha: repoFile.sha });
      } else if (existing.fileHash !== repoFile.sha) {
        toUpdate.push({ path: repoFile.path, sha: repoFile.sha, existingFileId: existing.id });
      } else {
        unchanged++;
      }
    }

    for (const indexed of indexedFiles) {
      if (!repoFilePaths.has(indexed.filePath)) {
        toDelete.push({ id: indexed.id, filePath: indexed.filePath });
      }
    }

    return { toAdd, toUpdate, toDelete, unchanged };
  }

  /**
   * Execute a smart reindex: compute diff, process only changed files,
   * delete removed files, and track state throughout.
   */
  async reindex(
    connectionId: string,
    owner: string,
    repoName: string,
    branch: string,
    onProgress?: (processed: number, total: number) => void,
  ): Promise<SmartReindexResult> {
    await this.repo.updateConnectionStatus(connectionId, 'indexing');

    try {
      const latestCommit = await this.github.getLatestCommit(owner, repoName, branch);
      const diff = await this.computeDiff(connectionId, owner, repoName, latestCommit);

      // Delete removed files
      for (const file of diff.toDelete) {
        await this.repo.deleteChunksForFile(file.id);
        await this.repo.deleteIndexedFile(file.id);
      }

      // Process added and updated files
      const filesToProcess = [
        ...diff.toAdd.map((f) => ({ ...f, existingFileId: undefined as string | undefined })),
        ...diff.toUpdate,
      ];
      const processed: FileProcessingResult[] = [];
      const batchSize = 10;

      for (let i = 0; i < filesToProcess.length; i += batchSize) {
        const batch = filesToProcess.slice(i, i + batchSize);

        for (const file of batch) {
          const result = await this.processFile(
            connectionId,
            owner,
            repoName,
            latestCommit,
            file.path,
            file.existingFileId,
          );
          processed.push(result);
        }

        onProgress?.(Math.min(i + batchSize, filesToProcess.length), filesToProcess.length);
      }

      const hasFailures = processed.some((r) => r.state === 'FAILED');
      const overallState: IndexingState = hasFailures ? 'FAILED' : 'COMPLETE';

      await this.repo.updateConnectionStatus(
        connectionId,
        overallState === 'COMPLETE' ? 'completed' : 'failed',
        { lastIndexedCommit: latestCommit },
      );

      return { commit: latestCommit, diff, processed, overallState };
    } catch (error) {
      await this.repo.updateConnectionStatus(connectionId, 'failed');
      throw error;
    }
  }

  /**
   * Process a single file: parse, embed, and store chunks.
   * Returns FAILED state on error but does not throw (continues with other files).
   */
  private async processFile(
    connectionId: string,
    owner: string,
    repoName: string,
    ref: string,
    filePath: string,
    existingFileId?: string,
  ): Promise<FileProcessingResult> {
    try {
      const language = this.parser.detectLanguage(filePath);
      if (!language) {
        return { filePath, state: 'COMPLETE', chunksCreated: 0, error: null };
      }

      const content = await this.github.getFileContent(owner, repoName, filePath, ref);
      const contentHash = hashContent(content);
      const chunks = this.parser.parse(content, language);

      if (chunks.length === 0) {
        return { filePath, state: 'COMPLETE', chunksCreated: 0, error: null };
      }

      const chunkTexts = chunks.map((c) => formatChunkForEmbedding(c, filePath));
      const embeddings = await this.embedder.embed(chunkTexts);

      const chunksWithEmbeddings: CodeChunkWithEmbedding[] = chunks.map((chunk, idx) => ({
        ...chunk,
        embedding: embeddings[idx],
      }));

      if (existingFileId) {
        await this.repo.deleteChunksForFile(existingFileId);
      }

      const indexedFile = await this.repo.upsertIndexedFile({
        connectionId,
        filePath,
        language,
        fileHash: contentHash,
      });

      await this.repo.insertChunks(indexedFile.id, chunksWithEmbeddings);

      return { filePath, state: 'COMPLETE', chunksCreated: chunksWithEmbeddings.length, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { filePath, state: 'FAILED', chunksCreated: 0, error: message };
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
