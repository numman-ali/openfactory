// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Real database-backed implementations for agent tool functions.
 */

import { eq, and, isNull, ilike, sql, desc, inArray } from "drizzle-orm";
import { documents, features } from "../db/schema/projects.js";
import { artifacts } from "../db/schema/artifacts.js";
import { graphNodes, graphEdges, driftAlerts } from "../db/schema/graph.js";
import { workOrders } from "../db/schema/planner.js";
import { feedbackItems } from "../db/schema/feedback.js";
import { agentSuggestions } from "../db/schema/agents.js";
import { codebaseFiles, codeChunks, codebaseConnections } from "../db/schema/integrations.js";
import type { Database } from "../db/connection.js";
import type { ToolContext } from "./tools/index.js";

export function createToolContext(db: Database, projectId: string, userId: string): ToolContext {
  return {
    projectId,
    userId,

    async readDocument(documentId: string) {
      const [doc] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.projectId, projectId), isNull(documents.deletedAt)))
        .limit(1);
      if (!doc) return { error: "Document not found" };
      return { id: doc.id, type: doc.type, title: doc.title, content: doc.content, updatedAt: doc.updatedAt.toISOString() };
    },

    async searchDocuments(params: { query: string; documentType?: string; limit?: number }) {
      const conditions = [eq(documents.projectId, projectId), isNull(documents.deletedAt)];
      if (params.documentType) conditions.push(eq(documents.type, params.documentType));
      conditions.push(ilike(documents.title, `%${params.query}%`));

      const rows = await db
        .select({ id: documents.id, type: documents.type, title: documents.title, slug: documents.slug, updatedAt: documents.updatedAt })
        .from(documents)
        .where(and(...conditions))
        .limit(params.limit ?? 5);

      return { documents: rows.map((r) => ({ id: r.id, type: r.type, title: r.title, slug: r.slug, updatedAt: r.updatedAt.toISOString() })) };
    },

    async listDocuments(params: { type?: string }) {
      const conditions = [eq(documents.projectId, projectId), isNull(documents.deletedAt)];
      if (params.type) conditions.push(eq(documents.type, params.type));

      const rows = await db
        .select({ id: documents.id, type: documents.type, title: documents.title, slug: documents.slug, featureId: documents.featureId, updatedAt: documents.updatedAt })
        .from(documents)
        .where(and(...conditions))
        .orderBy(documents.sortOrder);

      return { documents: rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })) };
    },

    async suggestEdits(params: { documentId: string; diffs: Array<{ sectionPath?: string; operation: string; oldContent?: string; newContent?: string; explanation?: string }>; summary: string }) {
      const [suggestion] = await db.insert(agentSuggestions).values({
        projectId,
        documentId: params.documentId,
        agentType: "refinery",
        diffs: params.diffs,
        status: "pending",
      }).returning();
      return { suggestionId: suggestion!.id, status: "pending", summary: params.summary };
    },

    async searchCode(params: { query: string; language?: string; limit?: number }) {
      const [conn] = await db
        .select()
        .from(codebaseConnections)
        .where(eq(codebaseConnections.projectId, projectId))
        .limit(1);
      if (!conn) return { error: "No codebase connected to this project" };

      const conditions = [eq(codebaseFiles.connectionId, conn.id)];
      if (params.language) conditions.push(eq(codebaseFiles.language, params.language));

      const rows = await db
        .select({ fileId: codebaseFiles.id, filePath: codebaseFiles.filePath, language: codebaseFiles.language, chunkName: codeChunks.name, chunkType: codeChunks.chunkType, content: codeChunks.content, startLine: codeChunks.startLine, endLine: codeChunks.endLine })
        .from(codeChunks)
        .innerJoin(codebaseFiles, eq(codeChunks.fileId, codebaseFiles.id))
        .where(and(...conditions, ilike(codeChunks.content, `%${params.query}%`)))
        .limit(params.limit ?? 5);

      return { results: rows.map((r) => ({ filePath: r.filePath, language: r.language, name: r.chunkName, type: r.chunkType, startLine: r.startLine, endLine: r.endLine, snippet: r.content.slice(0, 500) })) };
    },

    async readCodeFile(filePath: string) {
      const [conn] = await db
        .select()
        .from(codebaseConnections)
        .where(eq(codebaseConnections.projectId, projectId))
        .limit(1);
      if (!conn) return { error: "No codebase connected to this project" };

      const [file] = await db
        .select()
        .from(codebaseFiles)
        .where(and(eq(codebaseFiles.connectionId, conn.id), eq(codebaseFiles.filePath, filePath)))
        .limit(1);
      if (!file) return { error: `File not found: ${filePath}` };

      const chunks = await db
        .select()
        .from(codeChunks)
        .where(eq(codeChunks.fileId, file.id))
        .orderBy(codeChunks.startLine);

      return { filePath: file.filePath, language: file.language, chunks: chunks.map((c) => ({ type: c.chunkType, name: c.name, startLine: c.startLine, endLine: c.endLine, content: c.content })) };
    },

    async queryGraph(params: { entityType: string; entityId: string; direction?: string; maxDepth?: number }) {
      const [node] = await db
        .select()
        .from(graphNodes)
        .where(and(eq(graphNodes.projectId, projectId), eq(graphNodes.entityType, params.entityType), eq(graphNodes.entityId, params.entityId)))
        .limit(1);
      if (!node) return { error: "Entity not found in graph" };

      const direction = params.direction ?? "both";
      const edgeConditions = [eq(graphEdges.projectId, projectId)];
      if (direction === "downstream" || direction === "both") {
        edgeConditions.push(eq(graphEdges.sourceNodeId, node.id));
      }

      const edges = direction === "both"
        ? await db.select().from(graphEdges).where(and(eq(graphEdges.projectId, projectId), sql`(${graphEdges.sourceNodeId} = ${node.id} OR ${graphEdges.targetNodeId} = ${node.id})`))
        : direction === "downstream"
          ? await db.select().from(graphEdges).where(and(eq(graphEdges.projectId, projectId), eq(graphEdges.sourceNodeId, node.id)))
          : await db.select().from(graphEdges).where(and(eq(graphEdges.projectId, projectId), eq(graphEdges.targetNodeId, node.id)));

      const relatedNodeIds = new Set<string>();
      for (const edge of edges) {
        relatedNodeIds.add(edge.sourceNodeId);
        relatedNodeIds.add(edge.targetNodeId);
      }
      relatedNodeIds.delete(node.id);

      const relatedNodes = relatedNodeIds.size > 0
        ? await db.select().from(graphNodes).where(inArray(graphNodes.id, [...relatedNodeIds]))
        : [];

      return {
        root: { id: node.id, entityType: node.entityType, entityId: node.entityId, label: node.label },
        edges: edges.map((e) => ({ sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId, edgeType: e.edgeType })),
        nodes: relatedNodes.map((n) => ({ id: n.id, entityType: n.entityType, entityId: n.entityId, label: n.label })),
      };
    },

    async getRelatedNodes(params: { entityType: string; entityId: string }) {
      const [node] = await db
        .select()
        .from(graphNodes)
        .where(and(eq(graphNodes.projectId, projectId), eq(graphNodes.entityType, params.entityType), eq(graphNodes.entityId, params.entityId)))
        .limit(1);
      if (!node) return { error: "Entity not found in graph" };

      const edges = await db
        .select()
        .from(graphEdges)
        .where(and(eq(graphEdges.projectId, projectId), sql`(${graphEdges.sourceNodeId} = ${node.id} OR ${graphEdges.targetNodeId} = ${node.id})`));

      const relatedNodeIds = new Set<string>();
      for (const edge of edges) {
        relatedNodeIds.add(edge.sourceNodeId);
        relatedNodeIds.add(edge.targetNodeId);
      }
      relatedNodeIds.delete(node.id);

      const relatedNodes = relatedNodeIds.size > 0
        ? await db.select().from(graphNodes).where(inArray(graphNodes.id, [...relatedNodeIds]))
        : [];

      return {
        nodes: relatedNodes.map((n) => ({
          id: n.id, entityType: n.entityType, entityId: n.entityId, label: n.label,
          relationship: edges.find((e) => e.sourceNodeId === n.id || e.targetNodeId === n.id)?.edgeType ?? "unknown",
        })),
      };
    },

    async getDriftAlerts(params: { status?: string; driftType?: string }) {
      const conditions = [eq(driftAlerts.projectId, projectId)];
      if (params.status) conditions.push(eq(driftAlerts.status, params.status));
      if (params.driftType) conditions.push(eq(driftAlerts.driftType, params.driftType));

      const rows = await db
        .select()
        .from(driftAlerts)
        .where(and(...conditions))
        .orderBy(desc(driftAlerts.createdAt))
        .limit(20);

      return {
        alerts: rows.map((r) => ({
          id: r.id, driftType: r.driftType, description: r.description, severity: r.severity,
          status: r.status, sourceNodeId: r.sourceNodeId, targetNodeId: r.targetNodeId,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    },

    async createFeature(params: { name: string; parentFeatureId?: string }) {
      const slug = params.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const [maxSort] = await db
        .select({ max: sql<number>`COALESCE(MAX(${features.sortOrder}), -1)` })
        .from(features)
        .where(and(eq(features.projectId, projectId), params.parentFeatureId ? eq(features.parentId, params.parentFeatureId) : isNull(features.parentId)));

      const [feature] = await db.insert(features).values({
        projectId,
        parentId: params.parentFeatureId ?? null,
        name: params.name,
        slug,
        sortOrder: (maxSort?.max ?? -1) + 1,
      }).returning();

      return { id: feature!.id, name: feature!.name, slug: feature!.slug };
    },

    async updateFeature(params: { featureId: string; name?: string; parentFeatureId?: string }) {
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (params.name !== undefined) {
        updates.name = params.name;
        updates.slug = params.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }
      if (params.parentFeatureId !== undefined) updates.parentId = params.parentFeatureId;

      const [updated] = await db
        .update(features)
        .set(updates)
        .where(and(eq(features.id, params.featureId), eq(features.projectId, projectId)))
        .returning();
      if (!updated) return { error: "Feature not found" };
      return { id: updated.id, name: updated.name, slug: updated.slug };
    },

    async createWorkOrder(params: { title: string; description?: string; phaseId?: string; featureId?: string; status?: string; acceptanceCriteria?: string }) {
      const [maxSort] = await db
        .select({ max: sql<number>`COALESCE(MAX(${workOrders.sortOrder}), -1)` })
        .from(workOrders)
        .where(eq(workOrders.projectId, projectId));

      const [wo] = await db.insert(workOrders).values({
        projectId,
        title: params.title,
        description: params.description ? { text: params.description } : null,
        phaseId: params.phaseId ?? null,
        featureId: params.featureId ?? null,
        status: params.status ?? "backlog",
        acceptanceCriteria: params.acceptanceCriteria ? { text: params.acceptanceCriteria } : null,
        sortOrder: (maxSort?.max ?? -1) + 1,
        createdBy: userId,
      }).returning();

      return { id: wo!.id, title: wo!.title, status: wo!.status };
    },

    async updateWorkOrder(params: { workOrderId: string; title?: string; description?: string; status?: string; phaseId?: string; implementationPlan?: string }) {
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (params.title !== undefined) updates.title = params.title;
      if (params.description !== undefined) updates.description = { text: params.description };
      if (params.status !== undefined) updates.status = params.status;
      if (params.phaseId !== undefined) updates.phaseId = params.phaseId;
      if (params.implementationPlan !== undefined) updates.implementationPlan = { text: params.implementationPlan };

      const [updated] = await db
        .update(workOrders)
        .set(updates)
        .where(and(eq(workOrders.id, params.workOrderId), eq(workOrders.projectId, projectId)))
        .returning();
      if (!updated) return { error: "Work order not found" };
      return { id: updated.id, title: updated.title, status: updated.status };
    },

    async batchUpdateWorkOrders(params: { updates: Array<{ workOrderId: string; title?: string; status?: string; phaseId?: string }> }) {
      const results = [];
      for (const update of params.updates) {
        const sets: Record<string, unknown> = { updatedAt: new Date() };
        if (update.title !== undefined) sets.title = update.title;
        if (update.status !== undefined) sets.status = update.status;
        if (update.phaseId !== undefined) sets.phaseId = update.phaseId;

        const [updated] = await db
          .update(workOrders)
          .set(sets)
          .where(and(eq(workOrders.id, update.workOrderId), eq(workOrders.projectId, projectId)))
          .returning();

        results.push(updated ? { id: updated.id, title: updated.title, status: updated.status } : { error: `Work order ${update.workOrderId} not found` });
      }
      return { results };
    },

    async listArtifacts(params: { folderId?: string }) {
      const conditions = [eq(artifacts.projectId, projectId), isNull(artifacts.deletedAt)];
      if (params.folderId) conditions.push(eq(artifacts.folderId, params.folderId));

      const rows = await db
        .select({ id: artifacts.id, name: artifacts.name, fileName: artifacts.fileName, mimeType: artifacts.mimeType, fileSize: artifacts.fileSize, processingStatus: artifacts.processingStatus, createdAt: artifacts.createdAt })
        .from(artifacts)
        .where(and(...conditions))
        .orderBy(artifacts.createdAt);

      return { artifacts: rows.map((r) => ({ ...r, fileSize: Number(r.fileSize), createdAt: r.createdAt.toISOString() })) };
    },

    async readArtifact(artifactId: string) {
      const [art] = await db
        .select()
        .from(artifacts)
        .where(and(eq(artifacts.id, artifactId), eq(artifacts.projectId, projectId), isNull(artifacts.deletedAt)))
        .limit(1);
      if (!art) return { error: "Artifact not found" };
      return { id: art.id, name: art.name, fileName: art.fileName, mimeType: art.mimeType, extractedText: art.extractedText, processingStatus: art.processingStatus };
    },

    async listFeedback(params: { status?: string; category?: string; limit?: number }) {
      const conditions = [eq(feedbackItems.projectId, projectId)];
      if (params.status) conditions.push(eq(feedbackItems.status, params.status));
      if (params.category) conditions.push(eq(feedbackItems.category, params.category));

      const rows = await db
        .select()
        .from(feedbackItems)
        .where(and(...conditions))
        .orderBy(desc(feedbackItems.createdAt))
        .limit(params.limit ?? 10);

      return {
        items: rows.map((r) => ({
          id: r.id, title: r.title, description: r.description, category: r.category,
          priorityScore: r.priorityScore, status: r.status, tags: r.tags,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    },

    async categorizeFeedback(params: { feedbackId: string; category: string; priorityScore: number; tags?: string[] }) {
      const updates: Record<string, unknown> = {
        category: params.category,
        priorityScore: params.priorityScore,
        status: "triaged",
        updatedAt: new Date(),
      };
      if (params.tags) updates.tags = params.tags;

      const [updated] = await db
        .update(feedbackItems)
        .set(updates)
        .where(and(eq(feedbackItems.id, params.feedbackId), eq(feedbackItems.projectId, projectId)))
        .returning();
      if (!updated) return { error: "Feedback item not found" };
      return { id: updated.id, category: updated.category, priorityScore: updated.priorityScore, status: updated.status };
    },
  };
}
