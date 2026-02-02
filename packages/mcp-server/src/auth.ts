// SPDX-License-Identifier: AGPL-3.0-only

/**
 * MCP server authentication.
 *
 * API keys are project-scoped and carry scopes like `mcp:read` and `mcp:write`.
 * The key is passed via the Authorization header in the Streamable HTTP transport.
 *
 * In production, key validation delegates to the API server. This module defines
 * the interface and a stub implementation that other teams will replace with the
 * real database-backed validator.
 */

export interface AuthContext {
  userId: string;
  projectId: string;
  scopes: string[];
}

export interface AuthError {
  code: "UNAUTHORIZED" | "FORBIDDEN";
  message: string;
}

/**
 * Validate an API key and return the associated auth context.
 *
 * The key format is `of-key-xxxxxxxxxxxxx`. The first 8 characters (`of-key-x`)
 * are used as a prefix to look up the key in the database. The full key is then
 * verified against the stored bcrypt hash.
 *
 * This is a placeholder that the Backend team will replace with a real
 * implementation that queries the `api_keys` table.
 */
export async function validateApiKey(
  apiKey: string,
): Promise<AuthContext | AuthError> {
  if (!apiKey || !apiKey.startsWith("of-key-")) {
    return { code: "UNAUTHORIZED", message: "Invalid API key format" };
  }

  // TODO: Replace with database lookup (Backend team)
  // 1. Extract prefix from key (first 8 chars after "of-key-")
  // 2. Look up api_keys row by key_prefix WHERE revoked_at IS NULL
  // 3. Verify full key against key_hash using bcrypt
  // 4. Check expiration (expires_at)
  // 5. Return AuthContext with userId, projectId, scopes
  // 6. Update last_used_at

  return {
    code: "UNAUTHORIZED",
    message: "API key validation not yet implemented",
  };
}

/**
 * Check if an auth context has the required scope.
 */
export function hasScope(ctx: AuthContext, scope: string): boolean {
  return ctx.scopes.includes(scope);
}

/**
 * Extract the Bearer token from an Authorization header value.
 */
export function extractBearerToken(
  authHeader: string | undefined,
): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}
