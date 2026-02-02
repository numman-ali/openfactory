// SPDX-License-Identifier: AGPL-3.0-only

import { pgTable, uuid, text, jsonb, timestamp, real, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { apiKeys } from "./users";

export const feedbackItems = pgTable("feedback_items", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text(),
  description: text().notNull(),
  category: text(),
  priorityScore: real("priority_score"),
  status: text().notNull().default("new"),
  browserInfo: jsonb("browser_info"),
  deviceInfo: jsonb("device_info"),
  sessionData: jsonb("session_data"),
  sourceAppKeyId: uuid("source_app_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
  externalUserId: text("external_user_id"),
  generatedIssueUrl: text("generated_issue_url"),
  generatedIssueId: text("generated_issue_id"),
  tags: text().array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_feedback_project").on(table.projectId),
  index("idx_feedback_status").on(table.projectId, table.status),
]);
