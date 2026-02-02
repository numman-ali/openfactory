// SPDX-License-Identifier: AGPL-3.0-only
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, count, inArray } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import { organizations } from "../db/schema/organizations.js";
import { users, organizationMembers, apiKeys } from "../db/schema/users.js";
import { projects } from "../db/schema/projects.js";
import { templates } from "../db/schema/templates.js";
import { requireAuth, requireOrgAdmin, requireOrgMember } from "../plugins/auth.js";
import { AppError } from "../plugins/error-handler.js";

const orgRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require auth
  fastify.addHook("preHandler", requireAuth);

  /** GET /api/organizations */
  fastify.get("/", async (request) => {
    const db = fastify.db;
    const memberships = await db
      .select({
        orgId: organizationMembers.organizationId,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, request.user.id));

    const orgIds = memberships.map((m) => m.orgId);
    if (orgIds.length === 0) return { organizations: [] };

    const orgs = await db.select().from(organizations).where(inArray(organizations.id, orgIds));

    const memberCounts = await db
      .select({ orgId: organizationMembers.organizationId, count: count() })
      .from(organizationMembers)
      .where(inArray(organizationMembers.organizationId, orgIds))
      .groupBy(organizationMembers.organizationId);

    const projectCounts = await db
      .select({ orgId: projects.organizationId, count: count() })
      .from(projects)
      .where(inArray(projects.organizationId, orgIds))
      .groupBy(projects.organizationId);

    const memberCountMap = new Map(memberCounts.map((r) => [r.orgId, r.count]));
    const projectCountMap = new Map(projectCounts.map((r) => [r.orgId, r.count]));
    const roleMap = new Map(memberships.map((m) => [m.orgId, m.role]));

    return {
      organizations: orgs.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logoUrl,
        role: roleMap.get(org.id) ?? "member",
        memberCount: memberCountMap.get(org.id) ?? 0,
        projectCount: projectCountMap.get(org.id) ?? 0,
      })),
    };
  });

  /** GET /api/organizations/:orgId */
  fastify.get<{ Params: { orgId: string } }>("/:orgId", { preHandler: [requireOrgMember] }, async (request) => {
    const db = fastify.db;
    const [org] = await db.select().from(organizations).where(eq(organizations.id, request.params.orgId)).limit(1);
    if (!org) throw new AppError(404, "NOT_FOUND", "Organization not found");
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      settings: org.settings,
      createdAt: org.createdAt.toISOString(),
    };
  });

  /** PATCH /api/organizations/:orgId */
  fastify.patch<{ Params: { orgId: string } }>("/:orgId", {
    preHandler: [requireOrgAdmin],
    schema: {
      body: z.object({
        name: z.string().min(1).optional(),
        logoUrl: z.string().url().nullable().optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
      }),
    },
  }, async (request) => {
    const db = fastify.db;
    const body = request.body as { name?: string; logoUrl?: string | null; settings?: Record<string, unknown> };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.logoUrl !== undefined) updates.logoUrl = body.logoUrl;
    if (body.settings !== undefined) updates.settings = body.settings;

    const [updated] = await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, request.params.orgId))
      .returning();
    if (!updated) throw new AppError(404, "NOT_FOUND", "Organization not found");

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      logoUrl: updated.logoUrl,
      settings: updated.settings,
      createdAt: updated.createdAt.toISOString(),
    };
  });

  /** GET /api/organizations/:orgId/members */
  fastify.get<{ Params: { orgId: string } }>("/:orgId/members", { preHandler: [requireOrgMember] }, async (request) => {
    const db = fastify.db;
    const members = await db
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        joinedAt: organizationMembers.createdAt,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatarUrl,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, request.params.orgId));

    return {
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        email: m.userEmail,
        name: m.userName,
        avatarUrl: m.userAvatar,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    };
  });

  /** POST /api/organizations/:orgId/members */
  fastify.post<{ Params: { orgId: string } }>("/:orgId/members", {
    preHandler: [requireOrgAdmin],
    schema: {
      body: z.object({
        email: z.string().email(),
        role: z.enum(["member", "admin"]),
      }),
    },
  }, async (request, reply) => {
    const db = fastify.db;
    const { email, role } = request.body as { email: string; role: string };
    const orgId = request.params.orgId;

    // Find or create user
    let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      [user] = await db.insert(users).values({ email, name: email.split("@")[0]!, emailVerified: false }).returning();
    }

    // Check if already a member
    const [existing] = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, user!.id)))
      .limit(1);
    if (existing) throw new AppError(409, "ALREADY_MEMBER", "User is already a member");

    const [member] = await db.insert(organizationMembers).values({
      organizationId: orgId,
      userId: user!.id,
      role,
    }).returning();

    return reply.status(201).send({
      id: member!.id,
      email,
      role: member!.role,
      invitedAt: member!.createdAt.toISOString(),
    });
  });

  /** PATCH /api/organizations/:orgId/members/:memberId */
  fastify.patch<{ Params: { orgId: string; memberId: string } }>("/:orgId/members/:memberId", {
    preHandler: [requireOrgAdmin],
    schema: {
      body: z.object({ role: z.enum(["member", "admin"]) }),
    },
  }, async (request) => {
    const db = fastify.db;
    const { role } = request.body as { role: string };
    const [updated] = await db
      .update(organizationMembers)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(organizationMembers.id, request.params.memberId), eq(organizationMembers.organizationId, request.params.orgId)))
      .returning();
    if (!updated) throw new AppError(404, "NOT_FOUND", "Member not found");

    const [user] = await db.select().from(users).where(eq(users.id, updated.userId)).limit(1);
    return {
      id: updated.id,
      userId: updated.userId,
      email: user?.email,
      name: user?.name,
      role: updated.role,
      joinedAt: updated.createdAt.toISOString(),
    };
  });

  /** DELETE /api/organizations/:orgId/members/:memberId */
  fastify.delete<{ Params: { orgId: string; memberId: string } }>("/:orgId/members/:memberId", {
    preHandler: [requireOrgAdmin],
  }, async (request, reply) => {
    const db = fastify.db;
    const [deleted] = await db
      .delete(organizationMembers)
      .where(and(eq(organizationMembers.id, request.params.memberId), eq(organizationMembers.organizationId, request.params.orgId)))
      .returning();
    if (!deleted) throw new AppError(404, "NOT_FOUND", "Member not found");
    return reply.status(204).send();
  });

  /** GET /api/organizations/:orgId/api-keys */
  fastify.get<{ Params: { orgId: string } }>("/:orgId/api-keys", { preHandler: [requireOrgMember] }, async (request) => {
    const db = fastify.db;
    const keys = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.organizationId, request.params.orgId));

    return {
      apiKeys: keys.filter((k) => !k.revokedAt).map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        scopes: k.scopes,
        projectId: k.projectId,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        expiresAt: k.expiresAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      })),
    };
  });

  /** POST /api/organizations/:orgId/api-keys */
  fastify.post<{ Params: { orgId: string } }>("/:orgId/api-keys", {
    preHandler: [requireOrgMember],
    schema: {
      body: z.object({
        name: z.string().min(1),
        scopes: z.array(z.string()),
        projectId: z.string().uuid().optional(),
        expiresAt: z.string().datetime().optional(),
      }),
    },
  }, async (request, reply) => {
    const db = fastify.db;
    const { name, scopes, projectId, expiresAt } = request.body as {
      name: string; scopes: string[]; projectId?: string; expiresAt?: string;
    };

    const rawKey = `of-key-${randomBytes(24).toString("hex")}`;
    const keyPrefix = rawKey.slice(0, 15);
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const [key] = await db.insert(apiKeys).values({
      organizationId: request.params.orgId,
      userId: request.user.id,
      name,
      keyPrefix,
      keyHash,
      scopes,
      projectId: projectId ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();

    return reply.status(201).send({
      id: key!.id,
      name: key!.name,
      key: rawKey,
      keyPrefix: key!.keyPrefix,
      scopes: key!.scopes,
      projectId: key!.projectId,
      expiresAt: key!.expiresAt?.toISOString() ?? null,
      createdAt: key!.createdAt.toISOString(),
    });
  });

  /** DELETE /api/organizations/:orgId/api-keys/:keyId */
  fastify.delete<{ Params: { orgId: string; keyId: string } }>("/:orgId/api-keys/:keyId", {
    preHandler: [requireOrgAdmin],
  }, async (request, reply) => {
    const db = fastify.db;
    const [revoked] = await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.id, request.params.keyId), eq(apiKeys.organizationId, request.params.orgId)))
      .returning();
    if (!revoked) throw new AppError(404, "NOT_FOUND", "API key not found");
    return reply.status(204).send();
  });

  /** GET /api/organizations/:orgId/templates */
  fastify.get<{ Params: { orgId: string }; Querystring: { type?: string } }>("/:orgId/templates", {
    preHandler: [requireOrgMember],
  }, async (request) => {
    const db = fastify.db;
    let query = db.select().from(templates).where(eq(templates.organizationId, request.params.orgId));
    const rows = await query;
    const { type } = request.query as { type?: string };
    const filtered = type ? rows.filter((t) => t.type === type) : rows;

    return {
      templates: filtered.map((t) => ({
        id: t.id,
        type: t.type,
        name: t.name,
        description: t.description,
        isDefault: t.isDefault,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  });

  /** POST /api/organizations/:orgId/templates */
  fastify.post<{ Params: { orgId: string } }>("/:orgId/templates", {
    preHandler: [requireOrgAdmin],
    schema: {
      body: z.object({
        name: z.string().min(1),
        type: z.string().min(1),
        description: z.string().optional(),
        content: z.record(z.string(), z.unknown()),
      }),
    },
  }, async (request, reply) => {
    const db = fastify.db;
    const body = request.body as { name: string; type: string; description?: string; content: Record<string, unknown> };
    const [tmpl] = await db.insert(templates).values({
      organizationId: request.params.orgId,
      name: body.name,
      type: body.type,
      description: body.description ?? null,
      content: body.content,
      createdBy: request.user.id,
    }).returning();

    return reply.status(201).send({
      id: tmpl!.id,
      type: tmpl!.type,
      name: tmpl!.name,
      description: tmpl!.description,
      isDefault: tmpl!.isDefault,
      content: tmpl!.content,
      createdAt: tmpl!.createdAt.toISOString(),
    });
  });
};

export default orgRoutes;
