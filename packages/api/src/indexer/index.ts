/**
 * OpenFactory - Codebase Indexing Pipeline
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Indexes a GitHub repository for semantic code search.
 * Designed to run as BullMQ background jobs.
 */

import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CodeChunk {
  fileId: string;
  filePath: string;
  chunkType: 'function' | 'class' | 'method' | 'import' | 'block';
  name: string | null;
  startLine: number;
  endLine: number;
  content: string;
}

export interface CodeChunkWithEmbedding extends CodeChunk {
  embedding: number[];
}

export interface IndexedFile {
  id: string;
  connectionId: string;
  filePath: string;
  language: string | null;
  fileHash: string;
}

export interface SearchResult {
  chunk: CodeChunk;
  score: number;
  filePath: string;
}

export interface IndexResult {
  success: boolean;
  commit: string;
  filesAdded: number;
  filesUpdated: number;
  filesDeleted: number;
  filesProcessed: number;
  totalFiles: number;
}

// ---------------------------------------------------------------------------
// Repository Interfaces
// ---------------------------------------------------------------------------

export interface IndexerRepository {
  getIndexedFiles(connectionId: string): Promise<IndexedFile[]>;
  upsertIndexedFile(file: Omit<IndexedFile, 'id'>): Promise<IndexedFile>;
  deleteIndexedFile(fileId: string): Promise<void>;
  deleteChunksForFile(fileId: string): Promise<void>;
  insertChunks(fileId: string, chunks: CodeChunkWithEmbedding[]): Promise<void>;
  searchByEmbedding(connectionId: string, embedding: number[], limit: number, language?: string): Promise<SearchResult[]>;
  updateConnectionStatus(connectionId: string, status: 'pending' | 'indexing' | 'completed' | 'failed', metadata?: { lastIndexedCommit?: string; fileCount?: number }): Promise<void>;
}

export interface GitHubClient {
  listFiles(owner: string, repo: string, ref: string): Promise<{ path: string; sha: string }[]>;
  getFileContent(owner: string, repo: string, path: string, ref: string): Promise<string>;
  getLatestCommit(owner: string, repo: string, branch: string): Promise<string>;
}

export interface CodeParser {
  parse(content: string, language: string): CodeChunk[];
  detectLanguage(filePath: string): string | null;
}

export interface EmbeddingClient {
  embed(texts: string[]): Promise<number[][]>;
}

// ---------------------------------------------------------------------------
// Indexing Pipeline
// ---------------------------------------------------------------------------

export class IndexingPipeline {
  constructor(
    private readonly repo: IndexerRepository,
    private readonly github: GitHubClient,
    private readonly parser: CodeParser,
    private readonly embedder: EmbeddingClient
  ) {}

