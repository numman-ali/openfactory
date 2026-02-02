// SPDX-License-Identifier: AGPL-3.0-only

/**
 * GitHub App integration for OpenFactory.
 *
 * Provides read-only access to repositories for codebase indexing,
 * webhook handling for push-triggered reindexing, and OAuth flow
 * for GitHub App installation.
 */

import type { FastifyInstance } from "fastify";

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  webhookSecret: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Load GitHub App configuration from environment variables.
 * Returns null if the required variables are not set (GitHub integration is optional).
 */
export function loadGitHubAppConfig(): GitHubAppConfig | null {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!appId || !privateKey || !webhookSecret) {
    return null;
  }

  return {
    appId,
    privateKey: Buffer.from(privateKey, "base64").toString("utf-8"),
    webhookSecret,
    clientId: clientId ?? "",
    clientSecret: clientSecret ?? "",
  };
}

/**
 * Register GitHub App routes on the Fastify instance.
 *
 * Routes:
 *   GET  /api/integrations/github/install    - Redirect to GitHub App install
 *   GET  /api/integrations/github/callback   - OAuth callback after installation
 *   POST /api/integrations/github/webhooks   - Webhook receiver for push events
 */
export async function registerGitHubRoutes(
  app: FastifyInstance,
  _config: GitHubAppConfig,
): Promise<void> {
  // Installation redirect
  app.get("/api/integrations/github/install", async (_request, reply) => {
    // TODO: Build GitHub App installation URL with state parameter
    // Redirect to: https://github.com/apps/{app-name}/installations/new
    reply.code(501).send({ error: "Not implemented" });
  });

  // OAuth callback after installation
  app.get("/api/integrations/github/callback", async (request, reply) => {
    // TODO: Handle installation callback
    // 1. Verify state parameter
    // 2. Exchange code for access token
    // 3. Store installation_id in codebase_connections
    // 4. Redirect back to project settings
    void request;
    reply.code(501).send({ error: "Not implemented" });
  });
}
