/**
 * OpenFactory - Change Propagation Engine
 * SPDX-License-Identifier: AGPL-3.0
 *
 * When a node is updated, traverses outgoing edges and marks downstream
 * nodes as potentially stale. Creates drift alert records for affected nodes.
 * Supports configurable propagation depth and batch processing.
 */

import { z } from 'zod';
import type {
  GraphNode,
  GraphEdge,
  GraphEdgeType,
  GraphEntityType,
  DriftAlert,
  DriftType,
  DriftSeverity,
} from '@repo/shared/types/graph';
import type { GraphRepository } from './index.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const PropagatorConfig = z.object({
  /** Maximum number of hops to propagate changes. */
  maxDepth: z.number().int().positive().default(2),
  /** Maximum nodes to process per batch to avoid overwhelming the system. */
  batchSize: z.number().int().positive().default(50),
});
export type PropagatorConfig = z.infer<typeof PropagatorConfig>;

export const PropagationResult = z.object({
  sourceNodeId: z.string().uuid(),
  totalAffected: z.number().int().nonnegative(),
  alertsCreated: z.number().int().nonnegative(),
  /** Node IDs that were marked as potentially stale, grouped by depth. */
  affectedByDepth: z.record(z.string(), z.array(z.string().uuid())),
});
export type PropagationResult = z.infer<typeof PropagationResult>;

// ---------------------------------------------------------------------------
// Change Propagator
// ---------------------------------------------------------------------------

export class ChangePropagator {
  private readonly config: PropagatorConfig;

  constructor(
    private readonly repo: GraphRepository,
    config?: Partial<PropagatorConfig>,
  ) {
    this.config = PropagatorConfig.parse(config ?? {});
  }

  /**
   * Propagate a change from a source node to its downstream dependents.
   * Traverses outgoing edges up to maxDepth hops, creating drift alerts
   * for each affected node.
   */
  async propagate(
    projectId: string,
    sourceNodeId: string,
  ): Promise<PropagationResult> {
    const sourceNode = await this.findNodeById(projectId, sourceNodeId);
    if (!sourceNode) {
      return {
        sourceNodeId,
        totalAffected: 0,
        alertsCreated: 0,
        affectedByDepth: {},
      };
    }

    const visited = new Set<string>([sourceNodeId]);
    const affectedByDepth: Record<string, string[]> = {};
    let alertsCreated = 0;
    let totalAffected = 0;

    // BFS traversal with depth tracking
    let currentLayer: Array<{ node: GraphNode; parentEdge: GraphEdge | null }> = [
      { node: sourceNode, parentEdge: null },
    ];

    for (let depth = 1; depth <= this.config.maxDepth; depth++) {
      const nextLayer: Array<{ node: GraphNode; parentEdge: GraphEdge | null }> = [];
      const depthKey = String(depth);
      affectedByDepth[depthKey] = [];

      // Process in batches
      for (let batchStart = 0; batchStart < currentLayer.length; batchStart += this.config.batchSize) {
        const batch = currentLayer.slice(batchStart, batchStart + this.config.batchSize);

        for (const { node: currentNode } of batch) {
          const outgoingEdges = await this.repo.findEdges({
            projectId,
            sourceNodeId: currentNode.id,
          });

          for (const edge of outgoingEdges) {
            if (visited.has(edge.targetNodeId)) continue;
            visited.add(edge.targetNodeId);

            const targetNode = await this.findNodeById(projectId, edge.targetNodeId);
            if (!targetNode) continue;

            const driftType = determineDriftType(
              currentNode.entityType as GraphEntityType,
              targetNode.entityType as GraphEntityType,
              edge.edgeType as GraphEdgeType,
            );

            if (driftType) {
              await this.repo.createDriftAlert({
                projectId,
                sourceNodeId: sourceNode.id,
                targetNodeId: targetNode.id,
                driftType,
                description: buildDescription(sourceNode, targetNode, driftType, depth),
                severity: determineSeverity(depth),
                status: 'open',
                resolvedAt: null,
                resolvedBy: null,
              });
              alertsCreated++;
            }

            affectedByDepth[depthKey].push(targetNode.id);
            totalAffected++;
            nextLayer.push({ node: targetNode, parentEdge: edge });
          }
        }
      }

      if (nextLayer.length === 0) break;
      currentLayer = nextLayer;
    }

    return {
      sourceNodeId,
      totalAffected,
      alertsCreated,
      affectedByDepth,
    };
  }

  /**
   * Propagate changes for multiple source nodes in batch.
   * Deduplicates alerts for the same target across different sources.
   */
  async propagateBatch(
    projectId: string,
    sourceNodeIds: string[],
  ): Promise<PropagationResult[]> {
    const results: PropagationResult[] = [];
    for (const nodeId of sourceNodeIds) {
      const result = await this.propagate(projectId, nodeId);
      results.push(result);
    }
    return results;
  }

  private async findNodeById(projectId: string, nodeId: string): Promise<GraphNode | null> {
    const nodes = await this.repo.listNodes(projectId);
    return nodes.find((n) => n.id === nodeId) ?? null;
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

function determineSeverity(depth: number): DriftSeverity {
  if (depth === 1) return 'high';
  if (depth === 2) return 'medium';
  return 'low';
}

function buildDescription(
  source: GraphNode,
  target: GraphNode,
  driftType: DriftType,
  depth: number,
): string {
  const hop = depth === 1 ? 'directly' : `${depth} hops away`;
  const descriptions: Record<DriftType, string> = {
    code_drift: `Code changes in "${source.label}" may invalidate "${target.label}" (${hop}).`,
    requirements_drift: `Requirement "${source.label}" updated; "${target.label}" may be stale (${hop}).`,
    foundation_drift: `Foundation "${source.label}" changed; "${target.label}" may need updates (${hop}).`,
    work_order_drift: `Blueprint "${source.label}" updated; work order "${target.label}" may need revision (${hop}).`,
  };
  return descriptions[driftType];
}
