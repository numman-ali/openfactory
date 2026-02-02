// SPDX-License-Identifier: AGPL-3.0-only
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, isNull, sql, lt, count, inArray } from "drizzle-orm";
import { phases, workOrders } from "../db/schema/planner.js";
import { features } from "../db/schema/projects.js";
import { users } from "../db/schema/users.js";
import { comments } from "../db/schema/comments.js";
import { activities } from "../db/schema/activity.js";
import { graphEdges, graphNodes } from "../db/schema/graph.js";
import { requireAuth } from "../plugins/auth.js";
import { AppError } from "../plugins/error-handler.js";

const plannerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  // ── Phases ──

  /** GET /api/projects/:projectId/planner/phases */
  fastify.get<{ Params: { projectId: string } }>("/:projectId/planner/phases", async (request) => {
    const db = fastify.db;
    const rows = await db.select().from(phases).where(eq(phases.projectId, request.params.projectId)).orderBy(phases.sortOrder);

    const woCounts = await db
      .select({ phaseId: workOrders.phaseId, count: count() })
      .from(workOrders)
      .where(and(eq(workOrders.projectId, request.params.projectId), isNull(workOrders.deletedAt)))
      .groupBy(workOrders.phaseId);
    const countMap = new Map(woCounts.filter((c) => c.phaseId).map((c) => [c.phaseId!, c.count]));

    return {
      phases: rows.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        sortOrder: p.sortOrder,
        workOrderCount: countMap.get(p.id) ?? 0,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  });

  /** POST /api/projects/:projectId/planner/phases */
  fastify.post<{ Params: { projectId: string } }>("/:projectId/planner/phases", {
    schema: {
      body: z.object({ name: z.string().min(1), description: z.string().optional() }),
    },
  }, async (request, reply) => {
    const db = fastify.db;
    const { name, description } = request.body as { name: string; description?: string };
    const [phase] = await db.insert(phases).values({
      projectId: request.params.projectId,
      name,
      description: description ?? null,
    }).returning();

    return reply.status(201).send({
      id: phase!.id,
      name: phase!.name,
      description: phase!.description,
      sortOrder: phase!.sortOrder,
      createdAt: phase!.createdAt.toISOString(),
    });
  });

  /** PATCH /api/projects/:projectId/planner/phases/:phaseId */
  fastify.patch<{ Params: { projectId: string; phaseId: string } }>("/:projectId/planner/phases/:phaseId", {
    schema: {
      body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        sortOrder: z.number().int().optional(),
      }),
    },
  }, async (request) => {
    const db = fastify.db;
    const body = request.body as { name?: string; description?: string; sortOrder?: number };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

    const [updated] = await db
      .update(phases)
      .set(updates)
      .where(and(eq(phases.id, request.params.phaseId), eq(phases.projectId, request.params.projectId)))
      .returning();
    if (!updated) throw new AppError(404, "NOT_FOUND", "Phase not found");

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      sortOrder: updated.sortOrder,
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

  /** DELETE /api/projects/:projectId/planner/phases/:phaseId */
  fastify.delete<{ Params: { projectId: string; phaseId: string } }>("/:projectId/planner/phases/:phaseId", async (request, reply) => {
    const db = fastify.db;
    // Unlink work orders
    await db.update(workOrders).set({ phaseId: null, updatedAt: new Date() }).where(eq(workOrders.phaseId, request.params.phaseId));
    await db.delete(phases).where(and(eq(phases.id, request.params.phaseId), eq(phases.projectId, request.params.projectId)));
    return reply.status(204).send();
  });

  // ── Work Orders ──

  /** GET /api/projects/:projectId/planner/work-orders */
  fastify.get<{ Params: { projectId: string }; Querystring: Record<string, string | undefined> }>(
    "/:projectId/planner/work-orders",
    async (request) => {
      const db = fastify.db;
      const { status, phaseId, featureId, deliverableType, cursor, limit: limitStr } = request.query;
      const limit = Math.min(parseInt(limitStr ?? "50", 10), 200);

      const conditions = [eq(workOrders.projectId, request.params.projectId), isNull(workOrders.deletedAt)];
      if (status) {
        const statuses = status.split(",");
        conditions.push(inArray(workOrders.status, statuses));
      }
      if (phaseId) conditions.push(eq(workOrders.phaseId, phaseId));
      if (featureId) conditions.push(eq(workOrders.featureId, featureId));
      if (deliverableType) conditions.push(eq(workOrders.deliverableType, deliverableType));
      if (cursor) conditions.push(lt(workOrders.createdAt, new Date(cursor)));

      const [[totalRow], rows] = await Promise.all([
        db.select({ count: count() }).from(workOrders).where(and(...conditions)),
        db.select({
          wo: workOrders,
          phaseName: phases.name,
          featureName: features.name,
        })
          .from(workOrders)
          .leftJoin(phases, eq(workOrders.phaseId, phases.id))
          .leftJoin(features, eq(workOrders.featureId, features.id))
          .where(and(...conditions))
          .orderBy(workOrders.sortOrder)
          .limit(limit + 1),
      ]);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        workOrders: items.map((r) => ({
          id: r.wo.id,
          title: r.wo.title,
          status: r.wo.status,
          phase: r.wo.phaseId ? { id: r.wo.phaseId, name: r.phaseName ?? "" } : null,
          feature: r.wo.featureId ? { id: r.wo.featureId, name: r.featureName ?? "" } : null,
          assignees: [], // TODO: resolve assigneeIds to user objects
          deliverableType: r.wo.deliverableType,
          sortOrder: r.wo.sortOrder,
          createdAt: r.wo.createdAt.toISOString(),
          updatedAt: r.wo.updatedAt.toISOString(),
        })),
        nextCursor: hasMore ? items[items.length - 1]!.wo.createdAt.toISOString() : null,
        totalCount: totalRow?.count ?? 0,
      };
    },
  );

  /** POST /api/projects/:projectId/planner/work-orders */
  fastify.post<{ Params: { projectId: string } }>("/:projectId/planner/work-orders", {
    schema: {
      body: z.object({
        title: z.string().min(1),
        phaseId: z.string().uuid().optional(),
        featureId: z.string().uuid().optional(),
        status: z.enum(["backlog", "ready"]).optional(),
        description: z.record(z.string(), z.unknown()).optional(),
        acceptanceCriteria: z.record(z.string(), z.unknown()).optional(),
        outOfScope: z.record(z.string(), z.unknown()).optional(),
        implementationPlan: z.record(z.string(), z.unknown()).optional(),
        assigneeIds: z.array(z.string().uuid()).optional(),
        deliverableType: z.string().optional(),
      }),
    },
  }, async (request, reply) => {
    const db = fastify.db;
    const body = request.body as Record<string, unknown>;

    const [wo] = await db.insert(workOrders).values({
      projectId: request.params.projectId,
      title: body.title as string,
      phaseId: (body.phaseId as string) ?? null,
      featureId: (body.featureId as string) ?? null,
      status: (body.status as string) ?? "backlog",
      description: body.description ?? null,
      acceptanceCriteria: body.acceptanceCriteria ?? null,
      outOfScope: body.outOfScope ?? null,
      implementationPlan: body.implementationPlan ?? null,
      assigneeIds: (body.assigneeIds as string[]) ?? [],
      deliverableType: (body.deliverableType as string) ?? null,
      createdBy: request.user.id,
    }).returning();

    return reply.status(201).send({
      id: wo!.id,
      title: wo!.title,
      status: wo!.status,
      phaseId: wo!.phaseId,
      featureId: wo!.featureId,
      deliverableType: wo!.deliverableType,
      sortOrder: wo!.sortOrder,
      createdAt: wo!.createdAt.toISOString(),
    });
  });

  /** GET /api/projects/:projectId/planner/work-orders/:workOrderId */
  fastify.get<{ Params: { projectId: string; workOrderId: string } }>("/:projectId/planner/work-orders/:workOrderId", async (request) => {
    const db = fastify.db;
    const [row] = await db
      .select({
        wo: workOrders,
        phaseName: phases.name,
        featureName: features.name,
        creatorName: users.name,
      })
      .from(workOrders)
      .leftJoin(phases, eq(workOrders.phaseId, phases.id))
      .leftJoin(features, eq(workOrders.featureId, features.id))
      .leftJoin(users, eq(workOrders.createdBy, users.id))
      .where(and(eq(workOrders.id, request.params.workOrderId), eq(workOrders.projectId, request.params.projectId), isNull(workOrders.deletedAt)))
      .limit(1);
    if (!row) throw new AppError(404, "NOT_FOUND", "Work order not found");

    // Get graph connections
    const woNode = await db
      .select()
      .from(graphNodes)
      .where(and(eq(graphNodes.projectId, request.params.projectId), eq(graphNodes.entityType, "work_order"), eq(graphNodes.entityId, request.params.workOrderId)))
      .limit(1);

    let graphConnections: Array<Record<string, unknown>> = [];
    if (woNode[0]) {
      const edges = await db
        .select({ edge: graphEdges, targetNode: graphNodes })
        .from(graphEdges)
        .innerJoin(graphNodes, eq(graphEdges.targetNodeId, graphNodes.id))
        .where(eq(graphEdges.sourceNodeId, woNode[0].id));

      graphConnections = edges.map((e) => ({
        nodeId: e.targetNode.id,
        entityType: e.targetNode.entityType,
        entityId: e.targetNode.entityId,
        label: e.targetNode.label,
        edgeType: e.edge.edgeType,
      }));
    }

    return {
      id: row.wo.id,
      title: row.wo.title,
      status: row.wo.status,
      phase: row.wo.phaseId ? { id: row.wo.phaseId, name: row.phaseName ?? "" } : null,
      feature: row.wo.featureId ? { id: row.wo.featureId, name: row.featureName ?? "" } : null,
      assignees: [], // TODO: resolve assigneeIds
      description: row.wo.description,
      acceptanceCriteria: row.wo.acceptanceCriteria,
      outOfScope: row.wo.outOfScope,
      implementationPlan: row.wo.implementationPlan,
      deliverableType: row.wo.deliverableType,
      sortOrder: row.wo.sortOrder,
      graphConnections,
      createdBy: row.wo.createdBy ? { id: row.wo.createdBy, name: row.creatorName ?? "" } : null,
      createdAt: row.wo.createdAt.toISOString(),
      updatedAt: row.wo.updatedAt.toISOString(),
    };
  });

  /** PATCH /api/projects/:projectId/planner/work-orders/:workOrderId */
  fastify.patch<{ Params: { projectId: string; workOrderId: string } }>("/:projectId/planner/work-orders/:workOrderId", {
    schema: {
      body: z.object({
        title: z.string().min(1).optional(),
        status: z.string().optional(),
        phaseId: z.string().uuid().nullable().optional(),
        featureId: z.string().uuid().nullable().optional(),
        description: z.record(z.string(), z.unknown()).optional(),
        acceptanceCriteria: z.record(z.string(), z.unknown()).optional(),
        outOfScope: z.record(z.string(), z.unknown()).optional(),
        implementationPlan: z.record(z.string(), z.unknown()).optional(),
        assigneeIds: z.array(z.string().uuid()).optional(),
        deliverableType: z.string().optional(),
        sortOrder: z.number().int().optional(),
      }),
    },
  }, async (request) => {
    const db = fastify.db;
    const body = request.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    for (const key of ["title", "status", "phaseId", "featureId", "description", "acceptanceCriteria", "outOfScope", "implementationPlan", "assigneeIds", "deliverableType", "sortOrder"]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const [updated] = await db
      .update(workOrders)
      .set(updates)
      .where(and(eq(workOrders.id, request.params.workOrderId), eq(workOrders.projectId, request.params.projectId), isNull(workOrders.deletedAt)))
      .returning();
    if (!updated) throw new AppError(404, "NOT_FOUND", "Work order not found");

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      phaseId: updated.phaseId,
      featureId: updated.featureId,
      sortOrder: updated.sortOrder,
      updatedAt: updated.updatedAt.toISOString(),
    };
  });

  /** DELETE /api/projects/:projectId/planner/work-orders/:workOrderId */
  fastify.delete<{ Params: { projectId: string; workOrderId: string } }>("/:projectId/planner/work-orders/:workOrderId", async (request, reply) => {
    const db = fastify.db;
    await db
      .update(workOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(workOrders.id, request.params.workOrderId), eq(workOrders.projectId, request.params.projectId)));
    return reply.status(204).send();
  });

  /** POST /api/projects/:projectId/planner/work-orders/bulk */
  fastify.post<{ Params: { projectId: string } }>("/:projectId/planner/work-orders/bulk", {
    schema: {
      body: z.object({
        workOrderIds: z.array(z.string().uuid()),
        updates: z.object({
          status: z.string().optional(),
          phaseId: z.string().uuid().nullable().optional(),
          assigneeIds: z.array(z.string().uuid()).optional(),
          deliverableType: z.string().optional(),
        }),
      }),
    },
  }, async (request) => {
    const db = fastify.db;
    const { workOrderIds, updates: bodyUpdates } = request.body as {
      workOrderIds: string[]; updates: Record<string, unknown>;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(bodyUpdates)) {
      if (v !== undefined) updates[k] = v;
    }

    const updated = await db
      .update(workOrders)
      .set(updates)
      .where(and(inArray(workOrders.id, workOrderIds), eq(workOrders.projectId, request.params.projectId)))
      .returning({ id: workOrders.id, status: workOrders.status, phaseId: workOrders.phaseId });

    return { updatedCount: updated.length, workOrders: updated };
  });

  /** POST /api/projects/:projectId/planner/work-orders/reorder */
  fastify.post<{ Params: { projectId: string } }>("/:projectId/planner/work-orders/reorder", {
    schema: {
      body: z.object({
        workOrderId: z.string().uuid(),
        targetPhaseId: z.string().uuid().nullable(),
        afterWorkOrderId: z.string().uuid().nullable(),
      }),
    },
  }, async (request) => {
    const db = fastify.db;
    const { workOrderId, targetPhaseId, afterWorkOrderId } = request.body as {
      workOrderId: string; targetPhaseId: string | null; afterWorkOrderId: string | null;
    };

    // Get all work orders in the target phase
    const phaseConditions = [eq(workOrders.projectId, request.params.projectId), isNull(workOrders.deletedAt)];
    if (targetPhaseId) phaseConditions.push(eq(workOrders.phaseId, targetPhaseId));
    else phaseConditions.push(isNull(workOrders.phaseId));

    const currentOrders = await db
      .select({ id: workOrders.id, sortOrder: workOrders.sortOrder })
      .from(workOrders)
      .where(and(...phaseConditions))
      .orderBy(workOrders.sortOrder);

    // Calculate new sort order
    let newSortOrder = 0;
    if (afterWorkOrderId) {
      const afterIdx = currentOrders.findIndex((o) => o.id === afterWorkOrderId);
      if (afterIdx >= 0) {
        const afterOrder = currentOrders[afterIdx]!.sortOrder;
        const nextOrder = currentOrders[afterIdx + 1]?.sortOrder;
        newSortOrder = nextOrder !== undefined ? Math.floor((afterOrder + nextOrder) / 2) : afterOrder + 1;
      }
    }

    const [updated] = await db
      .update(workOrders)
      .set({ phaseId: targetPhaseId, sortOrder: newSortOrder, updatedAt: new Date() })
      .where(eq(workOrders.id, workOrderId))
      .returning({ id: workOrders.id, sortOrder: workOrders.sortOrder, phaseId: workOrders.phaseId });

    return { updatedOrders: updated ? [updated] : [] };
  });

  // ── Comments ──

  /** GET /api/projects/:projectId/planner/work-orders/:workOrderId/comments */
  fastify.get<{ Params: { projectId: string; workOrderId: string } }>("/:projectId/planner/work-orders/:workOrderId/comments", async (request) => {
    const db = fastify.db;
    const rows = await db
      .select({ comment: comments, creatorName: users.name })
      .from(comments)
      .leftJoin(users, eq(comments.createdBy, users.id))
      .where(and(
        eq(comments.parentType, "work_order"),
        eq(comments.parentId, request.params.workOrderId),
        isNull(comments.deletedAt),
      ))
      .orderBy(comments.createdAt);

    // Build threaded tree
    type CommentNode = typeof rows[number] & { replies: CommentNode[] };
    const nodeMap = new Map<string, CommentNode>();
    const roots: CommentNode[] = [];

    for (const row of rows) {
      nodeMap.set(row.comment.id, { ...row, replies: [] });
    }
    for (const node of nodeMap.values()) {
      if (node.comment.threadId && nodeMap.has(node.comment.threadId)) {
        nodeMap.get(node.comment.threadId)!.replies.push(node);
      } else {
        roots.push(node);
      }
    }

    function mapComment(node: CommentNode): Record<string, unknown> {
      return {
        id: node.comment.id,
        content: node.comment.content,
        threadId: node.comment.threadId,
        isAgent: node.comment.isAgent,
        agentType: node.comment.agentType,
        resolved: node.comment.resolved,
        createdBy: node.comment.createdBy ? { id: node.comment.createdBy, name: node.creatorName ?? "" } : null,
        createdAt: node.comment.createdAt.toISOString(),
        replies: node.replies.map(mapComment),
      };
    }

    return { comments: roots.map(mapComment) };
  });

  /** POST /api/projects/:projectId/planner/work-orders/:workOrderId/comments */
  fastify.post<{ Params: { projectId: string; workOrderId: string } }>("/:projectId/planner/work-orders/:workOrderId/comments", {
    schema: {
      body: z.object({
        content: z.record(z.string(), z.unknown()),
        threadId: z.string().uuid().optional(),
      }),
    },
  }, async (request, reply) => {
    const db = fastify.db;
    const { content, threadId } = request.body as { content: Record<string, unknown>; threadId?: string };

    const [comment] = await db.insert(comments).values({
      projectId: request.params.projectId,
      parentType: "work_order",
      parentId: request.params.workOrderId,
      threadId: threadId ?? null,
      content,
      createdBy: request.user.id,
    }).returning();

    return reply.status(201).send({
      id: comment!.id,
      content: comment!.content,
      threadId: comment!.threadId,
      createdAt: comment!.createdAt.toISOString(),
    });
  });

  // ── Work Order Activity ──

  /** GET /api/projects/:projectId/planner/work-orders/:workOrderId/activity */
  fastify.get<{ Params: { projectId: string; workOrderId: string }; Querystring: { cursor?: string; limit?: string } }>(
    "/:projectId/planner/work-orders/:workOrderId/activity",
    async (request) => {
      const db = fastify.db;
      const limit = Math.min(parseInt(request.query.limit ?? "30", 10), 100);

      const conditions = [
        eq(activities.projectId, request.params.projectId),
        eq(activities.entityType, "work_order"),
        eq(activities.entityId, request.params.workOrderId),
      ];
      if (request.query.cursor) conditions.push(lt(activities.createdAt, new Date(request.query.cursor)));

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
          action: a.action,
          changes: a.changes,
          actor: { id: a.actorId, name: "", type: a.actorType },
          createdAt: a.createdAt.toISOString(),
        })),
        nextCursor: hasMore ? items[items.length - 1]!.createdAt.toISOString() : null,
      };
    },
  );
};

export default plannerRoutes;
