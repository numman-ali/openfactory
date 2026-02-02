/**
 * OpenFactory - Drift Detection Engine
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Compares node content hashes to detect staleness across the knowledge graph.
 * Supports code drift, requirements drift, and foundation drift.
 */

import { z } from 'zod';
import type {
  GraphNode,
  GraphEdge,
  GraphEdgeType,
  GraphEntityType,
  DriftType,
  DriftSeverity,
} from '@repo/shared/types/graph';
import type { GraphRepository } from './index.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const DriftReportEntry = z.object({
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  driftType: z.enum(['code_drift', 'requirements_drift', 'foundation_drift', 'work_order_drift']),
  severity: z.enum(['low', 'medium', 'high']),
  description: z.string(),
  suggestedAction: z.string(),
});
export type DriftReportEntry = z.infer<typeof DriftReportEntry>;

export const DriftReport = z.object({
  projectId: z.string().uuid(),
  scannedAt: z.string().datetime(),
  totalNodesScanned: z.number().int().nonnegative(),
  entries: z.array(DriftReportEntry),
});
export type DriftReport = z.infer<typeof DriftReport>;

export const DriftDetectorConfig = z.object({
  /** Only flag drift if the source was synced more than this many seconds after the target. */
  stalenessThresholdSeconds: z.number().int().nonnegative().default(0),
});
export type DriftDetectorConfig = z.infer<typeof DriftDetectorConfig>;

// ---------------------------------------------------------------------------
// Drift Detector
// ---------------------------------------------------------------------------

export class DriftDetector {
  private readonly config: DriftDetectorConfig;

  constructor(
    private readonly repo: GraphRepository,
    config?: Partial<DriftDetectorConfig>,
  ) {
    this.config = DriftDetectorConfig.parse(config ?? {});
  }

  /**
   * Run a full drift scan across all nodes in a project.
   * Compares lastSyncedAt timestamps on connected nodes to find staleness.
   */
  async scanProject(projectId: string): Promise<DriftReport> {
    const nodes = await this.repo.listNodes(projectId);
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const entries: DriftReportEntry[] = [];

    for (const node of nodes) {
      const edges = await this.repo.findEdges({ projectId, sourceNodeId: node.id });

      for (const edge of edges) {
        const target = nodeMap.get(edge.targetNodeId);
        if (!target) continue;

        const entry = this.checkEdgeForDrift(node, target, edge);
        if (entry) entries.push(entry);
      }
    }

    return {
      projectId,
      scannedAt: new Date().toISOString(),
      totalNodesScanned: nodes.length,
      entries,
    };
  }

  /**
   * Check a specific node and its downstream edges for drift.
   * Used after a single node update (e.g., codebase reindex or document save).
   */
  async scanNode(projectId: string, nodeId: string): Promise<DriftReportEntry[]> {
    const nodes = await this.repo.listNodes(projectId);
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const sourceNode = nodeMap.get(nodeId);
    if (!sourceNode) return [];

    const entries: DriftReportEntry[] = [];

    // Check outgoing edges (this node is the source)
    const outgoing = await this.repo.findEdges({ projectId, sourceNodeId: nodeId });
    for (const edge of outgoing) {
      const target = nodeMap.get(edge.targetNodeId);
      if (!target) continue;
      const entry = this.checkEdgeForDrift(sourceNode, target, edge);
      if (entry) entries.push(entry);
    }

    // Check incoming edges (this node is the target that was updated)
    const incoming = await this.repo.findEdges({ projectId, targetNodeId: nodeId });
    for (const edge of incoming) {
      const source = nodeMap.get(edge.sourceNodeId);
      if (!source) continue;
      const entry = this.checkEdgeForDrift(source, sourceNode, edge);
      if (entry) entries.push(entry);
    }

    return entries;
  }

  /**
   * Check a single edge for drift between source and target.
   */
  private checkEdgeForDrift(
    source: GraphNode,
    target: GraphNode,
    edge: GraphEdge,
  ): DriftReportEntry | null {
    const driftType = determineDriftType(
      source.entityType as GraphEntityType,
      target.entityType as GraphEntityType,
      edge.edgeType as GraphEdgeType,
    );
    if (!driftType) return null;

    // Both nodes must have sync timestamps to compare
    if (!source.lastSyncedAt || !target.lastSyncedAt) return null;

    const sourceTime = new Date(source.lastSyncedAt).getTime();
    const targetTime = new Date(target.lastSyncedAt).getTime();
    const thresholdMs = this.config.stalenessThresholdSeconds * 1000;

    // Source was updated after target - target may be stale
    if (sourceTime <= targetTime + thresholdMs) return null;

    const severity = determineSeverity(driftType);

    return {
      sourceNodeId: source.id,
      targetNodeId: target.id,
      driftType,
      severity,
      description: buildDriftDescription(source, target, driftType),
      suggestedAction: buildSuggestedAction(source, target, driftType),
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function determineDriftType(
  sourceEntityType: GraphEntityType,
  targetEntityType: GraphEntityType,
  edgeType: GraphEdgeType,
): DriftType | null {
  if (sourceEntityType === 'codebase_file' && edgeType === 'implements') return 'code_drift';
  if (sourceEntityType === 'document' && targetEntityType === 'document' && edgeType === 'derives_from') return 'requirements_drift';
  if (edgeType === 'shared_context') return 'foundation_drift';
  if (sourceEntityType === 'document' && targetEntityType === 'work_order' && edgeType === 'derives_from') return 'work_order_drift';
  return null;
}

function determineSeverity(driftType: DriftType): DriftSeverity {
  switch (driftType) {
    case 'code_drift': return 'high';
    case 'requirements_drift': return 'high';
    case 'foundation_drift': return 'medium';
    case 'work_order_drift': return 'medium';
  }
}

function buildDriftDescription(source: GraphNode, target: GraphNode, driftType: DriftType): string {
  const descriptions: Record<DriftType, string> = {
    code_drift: `Code in "${source.label}" has changed since blueprint "${target.label}" was last synced.`,
    requirements_drift: `Requirement "${source.label}" was updated. Blueprint "${target.label}" may be outdated.`,
    foundation_drift: `Foundation blueprint "${source.label}" changed. Feature blueprint "${target.label}" may need updates.`,
    work_order_drift: `Blueprint "${source.label}" was updated. Work order "${target.label}" may need revision.`,
  };
  return descriptions[driftType];
}

function buildSuggestedAction(source: GraphNode, target: GraphNode, driftType: DriftType): string {
  const actions: Record<DriftType, string> = {
    code_drift: `Review blueprint "${target.label}" against current code implementation. Use the Foundry agent to sync.`,
    requirements_drift: `Review blueprint "${target.label}" against updated requirement "${source.label}". Use the Foundry agent to reconcile.`,
    foundation_drift: `Check if feature blueprint "${target.label}" needs updates based on foundation changes in "${source.label}".`,
    work_order_drift: `Review work order "${target.label}" against updated blueprint "${source.label}". Use the Planner agent to update.`,
  };
  return actions[driftType];
}
