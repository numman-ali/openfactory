/**
 * OpenFactory - Codebase Indexing BullMQ Jobs
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Background jobs for initial indexing, reindexing (webhook-triggered),
 * and smart reindex (only changed files).
 */

import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq';
import { IndexingPipeline, type IndexResult } from './index.js';
import { SmartDiffer } from './differ.js';
import type { GraphJobData, GraphJobResult } from '../graph/jobs.js';

// ---------------------------------------------------------------------------
// Job Types
// ---------------------------------------------------------------------------

export interface InitialIndexJobData {
  type: 'initial_index';
  connectionId: string;
  projectId: string;
  owner: string;
  repo: string;
  branch: string;
}

export interface ReindexJobData {
  type: 'reindex';
  connectionId: string;
  projectId: string;
  owner: string;
  repo: string;
  branch: string;
  /** Commit SHA that triggered the webhook */
  triggerCommit: string;
}

export interface SmartReindexJobData {
  type: 'smart_reindex';
  connectionId: string;
  projectId: string;
  owner: string;
  repo: string;
  branch: string;
  /** Files changed in the push event */
  changedFiles: string[];
}

export type IndexJobData =
  | InitialIndexJobData
  | ReindexJobData
  | SmartReindexJobData;

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

const QUEUE_NAME = 'indexer:pipeline';

export function createIndexerQueue(connection: ConnectionOptions): Queue<IndexJobData, IndexResult> {
  return new Queue<IndexJobData, IndexResult>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 100 },
    },
  });
}

// ---------------------------------------------------------------------------
// Job Schedulers
// ---------------------------------------------------------------------------

/**
 * Queue the first-time index for a newly connected repository.
 */
export async function scheduleInitialIndex(
  queue: Queue<IndexJobData, IndexResult>,
  data: Omit<InitialIndexJobData, 'type'>
): Promise<void> {
  await queue.add(
    'index:initial',
    { type: 'initial_index', ...data },
    { jobId: `initial-index:${data.connectionId}` }
  );
}

/**
 * Queue a full reindex triggered by a push webhook.
 */
export async function scheduleReindex(
  queue: Queue<IndexJobData, IndexResult>,
  data: Omit<ReindexJobData, 'type'>
): Promise<void> {
  await queue.add(
    'index:reindex',
    { type: 'reindex', ...data },
    { jobId: `reindex:${data.connectionId}:${data.triggerCommit}` }
  );
}

/**
 * Queue a smart reindex that only processes changed files.
 * Triggered by push webhook with a file changeset.
 */
export async function scheduleSmartReindex(
  queue: Queue<IndexJobData, IndexResult>,
  data: Omit<SmartReindexJobData, 'type'>
): Promise<void> {
  await queue.add(
    'index:smart-reindex',
    { type: 'smart_reindex', ...data }
  );
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export interface IndexWorkerDeps {
  pipeline: IndexingPipeline;
  /** Optional SmartDiffer for incremental reindexing */
  smartDiffer?: SmartDiffer;
  /** Graph job queue for scheduling drift checks after reindex */
  graphQueue: Queue<GraphJobData, GraphJobResult>;
  /** Read file content by path from a connection for drift checking */
  getFileContent(connectionId: string, owner: string, repo: string, path: string, ref: string): Promise<string>;
}

export function createIndexerWorker(
  connection: ConnectionOptions,
  deps: IndexWorkerDeps
): Worker<IndexJobData, IndexResult> {
  return new Worker<IndexJobData, IndexResult>(
    QUEUE_NAME,
    async (job: Job<IndexJobData, IndexResult>) => {
      switch (job.data.type) {
        case 'initial_index':
          return handleInitialIndex(job as Job<InitialIndexJobData, IndexResult>, deps);
        case 'reindex':
          return handleReindex(job as Job<ReindexJobData, IndexResult>, deps);
        case 'smart_reindex':
          return handleSmartReindex(job as Job<SmartReindexJobData, IndexResult>, deps);
      }
    },
    {
      connection,
      concurrency: 3,
      limiter: { max: 5, duration: 60_000 },
    }
  );
}

// ---------------------------------------------------------------------------
// Job Handlers
// ---------------------------------------------------------------------------

async function handleInitialIndex(
  job: Job<InitialIndexJobData, IndexResult>,
  deps: IndexWorkerDeps
): Promise<IndexResult> {
  const { connectionId, owner, repo, branch } = job.data;
  await job.updateProgress(10);

  const result = await deps.pipeline.index(connectionId, owner, repo, branch);
  await job.updateProgress(100);
  return result;
}

async function handleReindex(
  job: Job<ReindexJobData, IndexResult>,
  deps: IndexWorkerDeps
): Promise<IndexResult> {
  const { connectionId, projectId, owner, repo, branch } = job.data;
  await job.updateProgress(10);

  const result = await deps.pipeline.index(connectionId, owner, repo, branch);
  await job.updateProgress(80);

  // After reindex, schedule code drift check for updated files
  if (result.filesUpdated > 0) {
    const { scheduleCodeDriftCheck } = await import('../graph/jobs.js');
    // We don't have the changed file contents at this point — the drift check
    // will re-read them from the graph node hashes. Schedule a full scan instead.
    await scheduleCodeDriftCheck(deps.graphQueue, projectId, connectionId, []);
  }

  await job.updateProgress(100);
  return result;
}

async function handleSmartReindex(
  job: Job<SmartReindexJobData, IndexResult>,
  deps: IndexWorkerDeps
): Promise<IndexResult> {
  const { connectionId, projectId, owner, repo, branch, changedFiles } = job.data;
  await job.updateProgress(10);

  // Use SmartDiffer if available for incremental reindexing, otherwise fall back to full pipeline
  let result: IndexResult;
  if (deps.smartDiffer) {
    const smartResult = await deps.smartDiffer.reindex(
      connectionId, owner, repo, branch,
      (processed, total) => {
        const progress = 10 + Math.round((processed / Math.max(total, 1)) * 70);
        void job.updateProgress(progress);
      },
    );
    result = {
      success: smartResult.overallState === 'COMPLETE',
      commit: smartResult.commit,
      filesAdded: smartResult.diff.toAdd.length,
      filesUpdated: smartResult.diff.toUpdate.length,
      filesDeleted: smartResult.diff.toDelete.length,
      filesProcessed: smartResult.processed.filter((p) => p.state === 'COMPLETE').length,
      totalFiles: smartResult.diff.toAdd.length + smartResult.diff.toUpdate.length + smartResult.diff.unchanged,
    };
  } else {
    result = await deps.pipeline.index(connectionId, owner, repo, branch);
  }
  await job.updateProgress(80);

  // Schedule drift check with the actually changed files
  if (changedFiles.length > 0 && result.filesUpdated > 0) {
    const fileContents: Array<{ path: string; content: string }> = [];

    for (const filePath of changedFiles) {
      try {
        const content = await deps.getFileContent(connectionId, owner, repo, filePath, branch);
        fileContents.push({ path: filePath, content });
      } catch {
        // File may have been deleted in this push — skip
      }
    }

    if (fileContents.length > 0) {
      const { scheduleCodeDriftCheck } = await import('../graph/jobs.js');
      await scheduleCodeDriftCheck(deps.graphQueue, projectId, connectionId, fileContents);
    }
  }

  await job.updateProgress(100);
  return result;
}