  async index(connectionId: string, owner: string, repoName: string, branch: string): Promise<IndexResult> {
    await this.repo.updateConnectionStatus(connectionId, 'indexing');

    try {
      const latestCommit = await this.github.getLatestCommit(owner, repoName, branch);
      const repoFiles = await this.github.listFiles(owner, repoName, latestCommit);
      const indexedFiles = await this.repo.getIndexedFiles(connectionId);
      const indexedMap = new Map(indexedFiles.map((f) => [f.filePath, f]));

      const toAdd: { path: string; sha: string }[] = [];
      const toUpdate: { path: string; sha: string; existingFileId: string }[] = [];
      const repoFilePaths = new Set(repoFiles.map((f) => f.path));
      const toDelete: IndexedFile[] = [];

      for (const repoFile of repoFiles) {
        if (shouldSkipFile(repoFile.path)) continue;
        const existing = indexedMap.get(repoFile.path);
        if (!existing) {
          toAdd.push(repoFile);
        } else if (existing.fileHash !== repoFile.sha) {
          toUpdate.push({ ...repoFile, existingFileId: existing.id });
        }
      }

      for (const indexed of indexedFiles) {
        if (!repoFilePaths.has(indexed.filePath)) toDelete.push(indexed);
      }

      for (const file of toDelete) {
        await this.repo.deleteChunksForFile(file.id);
        await this.repo.deleteIndexedFile(file.id);
      }

      let processedCount = 0;
      const filesToProcess = [
        ...toAdd.map((f) => ({ ...f, existingFileId: undefined as string | undefined })),
        ...toUpdate,
      ];

      const batchSize = 10;
      for (let i = 0; i < filesToProcess.length; i += batchSize) {
        const batch = filesToProcess.slice(i, i + batchSize);

        for (const file of batch) {
          const language = this.parser.detectLanguage(file.path);
          if (!language) continue;

          const content = await this.github.getFileContent(owner, repoName, file.path, latestCommit);
          const contentHash = hashContent(content);
          const chunks = this.parser.parse(content, language);
          if (chunks.length === 0) continue;

          const chunkTexts = chunks.map((c) => formatChunkForEmbedding(c, file.path));
          const embeddings = await this.embedder.embed(chunkTexts);
          const chunksWithEmbeddings: CodeChunkWithEmbedding[] = chunks.map((chunk, idx) => ({
            ...chunk,
            embedding: embeddings[idx],
          }));

          if (file.existingFileId) {
            await this.repo.deleteChunksForFile(file.existingFileId);
          }

          const indexedFile = await this.repo.upsertIndexedFile({
            connectionId,
            filePath: file.path,
            language,
            fileHash: contentHash,
          });

          await this.repo.insertChunks(indexedFile.id, chunksWithEmbeddings);
          processedCount++;
        }
      }

      await this.repo.updateConnectionStatus(connectionId, 'completed', {
        lastIndexedCommit: latestCommit,
        fileCount: repoFiles.length,
      });

      return {
        success: true,
        commit: latestCommit,
        filesAdded: toAdd.length,
        filesUpdated: toUpdate.length,
        filesDeleted: toDelete.length,
        filesProcessed: processedCount,
        totalFiles: repoFiles.length,
      };
    } catch (error) {
      await this.repo.updateConnectionStatus(connectionId, 'failed');
      throw error;
    }
  }

  async search(connectionId: string, query: string, limit: number = 5, language?: string): Promise<SearchResult[]> {
    const [queryEmbedding] = await this.embedder.embed([query]);
    return this.repo.searchByEmbedding(connectionId, queryEmbedding, limit, language);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function formatChunkForEmbedding(chunk: CodeChunk, filePath: string): string {
  const header = [
    `File: ${filePath}`,
    chunk.name ? `${chunk.chunkType}: ${chunk.name}` : `${chunk.chunkType}`,
    `Lines: ${chunk.startLine}-${chunk.endLine}`,
  ].join(' | ');
  return `${header}\n\n${chunk.content}`;
}

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'tsx', '.js': 'javascript', '.jsx': 'javascript',
  '.py': 'python', '.rs': 'rust', '.go': 'go', '.java': 'java',
  '.rb': 'ruby', '.php': 'php', '.c': 'c', '.cpp': 'cpp',
  '.h': 'c', '.hpp': 'cpp', '.cs': 'c_sharp', '.swift': 'swift',
  '.kt': 'kotlin', '.scala': 'scala', '.sql': 'sql',
  '.sh': 'bash', '.bash': 'bash', '.css': 'css', '.scss': 'css',
  '.html': 'html', '.vue': 'vue', '.svelte': 'svelte',
};

export function detectLanguageFromPath(filePath: string): string | null {
  const ext = filePath.substring(filePath.lastIndexOf('.'));
  return LANGUAGE_MAP[ext] ?? null;
}

const SKIP_PATTERNS = [
  /node_modules\//, /\.git\//, /dist\//, /build\//, /\.next\//,
  /coverage\//, /\.env/, /package-lock\.json$/, /pnpm-lock\.yaml$/, /yarn\.lock$/,
];

export function shouldSkipFile(filePath: string): boolean {
  return SKIP_PATTERNS.some((pattern) => pattern.test(filePath));
}
