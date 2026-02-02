/**
 * OpenFactory - GitHub Webhook Handler for Indexing
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Processes GitHub push webhook events to trigger smart reindexing
 * and code drift detection.
 */

import type { Queue } from 'bullmq';
import type { IndexJobData } from './jobs.js';
import type { IndexResult } from './index.js';

// ---------------------------------------------------------------------------
// Webhook Payload Types (subset of GitHub push event)
// ---------------------------------------------------------------------------

export interface GitHubPushPayload {
  ref: string;
  after: string;
  repository: {
    full_name: string;
    default_branch: string;
  };
  commits: Array<{
    id: string;
    added: string[];
    removed: string[];
    modified: string[];
  }>;
  installation?: { id: number };
}

export interface WebhookContext {
  /** Resolve a GitHub repo full_name to a codebase connection */
  resolveConnection(repoFullName: string): Promise<{
    connectionId: string;
    projectId: string;
    branch: string;
  } | null>;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Handle a GitHub push webhook event.
 * Extracts changed files and schedules a smart reindex job.
 *
 * Returns true if a job was scheduled, false if the push was ignored
 * (e.g., untracked repo, non-default branch).
 */
export async function handlePushWebhook(
  payload: GitHubPushPayload,
  queue: Queue<IndexJobData, IndexResult>,
  ctx: WebhookContext
): Promise<boolean> {
  const repoFullName = payload.repository.full_name;
  const connection = await ctx.resolveConnection(repoFullName);
  if (!connection) return false;

  // Only reindex pushes to the tracked branch
  const pushedBranch = payload.ref.replace('refs/heads/', '');
  if (pushedBranch !== connection.branch) return false;

  // Collect all changed files from all commits in the push
  const changedFiles = new Set<string>();
  for (const commit of payload.commits) {
    for (const file of [...commit.added, ...commit.modified]) {
      changedFiles.add(file);
    }
  }

  const [owner, repo] = repoFullName.split('/');
  const { scheduleSmartReindex } = await import('./jobs.js');

  await scheduleSmartReindex(queue, {
    connectionId: connection.connectionId,
    projectId: connection.projectId,
    owner,
    repo,
    branch: connection.branch,
    changedFiles: [...changedFiles],
  });

  return true;
}
