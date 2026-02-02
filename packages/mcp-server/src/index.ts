// SPDX-License-Identifier: AGPL-3.0-only

/**
 * OpenFactory MCP Server Entrypoint
 *
 * Starts the MCP server with Streamable HTTP transport.
 * This server is designed to run as a standalone process or be mounted
 * as a route handler within the Fastify API server.
 *
 * Standalone usage:
 *   node dist/index.js
 *
 * The server listens on the /mcp endpoint for MCP protocol messages.
 */

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.js";
import { extractBearerToken, validateApiKey } from "./auth.js";
import { createServer, type IncomingMessage, type ServerResponse } from "http";

const PORT = parseInt(process.env.MCP_PORT ?? "3003", 10);

/**
 * Create the HTTP server that wraps the MCP Streamable HTTP transport.
 *
 * When deployed within Docker, the Fastify API server may instead import
 * `createMcpServer` and mount the transport on its own `/api/mcp` route.
 * This standalone entrypoint is for development and testing.
 */
async function main(): Promise<void> {
  const mcpServer = createMcpServer();

  const httpServer = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

      // Health check
      if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "mcp-server" }));
        return;
      }

      // MCP endpoint
      if (url.pathname === "/mcp") {
        // Validate API key from Authorization header
        const token = extractBearerToken(req.headers.authorization);
        if (!token) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Missing Authorization header" }),
          );
          return;
        }

        const authResult = await validateApiKey(token);
        if ("code" in authResult) {
          const status = authResult.code === "UNAUTHORIZED" ? 401 : 403;
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: authResult.message }));
          return;
        }

        // Create a transport for this request.
        // In production, sessions should be managed to reuse transports
        // across requests from the same client.
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });

        await mcpServer.connect(transport);
        await transport.handleRequest(req, res);
        return;
      }

      // Not found
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    },
  );

  httpServer.listen(PORT, () => {
    console.log(`OpenFactory MCP server listening on port ${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/health`);
    console.log(`  MCP:    http://localhost:${PORT}/mcp`);
  });
}

main().catch((err) => {
  console.error("Failed to start MCP server:", err);
  process.exit(1);
});

// Re-export for use when mounting in Fastify
export { createMcpServer } from "./server.js";
