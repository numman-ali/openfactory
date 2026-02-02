// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Real implementation of OrchestratorDeps that wires the orchestrator
 * to Drizzle database queries and conversation storage.
 */

import { eq, and, isNull, count } from "drizzle-orm";
import type { OrchestratorDeps } from "./orchestrator.js";
import type { PromptContext } from "./prompts/index.js";
import { createToolContext } from "./tool-handlers.js";
import { createConversation, addMessage, loadConversation } from "./conversations.js";
import { documents, features, projects } from "../db/schema/projects.js";
import { driftAlerts } from "../db/schema/graph.js";
import { codebaseConnections } from "../db/schema/integrations.js";
import type { Database } from "../db/connection.js";

async function buildPromptContext(db: Database, projectId: string): Promise<PromptContext> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new Error("Project not found");

  const featureRows = await db
    .select({ name: features.name })
    .from(features)
    .where(and(eq(features.projectId, projectId), isNull(features.deletedAt)))
    .limit(50);

  const featureList = featureRows.map((f) => f.name).join(", ");

  const foundationDocs = await db
    .select({ title: documents.title })
    .from(documents)
    .where(and(eq(documents.projectId, projectId), eq(documents.type, "foundation_blueprint"), isNull(documents.deletedAt)))
    .limit(5);

  const foundationSummary = foundationDocs.map((d) => d.title).join("; ");

  const [alertCount] = await db
    .select({ count: count() })
    .from(driftAlerts)
    .where(and(eq(driftAlerts.projectId, projectId), eq(driftAlerts.status, "open")));

  const [conn] = await db
    .select()
    .from(codebaseConnections)
    .where(eq(codebaseConnections.projectId, projectId))
    .limit(1);

  return {
    projectName: project.name,
    featureList,
    foundationSummary,
    hasCodebase: !!conn,
    activeDriftAlerts: alertCount?.count ?? 0,
  };
}

export async function buildOrchestratorDeps(
  db: Database,
  projectId: string,
  userId: string
): Promise<OrchestratorDeps> {
  const toolContext = createToolContext(db, projectId, userId);
  const promptContext = await buildPromptContext(db, projectId);

  return {
    toolContext,
    promptContext,
    loadConversation: (conversationId: string) => loadConversation(db, conversationId),
    saveMessage: (conversationId, message) => addMessage(db, conversationId, message),
    createConversation: (params) => createConversation(db, params),
  };
}
