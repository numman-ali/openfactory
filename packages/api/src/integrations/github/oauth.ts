// SPDX-License-Identifier: AGPL-3.0-only

/**
 * OAuth flow for GitHub App installation.
 *
 * Handles redirecting users to install the GitHub App on their
 * organization/account, processing the callback, and verifying
 * that the app has access to the requested repository.
 */

import { randomBytes } from "crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { GitHubAppConfig, OAuthCallbackQuery } from "./types.js";
import { generateAppJwt } from "./app.js";

const GITHUB_API_BASE = "https://api.github.com";

/** In-memory state store for OAuth CSRF protection. TTL: 10 minutes. */
const stateStore = new Map<string, { projectId: string; createdAt: number }>();
const STATE_TTL_MS = 10 * 60 * 1000;

/** Clean up expired state entries. */
function pruneExpiredStates(): void {
  const now = Date.now();
  for (const [key, value] of stateStore) {
    if (now - value.createdAt > STATE_TTL_MS) {
      stateStore.delete(key);
    }
  }
}

/**
 * Register OAuth routes for GitHub App installation flow.
 *
 * Routes:
 *   GET /api/integrations/github/install    - Redirect to GitHub App installation
 *   GET /api/integrations/github/callback   - Handle post-installation callback
 */
export async function registerOAuthRoutes(
  app: FastifyInstance,
  config: GitHubAppConfig,
): Promise<void> {
  /**
   * Initiate GitHub App installation.
   *
   * Generates a CSRF state token, stores it with the project ID,
   * and redirects the user to GitHub to install the app.
   */
  app.get(
    "/api/integrations/github/install",
    async (request: FastifyRequest<{ Querystring: { project_id?: string } }>, reply: FastifyReply) => {
      const projectId = request.query.project_id;
      if (!projectId) {
        return reply.code(400).send({ error: "project_id query parameter is required" });
      }

      pruneExpiredStates();

      const state = randomBytes(32).toString("hex");
      stateStore.set(state, { projectId, createdAt: Date.now() });

      const installUrl = new URL(`https://github.com/apps/${config.appId}/installations/new`);
      installUrl.searchParams.set("state", state);

      return reply.redirect(installUrl.toString());
    },
  );

  /**
   * Handle the OAuth callback after GitHub App installation.
   *
   * GitHub redirects here with `installation_id`, `setup_action`, and `state`.
   * We verify the state, store the installation ID, and redirect the user
   * back to the project settings.
   */
  app.get(
    "/api/integrations/github/callback",
    async (request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>, reply: FastifyReply) => {
      const { installation_id, state, setup_action } = request.query;

      if (!state || !stateStore.has(state)) {
        return reply.code(400).send({ error: "Invalid or expired state parameter" });
      }

      const stateData = stateStore.get(state)!;
      stateStore.delete(state);

      if (Date.now() - stateData.createdAt > STATE_TTL_MS) {
        return reply.code(400).send({ error: "State parameter expired" });
      }

      if (!installation_id) {
        return reply.code(400).send({ error: "Missing installation_id from GitHub" });
      }

      const installationId = parseInt(installation_id, 10);
      if (Number.isNaN(installationId)) {
        return reply.code(400).send({ error: "Invalid installation_id" });
      }

      // TODO: Persist the installation mapping (Backend team)
      // Store { projectId: stateData.projectId, installationId, setupAction: setup_action }
      // in the codebase_connections table.

      const redirectUrl = `/projects/${stateData.projectId}/settings/codebase?installed=true`;
      return reply.redirect(redirectUrl);
    },
  );
}

/**
 * Verify that the GitHub App installation has access to a specific repository.
 *
 * Uses the app JWT to list accessible repositories for the installation
 * and checks if the target repository is among them.
 */
export async function verifyRepositoryAccess(
  config: GitHubAppConfig,
  installationId: number,
  owner: string,
  repo: string,
): Promise<boolean> {
  const jwt = generateAppJwt(config);

  const response = await fetch(
    `${GITHUB_API_BASE}/app/installations/${installationId}`,
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    return false;
  }

  // For installations scoped to specific repos, check the repos list.
  // For installations with org-wide access, we verify via the contents API.
  const repoCheckResponse = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/installation`,
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!repoCheckResponse.ok) {
    return false;
  }

  const data = (await repoCheckResponse.json()) as { id: number };
  return data.id === installationId;
}
