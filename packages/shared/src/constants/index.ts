// SPDX-License-Identifier: AGPL-3.0-only
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
export const API_KEY_PREFIX = "of-key-";
export const PAGINATION_DEFAULTS = { DEFAULT_LIMIT: 50, MAX_LIMIT: 200 } as const;
export const WORK_ORDER_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  backlog: ["ready"], ready: ["backlog", "in_progress"], in_progress: ["ready", "in_review"], in_review: ["in_progress", "done"], done: ["in_review"],
} as const;
