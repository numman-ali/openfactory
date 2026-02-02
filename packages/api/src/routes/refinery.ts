// SPDX-License-Identifier: AGPL-3.0-only
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, isNull, sql, lt, inArray } from "drizzle-orm";
import { documents, documentVersions, features } from "../db/schema/projects.js";
import { users } from "../db/schema/users.js";
import { requireAuth } from "../plugins/auth.js";
import { AppError } from "../plugins/error-handler.js";

const REFINERY_TYPES = ["product_overview", "feature_requirements", "technical_requirements"] as const;

const refineryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  /** GET /api/projects/:projectId/refinery/documents */
  fastify.get<{ Params: { projectId: string }; Querystring: { type?: string; featureId?: string } }>(
    "/:projectId/refinery/documents",
    async (request) => {
      const db = fastify.db;
      const { type, featureId } = request.query;

      const conditions = [
        eq(documents.projectId, request.params.projectId),
        isNull(documents.deletedAt),
        inArray(documents.type, [...REFINERY_TYPES]),
      ];
      if (type) conditions.push(eq(documents.type, type));
      if (featureId) conditions.push(eq(documents.featureId, featureId));

      const rows = await db
        .select({
          doc: documents,
          featureName: features.name,
          creatorName: users.name,
        })
        .from(documents)
        .leftJoin(features, eq(documents.featureId, features.id))
        .leftJoin(users, eq(documents.createdBy, users.id))
        .where(and(...conditions))
        .orderBy(documents.sortOrder);

      return {
        documents: rows.map((r) => ({
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

  /** POST /api/projects/:projectId/refinery/documents */
  fastify.post<{ Params: { projectId: string } }>("/:projectId/refinery/documents", {
    schema: {
      body: z.object({
        type: z.enum(REFINERY_TYPES),
        title: z.string().min(1),
        featureId: z.string().uuid().optional(),
        templateId: z.string().uuid().optional(),
        content: z.record(z.string(), z.unknown()).optional(),
      }),
    },
  }, async (request, reply) => {
    const db = fastify.db;
    const { type, title, featureId, content } = request.body as {
      type: string; title: string; featureId?: string; content?: Record<string, unknown>;
    };

    if (type === "feature_requirements" && !featureId) {
      throw new AppError(422, "VALIDATION_ERROR", "featureId is required for feature_requirements type");
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const [doc] = await db.insert(documents).values({
      projectId: request.params.projectId,
      featureId: featureId ?? null,
      type,
      title,
      slug,
      content: content ?? null,
      createdBy: request.user.id,
    }).returning();

    return reply.status(201).send({
      id: doc!.id,
      type: doc!.type,
      title: doc!.title,
      slug: doc!.slug,
      featureId: doc!.featureId,
      content: doc!.content,
      createdAt: doc!.createdAt.toISOString(),
    });
  });

  /** GET /api/projects/:projectId/refinery/documents/:documentId */
  fastify.get<{ Params: { projectId: string; documentId: string } }>("/:projectId/refinery/documents/:documentId", async (request) => {
    const db = fastify.db;
    const [row] = await db
      .select({ doc: documents, creatorName: users.name })
      .from(documents)
      .leftJoin(users, eq(documents.createdBy, users.id))
      .where(and(eq(documents.id, request.params.documentId), eq(documents.projectId, request.params.projectId), isNull(documents.deletedAt)))
      .limit(1);
    if (!row) throw new AppError(404, "NOT_FOUND", "Document not found");

    return {
      id: row.doc.id,
      type: row.doc.type,
      title: row.doc.title,
      slug: row.doc.slug,
      featureId: row.doc.featureId,
      content: row.doc.content,
      sortOrder: row.doc.sortOrder,
      createdBy: row.doc.createdBy ? { id: row.doc.createdBy, name: row.creatorName ?? "" } : null,
      createdAt: row.doc.createdAt.toISOString(),
      updatedAt: row.doc.updatedAt.toISOString(),
    };
  });

  /** PATCH /api/projects/:projectId/refinery/documents/:documentId */
  fastify.patch<{ Params: { projectId: string; documentId: string } }>("/:projectId/refinery/documents/:documentId", {
    schema: {
      body: z.object({
        title: z.string().min(1).optional(),
        sortOrder: z.number().int().optional(),
      }),
    },
  }, async (request) => {
    const db = fastify.db;
    const body = request.body as { title?: string; sortOrder?: number };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

    const [updated] = await db
      .update(documents)
      .set(updates)
      .where(and(eq(documents.id, request.params.documentId), eq(documents.projectId, request.params.projectId)))
      .returning();
    if (!updated) throw new AppError(404, "NOT_FOUND", "Document not found");

    return {
      id: updated.id,
      type: updated.type,
      title: updated.title,
      slug: updated.slug,
      sortOrder: updated.sortOrder,
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

  /** DELETE /api/projects/:projectId/refinery/documents/:documentId */
  fastify.delete<{ Params: { projectId: string; documentId: string } }>("/:projectId/refinery/documents/:documentId", async (request, reply) => {
    const db = fastify.db;
    await db
      .update(documents)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(documents.id, request.params.documentId), eq(documents.projectId, request.params.projectId)));
    return reply.status(204).send();
  });

  /** GET /api/projects/:projectId/refinery/documents/:documentId/versions */
  fastify.get<{ Params: { projectId: string; documentId: string }; Querystring: { cursor?: string; limit?: string } }>(
    "/:projectId/refinery/documents/:documentId/versions",
    async (request) => {
      const db = fastify.db;
      const limit = Math.min(parseInt(request.query.limit ?? "20", 10), 100);
      const conditions = [eq(documentVersions.documentId, request.params.documentId)];
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

  /** GET /api/projects/:projectId/refinery/documents/:documentId/versions/:versionId */
  fastify.get<{ Params: { projectId: string; documentId: string; versionId: string } }>(
    "/:projectId/refinery/documents/:documentId/versions/:versionId",
    async (request) => {
      const db = fastify.db;
      const [row] = await db
        .select({ version: documentVersions, creatorName: users.name })
        .from(documentVersions)
        .leftJoin(users, eq(documentVersions.createdBy, users.id))
        .where(and(eq(documentVersions.id, request.params.versionId), eq(documentVersions.documentId, request.params.documentId)))
        .limit(1);
      if (!row) throw new AppError(404, "NOT_FOUND", "Version not found");

      return {
        id: row.version.id,
        versionNumber: row.version.versionNumber,
        content: row.version.content,
        changeSummary: row.version.changeSummary,
        createdBy: row.version.createdBy ? { id: row.version.createdBy, name: row.creatorName ?? "" } : null,
        createdAt: row.version.createdAt.toISOString(),
      };
    },
  );

  /** POST /api/projects/:projectId/refinery/documents/:documentId/versions */
  fastify.post<{ Params: { projectId: string; documentId: string } }>("/:projectId/refinery/documents/:documentId/versions", {
    schema: {
      body: z.object({ changeSummary: z.string().optional() }),
    },
  }, async (request, reply) => {
    const db = fastify.db;
    const { changeSummary } = request.body as { changeSummary?: string };

    // Get current document content
    const [doc] = await db.select().from(documents).where(eq(documents.id, request.params.documentId)).limit(1);
    if (!doc) throw new AppError(404, "NOT_FOUND", "Document not found");

    // Get next version number
    const [maxVer] = await db
      .select({ max: sql<number>`COALESCE(MAX(${documentVersions.versionNumber}), 0)` })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, request.params.documentId));

    const versionNumber = (maxVer?.max ?? 0) + 1;

    const [version] = await db.insert(documentVersions).values({
      documentId: request.params.documentId,
      versionNumber,
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
};

export default refineryRoutes;
