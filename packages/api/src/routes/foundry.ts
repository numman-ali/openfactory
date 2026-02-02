// SPDX-License-Identifier: AGPL-3.0-only
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, isNull, sql, lt, inArray } from "drizzle-orm";
import { documents, documentVersions, features } from "../db/schema/projects.js";
import { users } from "../db/schema/users.js";
import { driftAlerts, graphNodes } from "../db/schema/graph.js";
import { requireAuth } from "../plugins/auth.js";
import { AppError } from "../plugins/error-handler.js";

const FOUNDRY_TYPES = ["foundation_blueprint", "system_diagram", "feature_blueprint"] as const;

const foundryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  /** GET /api/projects/:projectId/foundry/blueprints */
  fastify.get<{ Params: { projectId: string }; Querystring: { type?: string; featureId?: string } }>(
    "/:projectId/foundry/blueprints",
    async (request) => {
      const db = fastify.db;
      const { type, featureId } = request.query;

      const conditions = [
        eq(documents.projectId, request.params.projectId),
        isNull(documents.deletedAt),
        inArray(documents.type, [...FOUNDRY_TYPES]),
      ];
      if (type) conditions.push(eq(documents.type, type));
      if (featureId) conditions.push(eq(documents.featureId, featureId));

      const rows = await db
        .select({ doc: documents, featureName: features.name, creatorName: users.name })
        .from(documents)
        .leftJoin(features, eq(documents.featureId, features.id))
        .leftJoin(users, eq(documents.createdBy, users.id))
        .where(and(...conditions))
        .orderBy(documents.sortOrder);

      return {
        blueprints: rows.map((r) => ({
          id: r.doc.id,
          type: r.doc.type,
          title: r.doc.title,
          slug: r.doc.slug,
          featureId: r.doc.featureId,
          featureName: r.featureName ?? null,
          sortOrder: r.doc.sortOrder,
          createdBy: r.doc.createdBy ? { id: r.doc.createdBy, name: r.creatorName ?? "" } : null,
          updatedAt: r.doc.updatedAt.toISOString(),
          createdAt: r.doc.createdAt.toISOString(),
        })),
      };
    },
  );

  /** POST /api/projects/:projectId/foundry/blueprints */
  fastify.post<{ Params: { projectId: string } }>("/:projectId/foundry/blueprints", {
    schema: {
      body: z.object({
        type: z.enum(FOUNDRY_TYPES),
        title: z.string().min(1),
        featureId: z.string().uuid().optional(),
        templateId: z.string().uuid().optional(),
        content: z.record(z.string(), z.unknown()).optional(),
        diagramSource: z.string().optional(),
      }),
    },
  }, async (request, reply) => {
    const db = fastify.db;
    const { type, title, featureId, content, diagramSource } = request.body as {
      type: string; title: string; featureId?: string; content?: Record<string, unknown>; diagramSource?: string;
    };

    if (type === "feature_blueprint" && !featureId) {
      throw new AppError(422, "VALIDATION_ERROR", "featureId is required for feature_blueprint type");
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const [doc] = await db.insert(documents).values({
      projectId: request.params.projectId,
      featureId: featureId ?? null,
      type,
      title,
      slug,
      content: content ?? null,
      diagramSource: diagramSource ?? null,
      createdBy: request.user.id,
    }).returning();

    return reply.status(201).send({
      id: doc!.id,
      type: doc!.type,
      title: doc!.title,
      slug: doc!.slug,
      featureId: doc!.featureId,
      content: doc!.content,
      diagramSource: doc!.diagramSource,
      createdAt: doc!.createdAt.toISOString(),
    });
  });

  /** GET /api/projects/:projectId/foundry/blueprints/:blueprintId */
  fastify.get<{ Params: { projectId: string; blueprintId: string } }>("/:projectId/foundry/blueprints/:blueprintId", async (request) => {
    const db = fastify.db;
    const [row] = await db
      .select({ doc: documents, creatorName: users.name })
      .from(documents)
      .leftJoin(users, eq(documents.createdBy, users.id))
      .where(and(eq(documents.id, request.params.blueprintId), eq(documents.projectId, request.params.projectId), isNull(documents.deletedAt)))
      .limit(1);
    if (!row) throw new AppError(404, "NOT_FOUND", "Blueprint not found");

    return {
      id: row.doc.id,
      type: row.doc.type,
      title: row.doc.title,
      slug: row.doc.slug,
      featureId: row.doc.featureId,
      content: row.doc.content,
      diagramSource: row.doc.diagramSource,
      sortOrder: row.doc.sortOrder,
      createdBy: row.doc.createdBy ? { id: row.doc.createdBy, name: row.creatorName ?? "" } : null,
      createdAt: row.doc.createdAt.toISOString(),
      updatedAt: row.doc.updatedAt.toISOString(),
    };
  });

  /** PATCH /api/projects/:projectId/foundry/blueprints/:blueprintId */
  fastify.patch<{ Params: { projectId: string; blueprintId: string } }>("/:projectId/foundry/blueprints/:blueprintId", {
    schema: {
      body: z.object({
        title: z.string().min(1).optional(),
        sortOrder: z.number().int().optional(),
        diagramSource: z.string().optional(),
      }),
    },
  }, async (request) => {
    const db = fastify.db;
    const body = request.body as { title?: string; sortOrder?: number; diagramSource?: string };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
    if (body.diagramSource !== undefined) updates.diagramSource = body.diagramSource;

    const [updated] = await db
      .update(documents)
      .set(updates)
      .where(and(eq(documents.id, request.params.blueprintId), eq(documents.projectId, request.params.projectId)))
      .returning();
    if (!updated) throw new AppError(404, "NOT_FOUND", "Blueprint not found");

    return {
      id: updated.id,
      type: updated.type,
      title: updated.title,
      slug: updated.slug,
      diagramSource: updated.diagramSource,
      sortOrder: updated.sortOrder,
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

  /** DELETE /api/projects/:projectId/foundry/blueprints/:blueprintId */
  fastify.delete<{ Params: { projectId: string; blueprintId: string } }>("/:projectId/foundry/blueprints/:blueprintId", async (request, reply) => {
    const db = fastify.db;
    await db
      .update(documents)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(documents.id, request.params.blueprintId), eq(documents.projectId, request.params.projectId)));
    return reply.status(204).send();
  });

  /** Version endpoints - same pattern as Refinery */
  fastify.get<{ Params: { projectId: string; blueprintId: string }; Querystring: { cursor?: string; limit?: string } }>(
    "/:projectId/foundry/blueprints/:blueprintId/versions",
    async (request) => {
      const db = fastify.db;
      const limit = Math.min(parseInt(request.query.limit ?? "20", 10), 100);
      const conditions = [eq(documentVersions.documentId, request.params.blueprintId)];
      if (request.query.cursor) conditions.push(lt(documentVersions.createdAt, new Date(request.query.cursor)));

      const rows = await db
        .select({ version: documentVersions, creatorName: users.name })
        .from(documentVersions)
        .leftJoin(users, eq(documentVersions.createdBy, users.id))
        .where(and(...conditions))
        .orderBy(sql`${documentVersions.versionNumber} DESC`)
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        versions: items.map((r) => ({
          id: r.version.id,
          versionNumber: r.version.versionNumber,
          changeSummary: r.version.changeSummary,
          createdBy: r.version.createdBy ? { id: r.version.createdBy, name: r.creatorName ?? "" } : null,
          createdAt: r.version.createdAt.toISOString(),
        })),
        nextCursor: hasMore ? items[items.length - 1]!.version.createdAt.toISOString() : null,
      };
    },
  );

  fastify.post<{ Params: { projectId: string; blueprintId: string } }>("/:projectId/foundry/blueprints/:blueprintId/versions", {
    schema: {
      body: z.object({ changeSummary: z.string().optional() }),
    },
  }, async (request, reply) => {
    const db = fastify.db;
    const { changeSummary } = request.body as { changeSummary?: string };

    const [doc] = await db.select().from(documents).where(eq(documents.id, request.params.blueprintId)).limit(1);
    if (!doc) throw new AppError(404, "NOT_FOUND", "Blueprint not found");

    const [maxVer] = await db
      .select({ max: sql<number>`COALESCE(MAX(${documentVersions.versionNumber}), 0)` })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, request.params.blueprintId));

    const [version] = await db.insert(documentVersions).values({
      documentId: request.params.blueprintId,
      versionNumber: (maxVer?.max ?? 0) + 1,
      content: doc.content ?? {},
      diagramSource: doc.diagramSource,
      changeSummary: changeSummary ?? null,
      createdBy: request.user.id,
    }).returning();

    return reply.status(201).send({
      id: version!.id,
      versionNumber: version!.versionNumber,
      changeSummary: version!.changeSummary,
      createdAt: version!.createdAt.toISOString(),
    });
  });

  /** GET /api/projects/:projectId/foundry/drift-alerts */
  fastify.get<{ Params: { projectId: string }; Querystring: { status?: string; type?: string } }>(
    "/:projectId/foundry/drift-alerts",
    async (request) => {
      const db = fastify.db;
      const conditions = [eq(driftAlerts.projectId, request.params.projectId)];
      if (request.query.status) conditions.push(eq(driftAlerts.status, request.query.status));
      if (request.query.type) conditions.push(eq(driftAlerts.driftType, request.query.type));

      const rows = await db
        .select({
          alert: driftAlerts,
          sourceLabel: graphNodes.label,
          sourceEntityType: graphNodes.entityType,
        })
        .from(driftAlerts)
        .leftJoin(graphNodes, eq(driftAlerts.sourceNodeId, graphNodes.id))
        .where(and(...conditions))
        .orderBy(sql`${driftAlerts.createdAt} DESC`);

      return {
        alerts: rows.map((r) => ({
          id: r.alert.id,
          driftType: r.alert.driftType,
          description: r.alert.description,
          severity: r.alert.severity,
          status: r.alert.status,
          sourceNode: { id: r.alert.sourceNodeId, label: r.sourceLabel ?? "", entityType: r.sourceEntityType ?? "" },
          targetNode: r.alert.targetNodeId ? { id: r.alert.targetNodeId, label: "", entityType: "" } : null,
          createdAt: r.alert.createdAt.toISOString(),
        })),
      };
    },
  );

  /** PATCH /api/projects/:projectId/foundry/drift-alerts/:alertId */
  fastify.patch<{ Params: { projectId: string; alertId: string } }>("/:projectId/foundry/drift-alerts/:alertId", {
    schema: {
      body: z.object({ status: z.enum(["acknowledged", "resolved", "dismissed"]) }),
    },
  }, async (request) => {
    const db = fastify.db;
    const { status } = request.body as { status: string };
    const updates: Record<string, unknown> = { status, updatedAt: new Date() };
    if (status === "resolved" || status === "dismissed") {
      updates.resolvedBy = request.user.id;
    }

    const [updated] = await db
      .update(driftAlerts)
      .set(updates)
      .where(and(eq(driftAlerts.id, request.params.alertId), eq(driftAlerts.projectId, request.params.projectId)))
      .returning();
    if (!updated) throw new AppError(404, "NOT_FOUND", "Drift alert not found");

    return {
      id: updated.id,
      driftType: updated.driftType,
      description: updated.description,
      severity: updated.severity,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    };
  });
};

export default foundryRoutes;
