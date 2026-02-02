// SPDX-License-Identifier: AGPL-3.0-only
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, count, isNull, sql, lt, inArray } from "drizzle-orm";
import { projects, features, documents } from "../db/schema/projects.js";
import { artifacts } from "../db/schema/artifacts.js";
import { workOrders } from "../db/schema/planner.js";
import { activities } from "../db/schema/activity.js";
import { requireAuth, requireOrgMember } from "../plugins/auth.js";
import { AppError } from "../plugins/error-handler.js";

const projectRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  /** GET /api/organizations/:orgId/projects */
  fastify.get<{ Params: { orgId: string }; Querystring: { includeArchived?: string } }>("/:orgId/projects", {
    preHandler: [requireOrgMember],
  }, async (request) => {
    const db = fastify.db;
    const includeArchived = request.query.includeArchived === "true";

    const conditions = [eq(projects.organizationId, request.params.orgId)];
    if (!includeArchived) conditions.push(isNull(projects.archivedAt));

    const rows = await db.select().from(projects).where(and(...conditions));

    const projectIds = rows.map((p) => p.id);
    if (projectIds.length === 0) return { projects: [] };

    const featureCounts = await db
      .select({ projectId: features.projectId, count: count() })
      .from(features)
      .where(and(inArray(features.projectId, projectIds), isNull(features.deletedAt)))
      .groupBy(features.projectId);

    const docCounts = await db
      .select({ projectId: documents.projectId, count: count() })
      .from(documents)
      .where(and(inArray(documents.projectId, projectIds), isNull(documents.deletedAt)))
      .groupBy(documents.projectId);

    const woCounts = await db
      .select({ projectId: workOrders.projectId, count: count() })
      .from(workOrders)
      .where(inArray(workOrders.projectId, projectIds))
      .groupBy(workOrders.projectId);

    const fcMap = new Map(featureCounts.map((r) => [r.projectId, r.count]));
    const dcMap = new Map(docCounts.map((r) => [r.projectId, r.count]));
    const woMap = new Map(woCounts.map((r) => [r.projectId, r.count]));

    return {
      projects: rows.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        archivedAt: p.archivedAt?.toISOString() ?? null,
        featureCount: fcMap.get(p.id) ?? 0,
        documentCount: dcMap.get(p.id) ?? 0,
        workOrderCount: woMap.get(p.id) ?? 0,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  });

  /** POST /api/organizations/:orgId/projects */
  fastify.post<{ Params: { orgId: string } }>("/:orgId/projects", {
    preHandler: [requireOrgMember],
    schema: {
      body: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        templateId: z.string().uuid().optional(),
      }),
    },
  }, async (request, reply) => {
    const db = fastify.db;
    const { name, description } = request.body as { name: string; description?: string; templateId?: string };
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const [project] = await db.insert(projects).values({
      organizationId: request.params.orgId,
      name,
      slug,
      description: description ?? null,
      settings: {},
    }).returning();

    return reply.status(201).send({
      id: project!.id,
      name: project!.name,
      slug: project!.slug,
      description: project!.description,
      settings: project!.settings,
      createdAt: project!.createdAt.toISOString(),
    });
  });

  /** GET /api/projects/:projectId */
  fastify.get<{ Params: { projectId: string } }>("/projects/:projectId", async (request) => {
    const db = fastify.db;
    const [project] = await db.select().from(projects).where(eq(projects.id, request.params.projectId)).limit(1);
    if (!project) throw new AppError(404, "NOT_FOUND", "Project not found");

    const [[fc], [dc], [woc], [ac]] = await Promise.all([
      db.select({ count: count() }).from(features).where(and(eq(features.projectId, project.id), isNull(features.deletedAt))),
      db.select({ count: count() }).from(documents).where(and(eq(documents.projectId, project.id), isNull(documents.deletedAt))),
      db.select({ count: count() }).from(workOrders).where(eq(workOrders.projectId, project.id)),
      db.select({ count: count() }).from(artifacts).where(and(eq(artifacts.projectId, project.id), isNull(artifacts.deletedAt))),
    ]);

    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      organizationId: project.organizationId,
      settings: project.settings,
      stats: {
        featureCount: fc?.count ?? 0,
        documentCount: dc?.count ?? 0,
        workOrderCount: woc?.count ?? 0,
        artifactCount: ac?.count ?? 0,
        hasCodebaseConnection: false, // TODO: check codebase_connections
      },
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  });

  /** PATCH /api/projects/:projectId */
  fastify.patch<{ Params: { projectId: string } }>("/projects/:projectId", {
    schema: {
      body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
      }),
    },
  }, async (request) => {
    const db = fastify.db;
    const body = request.body as { name?: string; description?: string; settings?: Record<string, unknown> };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.settings !== undefined) updates.settings = body.settings;

    const [updated] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, request.params.projectId))
      .returning();
    if (!updated) throw new AppError(404, "NOT_FOUND", "Project not found");

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      settings: updated.settings,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

  /** POST /api/projects/:projectId/archive */
  fastify.post<{ Params: { projectId: string } }>("/projects/:projectId/archive", async (request) => {
    const db = fastify.db;
    const [archived] = await db
      .update(projects)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(projects.id, request.params.projectId))
      .returning();
    if (!archived) throw new AppError(404, "NOT_FOUND", "Project not found");
    return { archivedAt: archived.archivedAt!.toISOString() };
  });

  /** GET /api/projects/:projectId/features */
  fastify.get<{ Params: { projectId: string } }>("/projects/:projectId/features", async (request) => {
    const db = fastify.db;
    const rows = await db
      .select()
      .from(features)
      .where(and(eq(features.projectId, request.params.projectId), isNull(features.deletedAt)))
      .orderBy(features.sortOrder);

    // Build tree
    type FeatureNode = typeof rows[number] & { children: FeatureNode[] };
    const nodeMap = new Map<string, FeatureNode>();
    const roots: FeatureNode[] = [];

    for (const row of rows) {
      nodeMap.set(row.id, { ...row, children: [] });
    }
    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    function mapTree(node: FeatureNode): Record<string, unknown> {
      return {
        id: node.id,
        name: node.name,
        slug: node.slug,
        parentId: node.parentId,
        sortOrder: node.sortOrder,
        children: node.children.map(mapTree),
      };
    }

    return { features: roots.map(mapTree) };
  });

  /** POST /api/projects/:projectId/features */
  fastify.post<{ Params: { projectId: string } }>("/projects/:projectId/features", {
    schema: {
      body: z.object({
        name: z.string().min(1),
        parentId: z.string().uuid().optional(),
      }),
    },
  }, async (request, reply) => {
    const db = fastify.db;
    const { name, parentId } = request.body as { name: string; parentId?: string };
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Get next sort order
    const [maxSort] = await db
      .select({ max: sql<number>`COALESCE(MAX(${features.sortOrder}), -1)` })
      .from(features)
      .where(and(eq(features.projectId, request.params.projectId), parentId ? eq(features.parentId, parentId) : isNull(features.parentId)));

    const [feature] = await db.insert(features).values({
      projectId: request.params.projectId,
      parentId: parentId ?? null,
      name,
      slug,
      sortOrder: (maxSort?.max ?? -1) + 1,
    }).returning();

    return reply.status(201).send({
      id: feature!.id,
      name: feature!.name,
      slug: feature!.slug,
      parentId: feature!.parentId,
      sortOrder: feature!.sortOrder,
      createdAt: feature!.createdAt.toISOString(),
    });
  });

  /** PATCH /api/projects/:projectId/features/:featureId */
  fastify.patch<{ Params: { projectId: string; featureId: string } }>("/projects/:projectId/features/:featureId", {
    schema: {
      body: z.object({
        name: z.string().min(1).optional(),
        parentId: z.string().uuid().nullable().optional(),
        sortOrder: z.number().int().optional(),
      }),
    },
  }, async (request) => {
    const db = fastify.db;
    const body = request.body as { name?: string; parentId?: string | null; sortOrder?: number };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) {
      updates.name = body.name;
      updates.slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }
    if (body.parentId !== undefined) updates.parentId = body.parentId;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

    const [updated] = await db
      .update(features)
      .set(updates)
      .where(and(eq(features.id, request.params.featureId), eq(features.projectId, request.params.projectId)))
      .returning();
    if (!updated) throw new AppError(404, "NOT_FOUND", "Feature not found");

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      parentId: updated.parentId,
      sortOrder: updated.sortOrder,
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

  /** DELETE /api/projects/:projectId/features/:featureId */
  fastify.delete<{ Params: { projectId: string; featureId: string } }>("/projects/:projectId/features/:featureId", async (request, reply) => {
    const db = fastify.db;
    // Soft delete the feature and its children
    const now = new Date();
    await db
      .update(features)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(features.id, request.params.featureId), eq(features.projectId, request.params.projectId)));

    // Also soft-delete children
    await db
      .update(features)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(features.parentId, request.params.featureId), eq(features.projectId, request.params.projectId)));

    return reply.status(204).send();
  });

  /** GET /api/projects/:projectId/activity */
  fastify.get<{ Params: { projectId: string }; Querystring: { entityType?: string; entityId?: string; cursor?: string; limit?: string } }>(
    "/projects/:projectId/activity",
    async (request) => {
      const db = fastify.db;
      const { entityType, entityId, cursor, limit: limitStr } = request.query;
      const limit = Math.min(parseInt(limitStr ?? "50", 10), 100);

      const conditions = [eq(activities.projectId, request.params.projectId)];
      if (entityType) conditions.push(eq(activities.entityType, entityType));
      if (entityId) conditions.push(eq(activities.entityId, entityId));
      if (cursor) conditions.push(lt(activities.createdAt, new Date(cursor)));

      const rows = await db
        .select()
        .from(activities)
        .where(and(...conditions))
        .orderBy(sql`${activities.createdAt} DESC`)
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        activities: items.map((a) => ({
          id: a.id,
          entityType: a.entityType,
          entityId: a.entityId,
          action: a.action,
          changes: a.changes,
          actor: { id: a.actorId, type: a.actorType },
          createdAt: a.createdAt.toISOString(),
        })),
        nextCursor: hasMore ? items[items.length - 1]!.createdAt.toISOString() : null,
      };
    },
  );
};

export default projectRoutes;
