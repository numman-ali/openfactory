// SPDX-License-Identifier: AGPL-3.0-only

import { pgTable, uuid, text, bigint, timestamp, integer, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

export const artifactFolders = pgTable("artifact_folders", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  name: text().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("idx_artifact_folders_project").on(table.projectId)]);

export const artifacts = pgTable("artifacts", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id").references(() => artifactFolders.id, { onDelete: "set null" }),
  name: text().notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  storageKey: text("storage_key").notNull(),
  processingStatus: text("processing_status").notNull().default("pending"),
  extractedText: text("extracted_text"),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("idx_artifacts_project").on(table.projectId),
  index("idx_artifacts_folder").on(table.folderId),
]);
