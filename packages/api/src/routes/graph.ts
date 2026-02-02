// SPDX-License-Identifier: AGPL-3.0-only
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, sql, lt, count } from "drizzle-orm";
import { graphNodes, graphEdges, driftAlerts } from "../db/schema/graph";
import { requireAuth } from "../plugins/auth";
import { AppError } from "../plugins/error-handler";

const graphRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  /** GET /api/projects/:projectId/graph/nodes */
  fastify.get<{ Params: { projectId: string }; Querystring: { entityType?: string; search?: string; limit?: string } }>(
    "/:projectId/graph/nodes",
    async (request) => {
      const db = fastify.db;
      const { entityType, search, limit: limitStr } = request.query;
      const limit = Math.min(parseInt(limitStr ?? "100", 10), 500);

      const conditions = [eq(graphNodes.projectId, request.params.projectId)];
      if (entityType) conditions.push(eq(graphNodes.entityType, entityType));
      if (search) conditions.push(sql`${graphNodes.label} ILIKE ${"%" + search + "%"}`);

      const nodes = await db.select().from(graphNodes).where(and(...conditions)).limit(limit);

      // Get edge counts
      const nodeIds = nodes.map((n) => n.id);
      let edgeCounts: { nodeId: string; count: number }[] = [];
      if (nodeIds.length > 0) {
        const outgoing = await db
          .select({ nodeId: graphEdges.sourceNodeId, count: count() })
          .from(graphEdges)
          .where(sql`${graphEdges.sourceNodeId} = ANY(${nodeIds})`)
          .groupBy(graphEdges.sourceNodeId);
        const incoming = await db
          .select({ nodeId: graphEdges.targetNodeId, count: count() })
          .from(graphEdges)
          .where(sql`${graphEdges.targetNodeId} = ANY(${nodeIds})`)
          .groupBy(graphEdges.targetNodeId);

        const countMap = new Map<string, number>();
        for (const r of outgoing) countMap.set(r.nodeId, (countMap.get(r.nodeId) ?? 0) + r.count);
        for (const r of incoming) countMap.set(r.nodeId, (countMap.get(r.nodeId) ?? 0) + r.count);
        edgeCounts = [...countMap.entries()].map(([nodeId, count]) => ({ nodeId, count }));
      }
      const countMap = new Map(edgeCounts.map((r) => [r.nodeId, r.count]));

      return {
        nodes: nodes.map((n) => ({
          id: n.id,
          entityType: n.entityType,
          entityId: n.entityId,
          label: n.label,
          metadata: n.metadata,
          contentHash: n.contentHash,
          lastSyncedAt: n.lastSyncedAt?.toISOString() ?? null,
          edgeCount: countMap.get(n.id) ?? 0,
        })),
      };
    },
  );

  /** GET /api/projects/:projectId/graph/nodes/:nodeId */
  fastify.get<{ Params: { projectId: string; nodeId: string } }>("/:projectId/graph/nodes/:nodeId", async (request) => {
    const db = fastify.db;
    const [node] = await db.select().from(graphNodes).where(eq(graphNodes.id, request.params.nodeId)).limit(1);
    if (!node) throw new AppError(404, "NOT_FOUND", "Node not found");

    const outgoing = await db
      .select({ edge: graphEdges, target: graphNodes })
      .from(graphEdges)
      .innerJoin(graphNodes, eq(graphEdges.targetNodeId, graphNodes.id))
      .where(eq(graphEdges.sourceNodeId, node.id));

    const incoming = await db
      .select({ edge: graphEdges, source: graphNodes })
      .from(graphEdges)
      .innerJoin(graphNodes, eq(graphEdges.sourceNodeId, graphNodes.id))
      .where(eq(graphEdges.targetNodeId, node.id));

    return {
      node: {
        id: node.id,
        entityType: node.entityType,
        entityId: node.entityId,
        label: node.label,
        metadata: node.metadata,
        contentHash: node.contentHash,
        lastSyncedAt: node.lastSyncedAt?.toISOString() ?? null,
      },
      outgoingEdges: outgoing.map((r) => ({
        id: r.edge.id,
        edgeType: r.edge.edgeType,
        targetNode: { id: r.target.id, entityType: r.target.entityType, entityId: r.target.entityId, label: r.target.label },
        metadata: r.edge.metadata,
      })),
      incomingEdges: incoming.map((r) => ({
        id: r.edge.id,
        edgeType: r.edge.edgeType,
        sourceNode: { id: r.source.id, entityType: r.source.entityType, entityId: r.source.entityId, label: r.source.label },
        metadata: r.edge.metadata,
      })),
    };
  });

  /** GET /api/projects/:projectId/graph/edges */
  fastify.get<{ Params: { projectId: string }; Querystring: { edgeType?: string; sourceNodeId?: string; targetNodeId?: string } }>(
    "/:projectId/graph/edges",
    async (request) => {
      const db = fastify.db;
      const { edgeType, sourceNodeId, targetNodeId } = request.query;

      const conditions = [eq(graphEdges.projectId, request.params.projectId)];
      if (edgeType) conditions.push(eq(graphEdges.edgeType, edgeType));
      if (sourceNodeId) conditions.push(eq(graphEdges.sourceNodeId, sourceNodeId));
      if (targetNodeId) conditions.push(eq(graphEdges.targetNodeId, targetNodeId));

      const rows = await db
        .select({ edge: graphEdges, sourceNode: graphNodes })
        .from(graphEdges)
        .innerJoin(graphNodes, eq(graphEdges.sourceNodeId, graphNodes.id))
        .where(and(...conditions));

      // Need target node info too - fetch separately
      const targetIds = [...new Set(rows.map((r) => r.edge.targetNodeId))];
      const targets = targetIds.length > 0
        ? await db.select().from(graphNodes).where(sql`${graphNodes.id} = ANY(${targetIds})`)
        : [];
      const targetMap = new Map(targets.map((t) => [t.id, t]));

      return {
        edges: rows.map((r) => {
          const target = targetMap.get(r.edge.targetNodeId);
          return {
            id: r.edge.id,
            edgeType: r.edge.edgeType,
            sourceNode: { id: r.sourceNode.id, entityType: r.sourceNode.entityType, label: r.sourceNode.label },
            targetNode: { id: r.edge.targetNodeId, entityType: target?.entityType ?? "", label: target?.label ?? "" },
            metadata: r.edge.metadata,
            createdAt: r.edge.createdAt.toISOString(),
          };
        }),
      };
    },
  );

  /** POST /api/projects/:projectId/graph/edges */
  fastify.post<{ Params: { projectId: string } }>("/:projectId/graph/edges", {
    schema: {
      body: z.object({
        sourceNodeId: z.string().uuid(),
        targetNodeId: z.string().uuid(),
        edgeType: z.enum(["derives_from", "shared_context", "implements", "feedback_on", "references", "blocks", "related_to"]),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    },
  }, async (request, reply) => {
    const db = fastify.db;
    const { sourceNodeId, targetNodeId, edgeType, metadata } = request.body as {
      sourceNodeId: string; targetNodeId: string; edgeType: string; metadata?: Record<string, unknown>;
    };

    // Verify nodes exist
    const [source] = await db.select().from(graphNodes).where(eq(graphNodes.id, sourceNodeId)).limit(1);
    const [target] = await db.select().from(graphNodes).where(eq(graphNodes.id, targetNodeId)).limit(1);
    if (!source) throw new AppError(404, "NOT_FOUND", "Source node not found");
    if (!target) throw new AppError(404, "NOT_FOUND", "Target node not found");

    const [edge] = await db.insert(graphEdges).values({
      projectId: request.params.projectId,
      sourceNodeId,
      targetNodeId,
      edgeType,
      metadata: metadata ?? {},
    }).returning();

    return reply.status(201).send({
      id: edge!.id,
      edgeType: edge!.edgeType,
      sourceNodeId: edge!.sourceNodeId,
      targetNodeId: edge!.targetNodeId,
      metadata: edge!.metadata,
      createdAt: edge!.createdAt.toISOString(),
    });
  });

  /** DELETE /api/projects/:projectId/graph/edges/:edgeId */
  fastify.delete<{ Params: { projectId: string; edgeId: string } }>("/:projectId/graph/edges/:edgeId", async (request, reply) => {
    const db = fastify.db;
    const [deleted] = await db
      .delete(graphEdges)
      .where(and(eq(graphEdges.id, request.params.edgeId), eq(graphEdges.projectId, request.params.projectId)))
      .returning();
    if (!deleted) throw new AppError(404, "NOT_FOUND", "Edge not found");
    return reply.status(204).send();
  });

  /** GET /api/projects/:projectId/graph/traverse */
  fastify.get<{ Params: { projectId: string }; Querystring: { startNodeId: string; direction?: string; maxDepth?: string; edgeTypes?: string } }>(
    "/:projectId/graph/traverse",
    async (request) => {
      const db = fastify.db;
      const { startNodeId, direction = "outgoing", maxDepth: maxDepthStr = "3" } = request.query;
      const maxDepth = Math.min(parseInt(maxDepthStr, 10), 10);

      // Simple BFS traversal
      const visited = new Set<string>();
      const resultNodes: Array<{ id: string; entityType: string; entityId: string; label: string; depth: number }> = [];
      const resultEdges: Array<{ id: string; edgeType: string; sourceNodeId: string; targetNodeId: string }> = [];

      let frontier = [startNodeId];
      visited.add(startNodeId);

      for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
        const nextFrontier: string[] = [];

        for (const nodeId of frontier) {
          let edges: Array<{ edge: typeof graphEdges.$inferSelect; node: typeof graphNodes.$inferSelect }> = [];

          if (direction === "outgoing" || direction === "both") {
            const out = await db
              .select({ edge: graphEdges, node: graphNodes })
              .from(graphEdges)
              .innerJoin(graphNodes, eq(graphEdges.targetNodeId, graphNodes.id))
              .where(eq(graphEdges.sourceNodeId, nodeId));
            edges.push(...out);
          }
          if (direction === "incoming" || direction === "both") {
            const inc = await db
              .select({ edge: graphEdges, node: graphNodes })
              .from(graphEdges)
              .innerJoin(graphNodes, eq(graphEdges.sourceNodeId, graphNodes.id))
              .where(eq(graphEdges.targetNodeId, nodeId));
            edges.push(...inc);
          }

          for (const { edge, node } of edges) {
            resultEdges.push({
              id: edge.id,
              edgeType: edge.edgeType,
              sourceNodeId: edge.sourceNodeId,
              targetNodeId: edge.targetNodeId,
            });

            if (!visited.has(node.id)) {
              visited.add(node.id);
              nextFrontier.push(node.id);
              resultNodes.push({
                id: node.id,
                entityType: node.entityType,
                entityId: node.entityId,
                label: node.label,
                depth: depth + 1,
              });
            }
          }
        }

        frontier = nextFrontier;
      }

      return { nodes: resultNodes, edges: resultEdges };
    },
  );

  /** GET /api/projects/:projectId/graph/impact */
  fastify.get<{ Params: { projectId: string }; Querystring: { nodeId: string } }>(
    "/:projectId/graph/impact",
    async (request) => {
      const db = fastify.db;
      const { nodeId } = request.query;

      // Find downstream nodes via outgoing edges
      const visited = new Set<string>([nodeId]);
      const impacted: Array<{
        id: string; entityType: string; entityId: string; label: string;
        impactPath: Array<{ edgeType: string; nodeLabel: string }>;
        severity: "direct" | "indirect";
      }> = [];

      let frontier = [{ id: nodeId, path: [] as Array<{ edgeType: string; nodeLabel: string }> }];

      for (let depth = 0; depth < 5 && frontier.length > 0; depth++) {
        const nextFrontier: typeof frontier = [];

        for (const { id, path } of frontier) {
          const edges = await db
            .select({ edge: graphEdges, target: graphNodes })
            .from(graphEdges)
            .innerJoin(graphNodes, eq(graphEdges.targetNodeId, graphNodes.id))
            .where(eq(graphEdges.sourceNodeId, id));

          for (const { edge, target } of edges) {
            if (visited.has(target.id)) continue;
            visited.add(target.id);

            const newPath = [...path, { edgeType: edge.edgeType, nodeLabel: target.label }];
            impacted.push({
              id: target.id,
              entityType: target.entityType,
              entityId: target.entityId,
              label: target.label,
              impactPath: newPath,
              severity: depth === 0 ? "direct" : "indirect",
            });
            nextFrontier.push({ id: target.id, path: newPath });
          }
        }

        frontier = nextFrontier;
      }

      return { impactedNodes: impacted };
    },
  );

  // ── Drift Alerts ──

  /** GET /api/projects/:projectId/graph/drift-alerts */
  fastify.get<{ Params: { projectId: string }; Querystring: { status?: string; driftType?: string; severity?: string; cursor?: string; limit?: string } }>(
    "/:projectId/graph/drift-alerts",
    async (request) => {
      const db = fastify.db;
      const { status, driftType, severity, cursor, limit: limitStr } = request.query;
      const limit = Math.min(parseInt(limitStr ?? "20", 10), 100);

      const conditions = [eq(driftAlerts.projectId, request.params.projectId)];
      if (status) conditions.push(eq(driftAlerts.status, status));
      if (driftType) conditions.push(eq(driftAlerts.driftType, driftType));
      if (severity) conditions.push(eq(driftAlerts.severity, severity));
      if (cursor) conditions.push(lt(driftAlerts.createdAt, new Date(cursor)));

      const rows = await db
        .select({ alert: driftAlerts, sourceNode: graphNodes })
        .from(driftAlerts)
        .leftJoin(graphNodes, eq(driftAlerts.sourceNodeId, graphNodes.id))
        .where(and(...conditions))
        .orderBy(sql`${driftAlerts.createdAt} DESC`)
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        alerts: items.map((r) => ({
          id: r.alert.id,
          driftType: r.alert.driftType,
          description: r.alert.description,
          severity: r.alert.severity,
          status: r.alert.status,
          sourceNode: { id: r.alert.sourceNodeId, entityType: r.sourceNode?.entityType ?? "", label: r.sourceNode?.label ?? "" },
          targetNode: r.alert.targetNodeId ? { id: r.alert.targetNodeId, entityType: "", label: "" } : null,
          createdAt: r.alert.createdAt.toISOString(),
          updatedAt: r.alert.updatedAt.toISOString(),
        })),
        nextCursor: hasMore ? items[items.length - 1]!.alert.createdAt.toISOString() : null,
      };
    },
  );

  /** PATCH /api/projects/:projectId/graph/drift-alerts/:alertId */
  fastify.patch<{ Params: { projectId: string; alertId: string } }>("/:projectId/graph/drift-alerts/:alertId", {
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

export default graphRoutes;
