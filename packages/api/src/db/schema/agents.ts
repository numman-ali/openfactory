// SPDX-License-Identifier: AGPL-3.0-only

import { pgTable, uuid, text, jsonb, integer, timestamp, index } from "drizzle-orm/pg-core";
import { projects, documents } from "./projects.js";
import { users } from "./users.js";

export const agentConversations = pgTable("agent_conversations", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agentType: text("agent_type").notNull(),
  contextType: text("context_type"),
  contextId: uuid("context_id"),
  title: text(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_conversations_project").on(table.projectId),
  index("idx_conversations_user").on(table.userId),
]);

export const agentMessages = pgTable("agent_messages", {
  id: uuid().primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => agentConversations.id, { onDelete: "cascade" }),
  role: text().notNull(),
  content: text().notNull(),
  toolCalls: jsonb("tool_calls"),
  attachments: jsonb(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  model: text(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("idx_agent_messages_conv").on(table.conversationId)]);

export const agentSuggestions = pgTable("agent_suggestions", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  agentType: text("agent_type").notNull(),
  diffs: jsonb().notNull(),
  status: text().notNull().default("pending"),
  conversationId: uuid("conversation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_suggestions_document").on(table.documentId),
  index("idx_suggestions_status").on(table.projectId, table.status),
]);
