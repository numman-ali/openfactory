// SPDX-License-Identifier: AGPL-3.0-only
import "dotenv/config";
import { buildApp } from "./app.js";

const PORT = parseInt(process.env["API_PORT"] ?? "3001", 10);
const HOST = process.env["API_HOST"] ?? "0.0.0.0";

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
start();
