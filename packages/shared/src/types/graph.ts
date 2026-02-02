/**
 * OpenFactory - Knowledge Graph Types
 * SPDX-License-Identifier: AGPL-3.0
 */

import { z } from 'zod';

export const GraphEntityType = z.enum(['document', 'work_order', 'feature', 'feedback_item', 'artifact', 'codebase_file']);
export type GraphEntityType = z.infer<typeof GraphEntityType>;

export const GraphNode = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  entityType: GraphEntityType,
  entityId: z.string().uuid(),
  label: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  contentHash: z.string().nullable(),
  lastSyncedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GraphNode = z.infer<typeof GraphNode>;

export const GraphEdgeType = z.enum(['derives_from', 'shared_context', 'implements', 'feedback_on', 'parent_of', 'references', 'blocks', 'related_to']);
export type GraphEdgeType = z.infer<typeof GraphEdgeType>;

export const GraphEdge = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  edgeType: GraphEdgeType,
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
});
export type GraphEdge = z.infer<typeof GraphEdge>;

export const DriftType = z.enum(['code_drift', 'requirements_drift', 'foundation_drift', 'work_order_drift']);
export type DriftType = z.infer<typeof DriftType>;

export const DriftSeverity = z.enum(['low', 'medium', 'high']);
export type DriftSeverity = z.infer<typeof DriftSeverity>;

export const DriftAlertStatus = z.enum(['open', 'acknowledged', 'resolved', 'dismissed']);
export type DriftAlertStatus = z.infer<typeof DriftAlertStatus>;

export const DriftAlert = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid().nullable(),
  driftType: DriftType,
  description: z.string(),
  severity: DriftSeverity,
  status: DriftAlertStatus,
  resolvedAt: z.string().datetime().nullable(),
  resolvedBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DriftAlert = z.infer<typeof DriftAlert>;

export const TraversalResult = z.object({
  root: GraphNode,
  layers: z.array(z.object({
    depth: z.number().int(),
    nodes: z.array(GraphNode),
    edges: z.array(GraphEdge),
  })),
});
export type TraversalResult = z.infer<typeof TraversalResult>;

export const PropagationEvent = z.object({
  changedNode: GraphNode,
  affectedNodes: z.array(z.object({
    node: GraphNode,
    edge: GraphEdge,
    depth: z.number().int(),
  })),
  alerts: z.array(DriftAlert),
});
export type PropagationEvent = z.infer<typeof PropagationEvent>;
