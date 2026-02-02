// SPDX-License-Identifier: AGPL-3.0-only

import { pgTable, uuid, text, jsonb, timestamp, integer, unique, index, customType } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { users } from "./users.js";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const projects = pgTable("projects", {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text().notNull(),
  slug: text().notNull(),
  description: text(),
  settings: jsonb().notNull().default({}),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.organizationId, table.slug),
  index("idx_projects_org").on(table.organizationId),
]);

export const features = pgTable("features", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  name: text().notNull(),
  slug: text().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  unique().on(table.projectId, table.slug),
  index("idx_features_project").on(table.projectId),
  index("idx_features_parent").on(table.parentId),
]);

export const documents = pgTable("documents", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  featureId: uuid("feature_id").references(() => features.id, { onDelete: "set null" }),
  type: text().notNull(),
  title: text().notNull(),
  slug: text().notNull(),
  content: jsonb(),
  diagramSource: text("diagram_source"),
  templateId: uuid("template_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  yjsState: bytea("yjs_state"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  unique().on(table.projectId, table.type, table.slug),
  index("idx_documents_project_type").on(table.projectId, table.type),
  index("idx_documents_feature").on(table.featureId),
]);

export const documentVersions = pgTable("document_versions", {
  id: uuid().primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  content: jsonb().notNull(),
  diagramSource: text("diagram_source"),
  changeSummary: text("change_summary"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.documentId, table.versionNumber),
  index("idx_doc_versions_document").on(table.documentId),
]);
