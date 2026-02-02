// SPDX-License-Identifier: AGPL-3.0-only

/**
 * OpenFactory MCP Server
 *
 * Exposes Planner tools to coding agents (Cursor, Claude Code, Windsurf, etc.)
 * via the Model Context Protocol using Streamable HTTP transport.
 *
 * Tools:
 *   - list_work_orders: List assigned work orders in a given status
 *   - get_work_order: Get full work order details with implementation plan
 *   - update_work_order_status: Move work order through status lifecycle
 *   - search_context: Search requirements, blueprints, artifacts, code
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ListWorkOrdersInput,
  GetWorkOrderInput,
  UpdateWorkOrderStatusInput,
  SearchContextInput,
} from "./schemas.js";
import {
  handleListWorkOrders,
  handleGetWorkOrder,
  handleUpdateWorkOrderStatus,
  handleSearchContext,
} from "./handlers.js";
import type { AuthContext } from "./auth.js";

/**
 * Create and configure the MCP server instance.
 *
 * The server is transport-agnostic at this level. The transport (Streamable HTTP)
 * is attached in the entrypoint (index.ts).
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "openfactory",
    version: "0.1.0",
  });

  // -------------------------------------------------------------------------
  // Tool: list_work_orders
  // -------------------------------------------------------------------------
  server.tool(
    "list_work_orders",
    "List work orders assigned to you. Defaults to work orders in 'Ready' status. Use this to see what tasks are available for you to work on.",
    ListWorkOrdersInput.shape,
    async (params) => {
      // Auth context is injected via the transport layer's session.
      // For now, use a placeholder until the auth middleware is wired up.
      const auth = getAuthFromContext();
      const result = await handleListWorkOrders(params, auth);

      if (result.workOrders.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No work orders found matching the criteria.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // Tool: get_work_order
  // -------------------------------------------------------------------------
  server.tool(
    "get_work_order",
    "Get the full details of a work order including description, acceptance criteria, out-of-scope notes, implementation plan, and connections to requirements and blueprints.",
    GetWorkOrderInput.shape,
    async (params) => {
      const auth = getAuthFromContext();
      const result = await handleGetWorkOrder(params, auth);

      if (!result) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Work order not found or you do not have access.",
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // Tool: update_work_order_status
  // -------------------------------------------------------------------------
  server.tool(
    "update_work_order_status",
    "Update the status of a work order. Valid transitions: ready -> in_progress -> in_review -> done. Use this to mark a task as started, ready for review, or completed.",
    UpdateWorkOrderStatusInput.shape,
    async (params) => {
      const auth = getAuthFromContext();
      const result = await handleUpdateWorkOrderStatus(params, auth);

      if (!result) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Work order not found, invalid status transition, or insufficient permissions.",
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // Tool: search_context
  // -------------------------------------------------------------------------
  server.tool(
    "search_context",
    "Search across project requirements, blueprints, artifacts, and code for additional context. Use this when you need more information about the project to complete a work order.",
    SearchContextInput.shape,
    async (params) => {
      const auth = getAuthFromContext();
      const result = await handleSearchContext(params, auth);

      if (result.results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No results found for the given query.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  return server;
}

/**
 * Placeholder for extracting auth context from the MCP session.
 *
 * In production, the Streamable HTTP transport middleware will validate
 * the API key from the Authorization header and attach the AuthContext
 * to the request/session. This function will be replaced with proper
 * context propagation.
 */
function getAuthFromContext(): AuthContext {
  // TODO: Wire up auth context from transport session (Backend team)
  return {
    userId: "",
    projectId: "",
    scopes: [],
  };
}
