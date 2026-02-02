// SPDX-License-Identifier: AGPL-3.0-only

import { pgTable, uuid, text, jsonb, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { projects } from "./projects.js";
import { users } from "./users.js";

export const templates = pgTable("templates", {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  type: text().notNull(),
  name: text().notNull(),
  description: text(),
  content: jsonb().notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_templates_org").on(table.organizationId, table.type),
  index("idx_templates_project").on(table.projectId, table.type),
]);
