// SPDX-License-Identifier: AGPL-3.0-only

/**
 * GitHub App configuration and installation token management.
 *
 * Loads app credentials from environment variables, generates JWTs
 * for app-level authentication, and manages per-installation access
 * tokens with caching and automatic refresh.
 */

import { createPrivateKey, sign } from "crypto";
import type {
  GitHubAppConfig,
  InstallationToken,
  GitHubInstallationTokenResponse,
} from "./types.js";

const GITHUB_API_BASE = "https://api.github.com";

/** Buffer (in ms) before token expiry to trigger refresh. */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

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
 * Generate a JSON Web Token (JWT) for GitHub App authentication.
 *
 * GitHub requires app-level requests to be signed with a JWT
 * containing the app ID, issued using the app's private key (RS256).
 */
export function generateAppJwt(config: GitHubAppConfig): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60,
      exp: now + 10 * 60,
      iss: config.appId,
    }),
  ).toString("base64url");

  const key = createPrivateKey(config.privateKey);
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), key).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

/** In-memory cache of installation tokens keyed by installation ID. */
const tokenCache = new Map<number, InstallationToken>();

/**
 * Get a valid installation access token, using the cache when possible.
 *
 * If the cached token is still valid (with a 5-minute buffer), it is
 * returned immediately. Otherwise a new token is requested from the
 * GitHub API and cached.
 */
export async function getInstallationToken(
  config: GitHubAppConfig,
  installationId: number,
): Promise<string> {
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAt.getTime() - Date.now() > TOKEN_REFRESH_BUFFER_MS) {
    return cached.token;
  }

  const jwt = generateAppJwt(config);
  const response = await fetch(
    `${GITHUB_API_BASE}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create installation token (${response.status}): ${body}`);
  }

  const data = (await response.json()) as GitHubInstallationTokenResponse;
  const token: InstallationToken = {
    token: data.token,
    expiresAt: new Date(data.expires_at),
    installationId,
  };

  tokenCache.set(installationId, token);
  return token.token;
}

/** Remove a cached installation token (e.g. on uninstall). */
export function clearInstallationToken(installationId: number): void {
  tokenCache.delete(installationId);
}
