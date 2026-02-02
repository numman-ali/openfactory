// SPDX-License-Identifier: AGPL-3.0-only
import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "./connection.js";

async function runMigrations() {
  const { db, client } = createDatabase();
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");
  await client.end();
  process.exit(0);
}
runMigrations().catch((err) => { console.error("Migration failed:", err); process.exit(1); });
