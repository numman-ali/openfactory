// SPDX-License-Identifier: AGPL-3.0-only

import "dotenv/config";
import { createHocuspocusServer } from "./collab/index.js";
import { createDatabase } from "./db/connection.js";

const PORT = parseInt(process.env["HOCUSPOCUS_PORT"] ?? process.env["PORT"] ?? "3002", 10);
const REDIS_URL = process.env["REDIS_URL"];

async function start() {
  const { db, client } = createDatabase();

  const server = createHocuspocusServer({
    port: PORT,
    db,
    redisUrl: REDIS_URL,
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down Hocuspocus server...");
    await server.destroy();
    await client.end();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  await server.listen();
  console.log(`Hocuspocus collaboration server listening on port ${PORT}`);
}

start().catch((err) => {
  console.error("Failed to start Hocuspocus server:", err);
  process.exit(1);
});
