// SPDX-License-Identifier: AGPL-3.0-only

import { pgTable, uuid, text, jsonb, timestamp, integer, index } from "drizzle-orm/pg-core";
import { projects, features } from "./projects.js";
import { users } from "./users.js";

export const phases = pgTable("phases", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text().notNull(),
  description: text(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("idx_phases_project").on(table.projectId)]);

export const workOrders = pgTable("work_orders", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseId: uuid("phase_id").references(() => phases.id, { onDelete: "set null" }),
  featureId: uuid("feature_id").references(() => features.id, { onDelete: "set null" }),
  title: text().notNull(),
  status: text().notNull().default("backlog"),
  description: jsonb(),
  acceptanceCriteria: jsonb("acceptance_criteria"),
  outOfScope: jsonb("out_of_scope"),
  implementationPlan: jsonb("implementation_plan"),
  assigneeIds: uuid("assignee_ids").array().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  deliverableType: text("deliverable_type"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_work_orders_project").on(table.projectId),
  index("idx_work_orders_phase").on(table.phaseId),
  index("idx_work_orders_status").on(table.projectId, table.status),
  index("idx_work_orders_feature").on(table.featureId),
]);
