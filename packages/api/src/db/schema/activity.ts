// SPDX-License-Identifier: AGPL-3.0-only

import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { users } from "./users.js";

export const activities = pgTable("activities", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text().notNull(),
  changes: jsonb(),
  metadata: jsonb().notNull().default({}),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorType: text("actor_type").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_activities_project").on(table.projectId),
  index("idx_activities_entity").on(table.entityType, table.entityId),
]);
