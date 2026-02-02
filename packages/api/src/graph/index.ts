/**
 * OpenFactory - Knowledge Graph Service
 * SPDX-License-Identifier: AGPL-3.0
 *
 * The knowledge graph is the connective tissue of the platform.
 * It tracks relationships between all project entities and propagates
 * changes to detect drift.
 */

import { createHash } from 'node:crypto';
// Types from shared schemas
type GraphEntityType = "document" | "work_order" | "feature" | "feedback_item" | "artifact" | "codebase_file";
type GraphEdgeType = "derives_from" | "shared_context" | "implements" | "feedback_on" | "parent_of" | "references" | "blocks" | "related_to";
type DriftType = "code_drift" | "requirements_drift" | "foundation_drift" | "work_order_drift";
type DriftSeverity = "low" | "medium" | "high";

// Internal graph service types
export interface GraphNode {
  id: string;
  projectId: string;
  entityType: string;
  entityId: string;
  label: string;
  metadata: Record<string, unknown>;
  contentHash: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdge {
  id: string;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DriftAlert {
  id: string;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  driftType: DriftType;
  description: string;
  severity: DriftSeverity;
  status: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TraversalLayer {
  depth: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface TraversalResult {
  rootNode: GraphNode;
  layers: TraversalLayer[];
}

export interface PropagationEvent {
  changedNode: GraphNode;
  affectedNodes: { node: GraphNode; edge: GraphEdge; depth: number }[];
  alerts: DriftAlert[];
}

// ---------------------------------------------------------------------------
// Repository Interface
// ---------------------------------------------------------------------------

export interface GraphRepository {
  findNode(projectId: string, entityType: string, entityId: string): Promise<GraphNode | null>;
  createNode(node: Omit<GraphNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<GraphNode>;
  updateNode(nodeId: string, updates: Partial<GraphNode>): Promise<GraphNode>;
  deleteNode(nodeId: string): Promise<void>;
  listNodes(projectId: string, entityType?: string): Promise<GraphNode[]>;

  createEdge(edge: Omit<GraphEdge, 'id' | 'createdAt'>): Promise<GraphEdge>;
  deleteEdge(edgeId: string): Promise<void>;
  findEdges(params: {
    projectId: string;
    sourceNodeId?: string;
    targetNodeId?: string;
    edgeType?: string;
  }): Promise<GraphEdge[]>;

  traverse(
    nodeId: string,
    direction: 'upstream' | 'downstream' | 'both',
    maxDepth: number
  ): Promise<TraversalResult>;

  createDriftAlert(alert: Omit<DriftAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<DriftAlert>;
  listDriftAlerts(projectId: string, params?: { status?: string; driftType?: string }): Promise<DriftAlert[]>;
  updateDriftAlert(alertId: string, updates: Partial<DriftAlert>): Promise<DriftAlert>;
}

// ---------------------------------------------------------------------------
// Graph Service
// ---------------------------------------------------------------------------

export class GraphService {
  constructor(private readonly repo: GraphRepository) {}

  async ensureNode(
    projectId: string,
    entityType: GraphEntityType,
    entityId: string,
    label: string,
    content: string
  ): Promise<GraphNode> {
    const contentHash = hashContent(content);
    const existing = await this.repo.findNode(projectId, entityType, entityId);

    if (existing) {
      if (existing.contentHash !== contentHash || existing.label !== label) {
        return this.repo.updateNode(existing.id, {
          label,
          contentHash,
          lastSyncedAt: new Date().toISOString(),
        });
      }
      return existing;
    }

    return this.repo.createNode({
      projectId,
      entityType,
      entityId,
      label,
      metadata: {},
      contentHash,
      lastSyncedAt: new Date().toISOString(),
    });
  }

  async removeNode(projectId: string, entityType: GraphEntityType, entityId: string): Promise<void> {
    const node = await this.repo.findNode(projectId, entityType, entityId);
    if (node) await this.repo.deleteNode(node.id);
  }

  async connect(
    projectId: string,
    source: { entityType: GraphEntityType; entityId: string },
    target: { entityType: GraphEntityType; entityId: string },
    edgeType: GraphEdgeType,
    metadata?: Record<string, unknown>
  ): Promise<GraphEdge> {
    const sourceNode = await this.repo.findNode(projectId, source.entityType, source.entityId);
    const targetNode = await this.repo.findNode(projectId, target.entityType, target.entityId);

    if (!sourceNode || !targetNode) {
      throw new Error(`Cannot create edge: source or target node not found`);
    }

    return this.repo.createEdge({
      projectId,
      sourceNodeId: sourceNode.id,
      targetNodeId: targetNode.id,
      edgeType,
      metadata: metadata ?? {},
    });
  }

  async disconnect(projectId: string, sourceNodeId: string, targetNodeId: string, edgeType: GraphEdgeType): Promise<void> {
    const edges = await this.repo.findEdges({ projectId, sourceNodeId, targetNodeId, edgeType });
    for (const edge of edges) await this.repo.deleteEdge(edge.id);
  }

  /**
   * Called when a node's content changes. Traverses downstream and generates drift alerts.
   */
  async propagateChange(
    projectId: string,
    entityType: GraphEntityType,
    entityId: string,
    newContent: string
  ): Promise<PropagationEvent> {
    const newHash = hashContent(newContent);
    const node = await this.repo.findNode(projectId, entityType, entityId);
    if (!node) throw new Error(`Node not found: ${entityType}:${entityId}`);

    if (node.contentHash === newHash) {
      return { changedNode: node, affectedNodes: [], alerts: [] };
    }

    const updatedNode = await this.repo.updateNode(node.id, {
      contentHash: newHash,
      lastSyncedAt: new Date().toISOString(),
    });

    const traversal = await this.repo.traverse(node.id, 'downstream', 3);
    const affectedNodes: PropagationEvent['affectedNodes'] = [];
    const alerts: DriftAlert[] = [];

    for (const layer of traversal.layers) {
      for (let i = 0; i < layer.nodes.length; i++) {
        const affectedNode = layer.nodes[i];
        const edge = layer.edges[i];

        affectedNodes.push({ node: affectedNode, edge, depth: layer.depth });

        const driftType = determineDriftType(entityType, affectedNode.entityType as GraphEntityType, edge.edgeType as GraphEdgeType);
        if (!driftType) continue;

        const alert = await this.repo.createDriftAlert({
          projectId,
          sourceNodeId: updatedNode.id,
          targetNodeId: affectedNode.id,
          driftType,
          description: buildDriftDescription(updatedNode, affectedNode, driftType),
          severity: determineSeverity(layer.depth),
          status: 'open',
          resolvedAt: null,
          resolvedBy: null,
        });
        alerts.push(alert);
      }
    }

    return { changedNode: updatedNode, affectedNodes, alerts };
  }

  async detectDrift(projectId: string): Promise<DriftAlert[]> {
    const alerts: DriftAlert[] = [];
    const nodes = await this.repo.listNodes(projectId);

    for (const node of nodes) {
      const edges = await this.repo.findEdges({ projectId, sourceNodeId: node.id });

      for (const edge of edges) {
        const targetNode = nodes.find((n) => n.id === edge.targetNodeId);
        if (!targetNode) continue;

        if (node.lastSyncedAt && targetNode.lastSyncedAt && node.lastSyncedAt > targetNode.lastSyncedAt) {
          const driftType = determineDriftType(
            node.entityType as GraphEntityType,
            targetNode.entityType as GraphEntityType,
            edge.edgeType as GraphEdgeType
          );
          if (!driftType) continue;

          const alert = await this.repo.createDriftAlert({
            projectId,
            sourceNodeId: node.id,
            targetNodeId: targetNode.id,
            driftType,
            description: buildDriftDescription(node, targetNode, driftType),
            severity: 'medium',
            status: 'open',
            resolvedAt: null,
            resolvedBy: null,
          });
          alerts.push(alert);
        }
      }
    }

    return alerts;
  }

  async getContext(
    projectId: string,
    entityType: GraphEntityType,
    entityId: string,
    direction: 'upstream' | 'downstream' | 'both' = 'both',
    maxDepth: number = 2
  ): Promise<TraversalResult | null> {
    const node = await this.repo.findNode(projectId, entityType, entityId);
    if (!node) return null;
    return this.repo.traverse(node.id, direction, maxDepth);
  }

  async getRelated(
    projectId: string,
    entityType: GraphEntityType,
    entityId: string
  ): Promise<{ node: GraphNode; edge: GraphEdge; direction: 'source' | 'target' }[]> {
    const node = await this.repo.findNode(projectId, entityType, entityId);
    if (!node) return [];

    const outgoing = await this.repo.findEdges({ projectId, sourceNodeId: node.id });
    const incoming = await this.repo.findEdges({ projectId, targetNodeId: node.id });

    const allNodes = await this.repo.listNodes(projectId);
    const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

    const results: { node: GraphNode; edge: GraphEdge; direction: 'source' | 'target' }[] = [];
    for (const edge of outgoing) {
      const related = nodeMap.get(edge.targetNodeId);
      if (related) results.push({ node: related, edge, direction: 'target' });
    }
    for (const edge of incoming) {
      const related = nodeMap.get(edge.sourceNodeId);
      if (related) results.push({ node: related, edge, direction: 'source' });
    }
    return results;
  }

  async getDriftAlerts(projectId: string, params?: { status?: string; driftType?: string }): Promise<DriftAlert[]> {
    return this.repo.listDriftAlerts(projectId, params);
  }

  async resolveDriftAlert(alertId: string, userId: string, status: 'resolved' | 'dismissed' = 'resolved'): Promise<DriftAlert> {
    return this.repo.updateDriftAlert(alertId, {
      status,
      resolvedAt: new Date().toISOString(),
      resolvedBy: userId,
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function determineDriftType(
  sourceEntityType: GraphEntityType,
  targetEntityType: GraphEntityType,
  edgeType: GraphEdgeType
): DriftType | null {
  if (sourceEntityType === 'codebase_file' && edgeType === 'implements') return 'code_drift';
  if (sourceEntityType === 'document' && targetEntityType === 'document' && edgeType === 'derives_from') return 'requirements_drift';
  if (edgeType === 'shared_context') return 'foundation_drift';
  if (sourceEntityType === 'document' && targetEntityType === 'work_order' && edgeType === 'derives_from') return 'work_order_drift';
  return null;
}

function determineSeverity(depth: number): DriftSeverity {
  if (depth === 1) return 'high';
  if (depth === 2) return 'medium';
  return 'low';
}

function buildDriftDescription(source: GraphNode, target: GraphNode, driftType: DriftType): string {
  const descriptions: Record<DriftType, string> = {
    code_drift: `Code changes in "${source.label}" may invalidate blueprint "${target.label}".`,
    requirements_drift: `Requirements "${source.label}" updated. Blueprint "${target.label}" may need updates.`,
    foundation_drift: `Foundation "${source.label}" updated. Feature blueprint "${target.label}" may need updates.`,
    work_order_drift: `Blueprint "${source.label}" updated. Work order "${target.label}" may need revision.`,
  };
  return descriptions[driftType];
}
