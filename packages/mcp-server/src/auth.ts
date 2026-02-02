// SPDX-License-Identifier: AGPL-3.0-only

export interface AuthContext {
  userId: string;
  projectId: string;
  scopes: string[];
}

export interface AuthError {
  code: "UNAUTHORIZED" | "FORBIDDEN";
  message: string;
}

export async function validateApiKey(apiKey: string): Promise<AuthContext | AuthError> {
  if (!apiKey || !apiKey.startsWith("of-key-")) {
    return { code: "UNAUTHORIZED", message: "Invalid API key format" };
  }
  // TODO: Replace with database lookup (Backend team)
  return { code: "UNAUTHORIZED", message: "API key validation not yet implemented" };
}

export function hasScope(ctx: AuthContext, scope: string): boolean {
  return ctx.scopes.includes(scope);
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}
