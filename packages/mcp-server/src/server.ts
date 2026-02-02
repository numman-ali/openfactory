// SPDX-License-Identifier: AGPL-3.0-only

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListWorkOrdersInput, GetWorkOrderInput, UpdateWorkOrderStatusInput, SearchContextInput } from "./schemas.js";
import { handleListWorkOrders, handleGetWorkOrder, handleUpdateWorkOrderStatus, handleSearchContext } from "./handlers.js";
import type { AuthContext } from "./auth.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "openfactory", version: "0.1.0" });

  server.tool(
    "list_work_orders",
    "List work orders assigned to you. Defaults to 'Ready' status.",
    ListWorkOrdersInput.shape,
    async (params) => {
      const auth = getAuthFromContext();
      const result = await handleListWorkOrders(params, auth);
      return {
        content: [{
          type: "text" as const,
          text: result.workOrders.length === 0
            ? "No work orders found matching the criteria."
            : JSON.stringify(result, null, 2),
        }],
      };
    },
  );

  server.tool(
    "get_work_order",
    "Get full work order details including description, acceptance criteria, implementation plan, and graph connections.",
    GetWorkOrderInput.shape,
    async (params) => {
      const auth = getAuthFromContext();
      const result = await handleGetWorkOrder(params, auth);
      if (!result) {
        return { content: [{ type: "text" as const, text: "Work order not found or you do not have access." }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "update_work_order_status",
    "Update work order status. Valid transitions: ready -> in_progress -> in_review -> done.",
    UpdateWorkOrderStatusInput.shape,
    async (params) => {
      const auth = getAuthFromContext();
      const result = await handleUpdateWorkOrderStatus(params, auth);
      if (!result) {
        return { content: [{ type: "text" as const, text: "Work order not found, invalid status transition, or insufficient permissions." }], isError: true };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "search_context",
    "Search across project requirements, blueprints, artifacts, and code for additional context.",
    SearchContextInput.shape,
    async (params) => {
      const auth = getAuthFromContext();
      const result = await handleSearchContext(params, auth);
      return {
        content: [{
          type: "text" as const,
          text: result.results.length === 0
            ? "No results found for the given query."
            : JSON.stringify(result, null, 2),
        }],
      };
    },
  );

  return server;
}

function getAuthFromContext(): AuthContext {
  // TODO: Wire up auth context from transport session (Backend team)
  return { userId: "", projectId: "", scopes: [] };
}
