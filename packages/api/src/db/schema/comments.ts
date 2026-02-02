// SPDX-License-Identifier: AGPL-3.0-only

import { pgTable, uuid, text, jsonb, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { users } from "./users.js";

export const comments = pgTable("comments", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentType: text("parent_type").notNull(),
  parentId: uuid("parent_id").notNull(),
  threadId: uuid("thread_id"),
  content: jsonb().notNull(),
  isAgent: boolean("is_agent").notNull().default(false),
  agentType: text("agent_type"),
  resolved: boolean().notNull().default(false),
  resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_comments_parent").on(table.parentType, table.parentId),
  index("idx_comments_thread").on(table.threadId),
]);
