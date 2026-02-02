// SPDX-License-Identifier: AGPL-3.0

/**
 * Shared API types for the OpenFactory frontend.
 * These mirror the API contracts defined in docs/research/api-contracts/.
 * When packages/shared is ready, these should be moved there.
 */

// ─── Common ──────────────────────────────────────────────────────────────────

export interface UserRef {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface PaginatedResponse {
  nextCursor: string | null;
  totalCount: number;
}

// ─── Refinery ────────────────────────────────────────────────────────────────

export type RefineryDocumentType =
  | "product_overview"
  | "feature_requirements"
  | "technical_requirements";

export interface RefineryDocument {
  id: string;
  type: RefineryDocumentType;
  title: string;
  slug: string;
  featureId: string | null;
  featureName: string | null;
  sortOrder: number;
  createdBy: UserRef | null;
  updatedAt: string;
  createdAt: string;
}

export interface RefineryDocumentDetail extends RefineryDocument {
  content: Record<string, unknown>;
  version: number;
}

// ─── Foundry ─────────────────────────────────────────────────────────────────

export type BlueprintType =
  | "foundation_blueprint"
  | "system_diagram"
  | "feature_blueprint";

export interface Blueprint {
  id: string;
  type: BlueprintType;
  title: string;
  slug: string;
  featureId: string | null;
  featureName: string | null;
  sortOrder: number;
  createdBy: UserRef | null;
  updatedAt: string;
  createdAt: string;
}

export interface BlueprintDetail extends Blueprint {
  content: Record<string, unknown>;
  diagramSource: string | null;
  version: number;
}

// ─── Planner ─────────────────────────────────────────────────────────────────

export type WorkOrderStatus =
  | "backlog"
  | "ready"
  | "in_progress"
  | "in_review"
  | "done";

export interface Phase {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  workOrderCount: number;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  title: string;
  status: WorkOrderStatus;
  phase: { id: string; name: string } | null;
  feature: { id: string; name: string } | null;
  assignees: UserRef[];
  deliverableType: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderDetail extends WorkOrder {
  description: Record<string, unknown> | null;
  acceptanceCriteria: Record<string, unknown> | null;
  outOfScope: Record<string, unknown> | null;
  implementationPlan: Record<string, unknown> | null;
}

// ─── Validator ───────────────────────────────────────────────────────────────

export type FeedbackCategory =
  | "bug"
  | "feature_request"
  | "performance"
  | "other";

export type FeedbackStatus =
  | "new"
  | "triaged"
  | "in_progress"
  | "resolved"
  | "dismissed";

export interface FeedbackItem {
  id: string;
  title: string | null;
  description: string;
  category: FeedbackCategory | null;
  priorityScore: number | null;
  status: FeedbackStatus;
  tags: string[];
  browserInfo: Record<string, unknown> | null;
  externalUserId: string | null;
  generatedIssueUrl: string | null;
  createdAt: string;
}

export interface FeedbackItemDetail extends FeedbackItem {
  deviceInfo: Record<string, unknown> | null;
  sessionData: Record<string, unknown> | null;
  generatedIssueId: string | null;
  sourceAppKey: { id: string; name: string } | null;
  updatedAt: string;
}

// ─── Knowledge Graph ─────────────────────────────────────────────────────────

export type GraphNodeType =
  | "refinery_document"
  | "blueprint"
  | "work_order"
  | "feedback"
  | "feature";

export type GraphEdgeType =
  | "implements"
  | "derives_from"
  | "blocks"
  | "related_to"
  | "validates";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  entityId: string;
  label: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  type: GraphEdgeType;
  sourceId: string;
  targetId: string;
  metadata: Record<string, unknown>;
}

// ─── Organizations & Projects ────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}
