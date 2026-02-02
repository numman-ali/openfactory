/**
 * OpenFactory - Knowledge Graph BullMQ Jobs
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Drift detection and change propagation jobs.
 * Runs as background workers triggered by webhooks, entity updates, and schedules.
 */

import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq';
import type { GraphService } from './index.js';
import type { GraphEntityType } from '@repo/shared/types/graph';

// ---------------------------------------------------------------------------
// Job Types
// ---------------------------------------------------------------------------

export interface DriftDetectionJobData {
  type: 'full_scan';
  projectId: string;
}

export interface ChangePropagationJobData {
  type: 'propagate_change';
  projectId: string;
  entityType: GraphEntityType;
  entityId: string;
  newContent: string;
}

export interface CodeDriftCheckJobData {
  type: 'code_drift_check';
  projectId: string;
  connectionId: string;
  changedFiles: Array<{ path: string; content: string }>;
}

export type GraphJobData =
  | DriftDetectionJobData
  | ChangePropagationJobData
  | CodeDriftCheckJobData;

export interface GraphJobResult {
  alertsCreated: number;
  nodesAffected: number;
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

const QUEUE_NAME = 'graph:drift';

export function createGraphQueue(connection: ConnectionOptions): Queue<GraphJobData, GraphJobResult> {
  return new Queue<GraphJobData, GraphJobResult>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    },
  });
}

// ---------------------------------------------------------------------------
// Job Schedulers
// ---------------------------------------------------------------------------

/**
 * Schedule a full drift detection scan for a project.
 * Called on a cron or after significant changes.
 */
export async function scheduleDriftScan(
  queue: Queue<GraphJobData, GraphJobResult>,
  projectId: string
): Promise<void> {
  await queue.add(
    'drift:full-scan',
    { type: 'full_scan', projectId },
    { jobId: `drift-scan:${projectId}`, deduplication: { id: `drift-scan:${projectId}` } }
  );
}

/**
 * Schedule change propagation when an entity is updated.
 * Called by service layer after any entity mutation (document save, work order update, etc.).
 */
export async function scheduleChangePropagation(
  queue: Queue<GraphJobData, GraphJobResult>,
  projectId: string,
  entityType: GraphEntityType,
  entityId: string,
  newContent: string
): Promise<void> {
  await queue.add(
    'drift:propagate',
    { type: 'propagate_change', projectId, entityType, entityId, newContent }
  );
}

/**
 * Schedule code drift check after a reindex completes.
 * Compares changed code files against blueprint nodes to detect implementation drift.
 */
export async function scheduleCodeDriftCheck(
  queue: Queue<GraphJobData, GraphJobResult>,
  projectId: string,
  connectionId: string,
  changedFiles: Array<{ path: string; content: string }>
): Promise<void> {
  if (changedFiles.length === 0) return;
  await queue.add(
    'drift:code-check',
    { type: 'code_drift_check', projectId, connectionId, changedFiles }
  );
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export interface GraphWorkerDeps {
  graphService: GraphService;
  /** Resolves a codebase file path to its graph node's entityId, or null if not tracked. */
  resolveFileEntityId(connectionId: string, filePath: string): Promise<string | null>;
  /** Read the current content of an entity for hash comparison. */
  getEntityContent(entityType: GraphEntityType, entityId: string): Promise<string | null>;
}

export function createGraphWorker(
  connection: ConnectionOptions,
  deps: GraphWorkerDeps
): Worker<GraphJobData, GraphJobResult> {
  return new Worker<GraphJobData, GraphJobResult>(
    QUEUE_NAME,
    async (job: Job<GraphJobData, GraphJobResult>) => {
      switch (job.data.type) {
        case 'full_scan':
          return handleFullScan(job.data, deps);
        case 'propagate_change':
          return handlePropagateChange(job.data, deps);
        case 'code_drift_check':
          return handleCodeDriftCheck(job.data, deps);
      }
    },
    {
      connection,
      concurrency: 5,
      limiter: { max: 20, duration: 60_000 },
    }
  );
}

// ---------------------------------------------------------------------------
// Job Handlers
// ---------------------------------------------------------------------------

async function handleFullScan(
  data: DriftDetectionJobData,
  deps: GraphWorkerDeps
): Promise<GraphJobResult> {
  const alerts = await deps.graphService.detectDrift(data.projectId);
  return { alertsCreated: alerts.length, nodesAffected: 0 };
}

async function handlePropagateChange(
  data: ChangePropagationJobData,
  deps: GraphWorkerDeps
): Promise<GraphJobResult> {
  const event = await deps.graphService.propagateChange(
    data.projectId,
    data.entityType,
    data.entityId,
    data.newContent
  );
  return {
    alertsCreated: event.alerts.length,
    nodesAffected: event.affectedNodes.length,
  };
}

async function handleCodeDriftCheck(
  data: CodeDriftCheckJobData,
  deps: GraphWorkerDeps
): Promise<GraphJobResult> {
  let alertsCreated = 0;
  let nodesAffected = 0;

  for (const file of data.changedFiles) {
    const entityId = await deps.resolveFileEntityId(data.connectionId, file.path);
    if (!entityId) continue;

    const event = await deps.graphService.propagateChange(
      data.projectId,
      'codebase_file',
      entityId,
      file.content
    );

    alertsCreated += event.alerts.length;
    nodesAffected += event.affectedNodes.length;
  }

  return { alertsCreated, nodesAffected };
}
