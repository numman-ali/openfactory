// SPDX-License-Identifier: AGPL-3.0-only
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

export function createDatabase(connectionString?: string) {
  const url = connectionString ?? process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL environment variable is required");
  const client = postgres(url);
  const db = drizzle(client, { schema });
  return { db, client };
}
export type Database = ReturnType<typeof createDatabase>["db"];
