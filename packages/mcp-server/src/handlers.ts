// SPDX-License-Identifier: AGPL-3.0-only

/**
 * MCP tool handler implementations.
 *
 * Each handler receives validated input and an AuthContext, and returns
 * the tool response. In production, these delegate to the API server's
 * service layer. This module provides the handler signatures and placeholder
 * implementations that the Backend team will wire up.
 */

import type { AuthContext } from "./auth.js";
import type {
  ListWorkOrdersParams,
  GetWorkOrderParams,
  UpdateWorkOrderStatusParams,
  SearchContextParams,
} from "./schemas.js";

// ---------------------------------------------------------------------------
// list_work_orders
// ---------------------------------------------------------------------------

export interface WorkOrderSummary {
  id: string;
  title: string;
  status: string;
  phase: string | null;
  feature: string | null;
  deliverableType: string | null;
}

export async function handleListWorkOrders(
  params: ListWorkOrdersParams,
  auth: AuthContext,
): Promise<{ workOrders: WorkOrderSummary[] }> {
  // TODO: Replace with real implementation (Backend team)
  // Query work_orders WHERE:
  //   - project_id = auth.projectId
  //   - auth.userId = ANY(assignee_ids)
  //   - status = params.status
  //   - deleted_at IS NULL
  // ORDER BY sort_order ASC
  // LIMIT params.limit
  void params;
  void auth;
  return { workOrders: [] };
}

// ---------------------------------------------------------------------------
// get_work_order
// ---------------------------------------------------------------------------

export interface WorkOrderDetail {
  id: string;
  title: string;
  status: string;
  phase: string | null;
  feature: string | null;
  description: string;
  acceptanceCriteria: string;
  outOfScope: string;
  implementationPlan: string;
  graphConnections: Array<{
    entityType: string;
    label: string;
    edgeType: string;
  }>;
}

export async function handleGetWorkOrder(
  params: GetWorkOrderParams,
  auth: AuthContext,
): Promise<WorkOrderDetail | null> {
  // TODO: Replace with real implementation (Backend team)
  // 1. Fetch work_order by id WHERE project_id = auth.projectId
  // 2. Render TipTap JSON content fields to markdown
  // 3. Fetch graph_edges for the work order's graph_node
  // 4. Return combined result
  void params;
  void auth;
  return null;
}

// ---------------------------------------------------------------------------
// update_work_order_status
// ---------------------------------------------------------------------------

export interface StatusUpdateResult {
  success: boolean;
  workOrderId: string;
  previousStatus: string;
  newStatus: string;
}

export async function handleUpdateWorkOrderStatus(
  params: UpdateWorkOrderStatusParams,
  auth: AuthContext,
): Promise<StatusUpdateResult | null> {
  // TODO: Replace with real implementation (Backend team)
  // 1. Fetch work_order by id WHERE project_id = auth.projectId
  // 2. Validate status transition (backlog->ready->in_progress->in_review->done)
  // 3. Update status
  // 4. Create activity record
  // 5. Return result
  void params;
  void auth;
  return null;
}

// ---------------------------------------------------------------------------
// search_context
// ---------------------------------------------------------------------------

export interface SearchResult {
  type: string;
  title: string;
  snippet: string;
  entityId: string;
  score: number;
}

export async function handleSearchContext(
  params: SearchContextParams,
  auth: AuthContext,
): Promise<{ results: SearchResult[] }> {
  // TODO: Replace with real implementation (Backend/AI team)
  // 1. Build search query across documents, artifacts, code_chunks
  // 2. Filter by params.types if provided
  // 3. Use full-text search for documents, vector search for code
  // 4. Combine and rank results
  // 5. Return top params.limit results
  void params;
  void auth;
  return { results: [] };
}
