// SPDX-License-Identifier: AGPL-3.0-only

import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { users } from "./users.js";

export const notifications = pgTable("notifications", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  type: text().notNull(),
  title: text().notNull(),
  body: text(),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("idx_notifications_user").on(table.userId)]);
