// SPDX-License-Identifier: AGPL-3.0-only

import type { AuthContext } from "./auth.js";
import type { ListWorkOrdersParams, GetWorkOrderParams, UpdateWorkOrderStatusParams, SearchContextParams } from "./schemas.js";

export interface WorkOrderSummary {
  id: string; title: string; status: string;
  phase: string | null; feature: string | null; deliverableType: string | null;
}

export async function handleListWorkOrders(params: ListWorkOrdersParams, auth: AuthContext): Promise<{ workOrders: WorkOrderSummary[] }> {
  // TODO: Replace with real implementation (Backend team)
  void params; void auth;
  return { workOrders: [] };
}

export interface WorkOrderDetail {
  id: string; title: string; status: string;
  phase: string | null; feature: string | null;
  description: string; acceptanceCriteria: string; outOfScope: string; implementationPlan: string;
  graphConnections: Array<{ entityType: string; label: string; edgeType: string }>;
}

export async function handleGetWorkOrder(params: GetWorkOrderParams, auth: AuthContext): Promise<WorkOrderDetail | null> {
  // TODO: Replace with real implementation (Backend team)
  void params; void auth;
  return null;
}

export interface StatusUpdateResult {
  success: boolean; workOrderId: string; previousStatus: string; newStatus: string;
}

export async function handleUpdateWorkOrderStatus(params: UpdateWorkOrderStatusParams, auth: AuthContext): Promise<StatusUpdateResult | null> {
  // TODO: Replace with real implementation (Backend team)
  void params; void auth;
  return null;
}

export interface SearchResult {
  type: string; title: string; snippet: string; entityId: string; score: number;
}

export async function handleSearchContext(params: SearchContextParams, auth: AuthContext): Promise<{ results: SearchResult[] }> {
  // TODO: Replace with real implementation (Backend/AI team)
  void params; void auth;
  return { results: [] };
}
