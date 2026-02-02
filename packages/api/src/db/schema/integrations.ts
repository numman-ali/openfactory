// SPDX-License-Identifier: AGPL-3.0-only

import { pgTable, uuid, text, jsonb, boolean, bigint, integer, timestamp, unique, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const integrationConfigs = pgTable("integration_configs", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: text().notNull(),
  config: jsonb().notNull(),
  enabled: boolean().notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique().on(table.projectId, table.type)]);

export const codebaseConnections = pgTable("codebase_connections", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }).unique(),
  githubInstallationId: bigint("github_installation_id", { mode: "number" }).notNull(),
  repositoryUrl: text("repository_url").notNull(),
  repositoryOwner: text("repository_owner").notNull(),
  repositoryName: text("repository_name").notNull(),
  defaultBranch: text("default_branch").notNull().default("main"),
  indexStatus: text("index_status").notNull().default("pending"),
  lastIndexedAt: timestamp("last_indexed_at", { withTimezone: true }),
  lastIndexedCommit: text("last_indexed_commit"),
  fileCount: integer("file_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const codebaseFiles = pgTable("codebase_files", {
  id: uuid().primaryKey().defaultRandom(),
  connectionId: uuid("connection_id").notNull().references(() => codebaseConnections.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  language: text(),
  fileHash: text("file_hash").notNull(),
  lastModified: timestamp("last_modified", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.connectionId, table.filePath),
  index("idx_codebase_files_conn").on(table.connectionId),
]);

export const codeChunks = pgTable("code_chunks", {
  id: uuid().primaryKey().defaultRandom(),
  fileId: uuid("file_id").notNull().references(() => codebaseFiles.id, { onDelete: "cascade" }),
  chunkType: text("chunk_type").notNull(),
  name: text(),
  startLine: integer("start_line").notNull(),
  endLine: integer("end_line").notNull(),
  content: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("idx_code_chunks_file").on(table.fileId)]);

export const jobRuns = pgTable("job_runs", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  jobType: text("job_type").notNull(),
  status: text().notNull().default("pending"),
  input: jsonb(),
  output: jsonb(),
  error: text(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_job_runs_project").on(table.projectId),
  index("idx_job_runs_status").on(table.status),
]);
