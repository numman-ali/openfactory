// SPDX-License-Identifier: AGPL-3.0-only
import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { eq, and } from "drizzle-orm";
import { sessions, users, organizationMembers, apiKeys } from "../db/schema/users";
import { AppError } from "./error-handler";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AuthSession {
  userId: string;
  organizationId: string | null;
  role: string | null;
}

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser;
    session: AuthSession;
  }
}

async function resolveSession(request: FastifyRequest): Promise<{ user: AuthUser; session: AuthSession } | null> {
  const db = request.server.db;
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  // Check if it's an API key
  if (token.startsWith("of-key-")) {
    const prefix = token.slice(0, 15);
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyPrefix, prefix))
      .limit(1);
    if (!key || key.revokedAt) return null;
    // TODO: verify full key hash, check expiration, update lastUsedAt
    const [user] = await db.select().from(users).where(eq(users.id, key.userId)).limit(1);
    if (!user) return null;
    return {
      user: { id: user.id, email: user.email, name: user.name ?? "", avatarUrl: user.avatarUrl ?? null },
      session: { userId: user.id, organizationId: key.organizationId, role: null },
    };
  }

  // Session token lookup
  const [sess] = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
  if (!sess || (sess.expiresAt && new Date(sess.expiresAt) < new Date())) return null;

  const [user] = await db.select().from(users).where(eq(users.id, sess.userId)).limit(1);
  if (!user) return null;

  return {
    user: { id: user.id, email: user.email, name: user.name ?? "", avatarUrl: user.avatarUrl ?? null },
    session: { userId: user.id, organizationId: null, role: null },
  };
}

/** Prehandler hook that requires authentication */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  const result = await resolveSession(request);
  if (!result) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  request.user = result.user;
  request.session = result.session;
}

/** Prehandler hook that requires the user to be an admin of the given org */
export async function requireOrgAdmin(request: FastifyRequest, _reply: FastifyReply) {
  const orgId = (request.params as Record<string, string>).orgId;
  if (!orgId) throw new AppError(400, "BAD_REQUEST", "Organization ID required");

  const db = request.server.db;
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, request.user.id)))
    .limit(1);

  if (!member) throw new AppError(403, "FORBIDDEN", "Not a member of this organization");
  if (member.role !== "admin") throw new AppError(403, "FORBIDDEN", "Admin access required");
}

/** Prehandler hook that requires org membership */
export async function requireOrgMember(request: FastifyRequest, _reply: FastifyReply) {
  const orgId = (request.params as Record<string, string>).orgId;
  if (!orgId) throw new AppError(400, "BAD_REQUEST", "Organization ID required");

  const db = request.server.db;
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, request.user.id)))
    .limit(1);

  if (!member) throw new AppError(403, "FORBIDDEN", "Not a member of this organization");
  (request as FastifyRequest & { orgRole: string }).orgRole = member.role;
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest("user", undefined as unknown as AuthUser);
  fastify.decorateRequest("session", undefined as unknown as AuthSession);
};

export default fp(authPlugin, { name: "auth", dependencies: ["database"] });
