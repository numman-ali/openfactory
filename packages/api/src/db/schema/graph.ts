// SPDX-License-Identifier: AGPL-3.0-only

import { pgTable, uuid, text, jsonb, timestamp, unique, index } from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { users } from "./users.js";

export const graphNodes = pgTable("graph_nodes", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  label: text().notNull(),
  metadata: jsonb().notNull().default({}),
  contentHash: text("content_hash"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.projectId, table.entityType, table.entityId),
  index("idx_graph_nodes_project").on(table.projectId),
  index("idx_graph_nodes_entity").on(table.entityType, table.entityId),
]);

export const graphEdges = pgTable("graph_edges", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sourceNodeId: uuid("source_node_id").notNull().references(() => graphNodes.id, { onDelete: "cascade" }),
  targetNodeId: uuid("target_node_id").notNull().references(() => graphNodes.id, { onDelete: "cascade" }),
  edgeType: text("edge_type").notNull(),
  metadata: jsonb().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.sourceNodeId, table.targetNodeId, table.edgeType),
  index("idx_graph_edges_source").on(table.sourceNodeId),
  index("idx_graph_edges_target").on(table.targetNodeId),
  index("idx_graph_edges_project").on(table.projectId),
]);

export const driftAlerts = pgTable("drift_alerts", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sourceNodeId: uuid("source_node_id").notNull().references(() => graphNodes.id, { onDelete: "cascade" }),
  targetNodeId: uuid("target_node_id").references(() => graphNodes.id, { onDelete: "cascade" }),
  driftType: text("drift_type").notNull(),
  description: text().notNull(),
  severity: text().notNull().default("medium"),
  status: text().notNull().default("open"),
  resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_drift_alerts_project").on(table.projectId, table.status),
  index("idx_drift_alerts_source").on(table.sourceNodeId),
]);
