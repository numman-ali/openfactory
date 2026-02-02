// SPDX-License-Identifier: AGPL-3.0-only

/**
 * GitHub integration barrel export.
 */

export { loadGitHubAppConfig, getInstallationToken, clearInstallationToken } from "./app.js";
export { registerOAuthRoutes, verifyRepositoryAccess } from "./oauth.js";
export { RepositoryClient, GitHubApiError } from "./repository.js";
export { registerWebhookRoute, verifyWebhookSignature } from "./webhooks.js";
export { createIssueFromFeedback } from "./issue-creator.js";
export type * from "./types.js";
