// SPDX-License-Identifier: AGPL-3.0-only
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, isNull, lt, sql } from "drizzle-orm";
import { artifacts, artifactFolders } from "../db/schema/artifacts.js";
import { users } from "../db/schema/users.js";
import { requireAuth } from "../plugins/auth.js";
import { AppError } from "../plugins/error-handler.js";

const artifactRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  // ── Folders ──

  /** GET /api/projects/:projectId/artifacts/folders */
  fastify.get<{ Params: { projectId: string } }>("/projects/:projectId/artifacts/folders", async (request) => {
    const db = fastify.db;
    const rows = await db
      .select()
      .from(artifactFolders)
      .where(eq(artifactFolders.projectId, request.params.projectId))
      .orderBy(artifactFolders.sortOrder);

    // Build tree
    type FolderNode = typeof rows[number] & { children: FolderNode[]; artifactCount: number };
    const nodeMap = new Map<string, FolderNode>();
    const roots: FolderNode[] = [];

    for (const row of rows) {
      nodeMap.set(row.id, { ...row, children: [], artifactCount: 0 });
    }
    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Count artifacts per folder
    const artCounts = await db
      .select({ folderId: artifacts.folderId, count: sql<number>`count(*)::int` })
      .from(artifacts)
      .where(and(eq(artifacts.projectId, request.params.projectId), isNull(artifacts.deletedAt)))
      .groupBy(artifacts.folderId);

    const countMap = new Map(artCounts.filter((c) => c.folderId).map((c) => [c.folderId!, c.count]));
    for (const node of nodeMap.values()) {
      node.artifactCount = countMap.get(node.id) ?? 0;
    }

    function mapTree(node: FolderNode): Record<string, unknown> {
      return {
        id: node.id,
        name: node.name,
        parentId: node.parentId,
        sortOrder: node.sortOrder,
        artifactCount: node.artifactCount,
        children: node.children.map(mapTree),
      };
    }

    return { folders: roots.map(mapTree) };
  });

  /** POST /api/projects/:projectId/artifacts/folders */
  fastify.post<{ Params: { projectId: string } }>("/projects/:projectId/artifacts/folders", {
    schema: {
      body: z.object({
        name: z.string().min(1),
        parentId: z.string().uuid().optional(),
      }),
    },
  }, async (request, reply) => {
    const db = fastify.db;
    const { name, parentId } = request.body as { name: string; parentId?: string };

    const [folder] = await db.insert(artifactFolders).values({
      projectId: request.params.projectId,
      parentId: parentId ?? null,
      name,
    }).returning();

    return reply.status(201).send({
      id: folder!.id,
      name: folder!.name,
      parentId: folder!.parentId,
      sortOrder: folder!.sortOrder,
      createdAt: folder!.createdAt.toISOString(),
    });
  });

  /** PATCH /api/projects/:projectId/artifacts/folders/:folderId */
  fastify.patch<{ Params: { projectId: string; folderId: string } }>("/projects/:projectId/artifacts/folders/:folderId", {
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
    if (body.name !== undefined) updates.name = body.name;
    if (body.parentId !== undefined) updates.parentId = body.parentId;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

    const [updated] = await db
      .update(artifactFolders)
      .set(updates)
      .where(and(eq(artifactFolders.id, request.params.folderId), eq(artifactFolders.projectId, request.params.projectId)))
      .returning();
    if (!updated) throw new AppError(404, "NOT_FOUND", "Folder not found");

    return {
      id: updated.id,
      name: updated.name,
      parentId: updated.parentId,
      sortOrder: updated.sortOrder,
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

  /** DELETE /api/projects/:projectId/artifacts/folders/:folderId */
  fastify.delete<{ Params: { projectId: string; folderId: string } }>("/projects/:projectId/artifacts/folders/:folderId", async (request, reply) => {
    const db = fastify.db;
    // Move artifacts in folder to root
    await db
      .update(artifacts)
      .set({ folderId: null, updatedAt: new Date() })
      .where(and(eq(artifacts.folderId, request.params.folderId), eq(artifacts.projectId, request.params.projectId)));

    await db
      .delete(artifactFolders)
      .where(and(eq(artifactFolders.id, request.params.folderId), eq(artifactFolders.projectId, request.params.projectId)));

    return reply.status(204).send();
  });

  // ── Artifacts ──

  /** GET /api/projects/:projectId/artifacts */
  fastify.get<{ Params: { projectId: string }; Querystring: { folderId?: string; search?: string; mimeType?: string; cursor?: string; limit?: string } }>(
    "/projects/:projectId/artifacts",
    async (request) => {
      const db = fastify.db;
      const { folderId, mimeType, cursor, limit: limitStr } = request.query;
      const limit = Math.min(parseInt(limitStr ?? "50", 10), 100);

      const conditions = [eq(artifacts.projectId, request.params.projectId), isNull(artifacts.deletedAt)];
      if (folderId === "root") {
        conditions.push(isNull(artifacts.folderId));
      } else if (folderId) {
        conditions.push(eq(artifacts.folderId, folderId));
      }
      if (mimeType) conditions.push(eq(artifacts.mimeType, mimeType));
      if (cursor) conditions.push(lt(artifacts.createdAt, new Date(cursor)));

      const rows = await db
        .select({
          artifact: artifacts,
          uploaderName: users.name,
        })
        .from(artifacts)
        .leftJoin(users, eq(artifacts.uploadedBy, users.id))
        .where(and(...conditions))
        .orderBy(sql`${artifacts.createdAt} DESC`)
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        artifacts: items.map((r) => ({
          id: r.artifact.id,
          name: r.artifact.name,
          fileName: r.artifact.fileName,
          mimeType: r.artifact.mimeType,
          fileSize: r.artifact.fileSize,
          folderId: r.artifact.folderId,
          processingStatus: r.artifact.processingStatus,
          uploadedBy: r.artifact.uploadedBy ? { id: r.artifact.uploadedBy, name: r.uploaderName ?? "" } : null,
          createdAt: r.artifact.createdAt.toISOString(),
        })),
        nextCursor: hasMore ? items[items.length - 1]!.artifact.createdAt.toISOString() : null,
      };
    },
  );

  /** POST /api/projects/:projectId/artifacts - multipart upload */
  fastify.post<{ Params: { projectId: string } }>("/projects/:projectId/artifacts", async (request, reply) => {
    const data = await request.file();
    if (!data) throw new AppError(400, "BAD_REQUEST", "No file provided");

    const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
    const chunks: Buffer[] = [];
    let totalSize = 0;

    for await (const chunk of data.file) {
      totalSize += chunk.length;
      if (totalSize > MAX_SIZE) throw new AppError(413, "FILE_TOO_LARGE", "File exceeds 50 MB limit");
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    const storageKey = `projects/${request.params.projectId}/artifacts/${Date.now()}-${data.filename}`;

    // TODO: upload to S3/MinIO using storageKey and buffer

    const db = fastify.db;
    const fields = data.fields as Record<string, { value?: string }>;
    const displayName = fields.name?.value ?? data.filename;
    const folderId = fields.folderId?.value ?? null;

    const [artifact] = await db.insert(artifacts).values({
      projectId: request.params.projectId,
      folderId,
      name: displayName,
      fileName: data.filename,
      mimeType: data.mimetype,
      fileSize: buffer.length,
      storageKey,
      processingStatus: "pending",
      uploadedBy: request.user.id,
    }).returning();

    return reply.status(201).send({
      id: artifact!.id,
      name: artifact!.name,
      fileName: artifact!.fileName,
      mimeType: artifact!.mimeType,
      fileSize: artifact!.fileSize,
      folderId: artifact!.folderId,
      processingStatus: artifact!.processingStatus,
      createdAt: artifact!.createdAt.toISOString(),
    });
  });

  /** GET /api/projects/:projectId/artifacts/:artifactId */
  fastify.get<{ Params: { projectId: string; artifactId: string } }>("/projects/:projectId/artifacts/:artifactId", async (request) => {
    const db = fastify.db;
    const [row] = await db
      .select({ artifact: artifacts, uploaderName: users.name })
      .from(artifacts)
      .leftJoin(users, eq(artifacts.uploadedBy, users.id))
      .where(and(eq(artifacts.id, request.params.artifactId), eq(artifacts.projectId, request.params.projectId), isNull(artifacts.deletedAt)))
      .limit(1);

    if (!row) throw new AppError(404, "NOT_FOUND", "Artifact not found");
    const a = row.artifact;

    return {
      id: a.id,
      name: a.name,
      fileName: a.fileName,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
      folderId: a.folderId,
      processingStatus: a.processingStatus,
      extractedText: a.extractedText,
      uploadedBy: a.uploadedBy ? { id: a.uploadedBy, name: row.uploaderName ?? "" } : null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  });

  /** GET /api/projects/:projectId/artifacts/:artifactId/download */
  fastify.get<{ Params: { projectId: string; artifactId: string } }>("/projects/:projectId/artifacts/:artifactId/download", async (request, _reply) => {
    const db = fastify.db;
    const [a] = await db
      .select()
      .from(artifacts)
      .where(and(eq(artifacts.id, request.params.artifactId), eq(artifacts.projectId, request.params.projectId), isNull(artifacts.deletedAt)))
      .limit(1);

    if (!a) throw new AppError(404, "NOT_FOUND", "Artifact not found");

    // TODO: fetch from S3/MinIO and stream
    throw new AppError(501, "NOT_IMPLEMENTED", "File download not yet implemented");
  });

  /** PATCH /api/projects/:projectId/artifacts/:artifactId */
  fastify.patch<{ Params: { projectId: string; artifactId: string } }>("/projects/:projectId/artifacts/:artifactId", {
    schema: {
      body: z.object({
        name: z.string().min(1).optional(),
        folderId: z.string().uuid().nullable().optional(),
      }),
    },
  }, async (request) => {
    const db = fastify.db;
    const body = request.body as { name?: string; folderId?: string | null };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.folderId !== undefined) updates.folderId = body.folderId;

    const [updated] = await db
      .update(artifacts)
      .set(updates)
      .where(and(eq(artifacts.id, request.params.artifactId), eq(artifacts.projectId, request.params.projectId), isNull(artifacts.deletedAt)))
      .returning();
    if (!updated) throw new AppError(404, "NOT_FOUND", "Artifact not found");

    return {
      id: updated.id,
      name: updated.name,
      fileName: updated.fileName,
      mimeType: updated.mimeType,
      fileSize: updated.fileSize,
      folderId: updated.folderId,
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

  /** DELETE /api/projects/:projectId/artifacts/:artifactId */
  fastify.delete<{ Params: { projectId: string; artifactId: string } }>("/projects/:projectId/artifacts/:artifactId", async (request, reply) => {
    const db = fastify.db;
    const [deleted] = await db
      .update(artifacts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(artifacts.id, request.params.artifactId), eq(artifacts.projectId, request.params.projectId), isNull(artifacts.deletedAt)))
      .returning();
    if (!deleted) throw new AppError(404, "NOT_FOUND", "Artifact not found");
    return reply.status(204).send();
  });
};

export default artifactRoutes;
