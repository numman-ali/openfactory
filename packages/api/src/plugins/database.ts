// SPDX-License-Identifier: AGPL-3.0-only
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { createDatabase, type Database } from "../db/connection.js";

declare module "fastify" {
  interface FastifyInstance { db: Database; }
}

const databasePlugin: FastifyPluginAsync = async (fastify) => {
  const { db, client } = createDatabase();
  fastify.decorate("db", db);
  fastify.addHook("onClose", async () => { await client.end(); });
};

export default fp(databasePlugin, { name: "database" });
