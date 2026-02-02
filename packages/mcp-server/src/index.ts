// SPDX-License-Identifier: AGPL-3.0-only

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.js";
import { extractBearerToken, validateApiKey } from "./auth.js";
import { createServer, type IncomingMessage, type ServerResponse } from "http";

const PORT = parseInt(process.env.MCP_PORT ?? "3003", 10);

async function main(): Promise<void> {
  const mcpServer = createMcpServer();

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "mcp-server" }));
      return;
    }

    if (url.pathname === "/mcp") {
      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing Authorization header" }));
        return;
      }

      const authResult = await validateApiKey(token);
      if ("code" in authResult) {
        const status = authResult.code === "UNAUTHORIZED" ? 401 : 403;
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: authResult.message }));
        return;
      }

      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

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

export { createMcpServer } from "./server.js";
