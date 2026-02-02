// SPDX-License-Identifier: AGPL-3.0-only

import { eq, and, desc, lt, sql } from "drizzle-orm";
import type { CoreMessage } from "ai";
import { agentConversations, agentMessages } from "../db/schema/agents.js";
import type { Database } from "../db/connection.js";
import type { AgentType } from "@repo/shared/types";

export async function createConversation(
  db: Database,
  params: { projectId: string; userId: string; agentType: AgentType; contextType?: string; contextId?: string }
): Promise<string> {
  const [row] = await db.insert(agentConversations).values({
    projectId: params.projectId,
    userId: params.userId,
    agentType: params.agentType,
    contextType: params.contextType ?? null,
    contextId: params.contextId ?? null,
  }).returning();
  return row!.id;
}

export async function addMessage(
  db: Database,
  conversationId: string,
  message: CoreMessage & { inputTokens?: number; outputTokens?: number; model?: string }
): Promise<void> {
  const content = typeof message.content === "string"
    ? message.content
    : JSON.stringify(message.content);

  await db.insert(agentMessages).values({
    conversationId,
    role: message.role,
    content,
    inputTokens: message.inputTokens ?? null,
    outputTokens: message.outputTokens ?? null,
    model: message.model ?? null,
  });

  await db
    .update(agentConversations)
    .set({ updatedAt: new Date() })
    .where(eq(agentConversations.id, conversationId));
}

export async function loadConversation(
  db: Database,
  conversationId: string
): Promise<CoreMessage[]> {
  const rows = await db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.conversationId, conversationId))
    .orderBy(agentMessages.createdAt);

  return rows.map((row) => {
    switch (row.role) {
      case "user":
        return { role: "user" as const, content: row.content };
      case "assistant":
        return { role: "assistant" as const, content: row.content };
      case "system":
        return { role: "system" as const, content: row.content };
      default:
        return { role: "user" as const, content: row.content };
    }
  });
}

export async function getConversation(
  db: Database,
  conversationId: string
) {
  const [conv] = await db
    .select()
    .from(agentConversations)
    .where(eq(agentConversations.id, conversationId))
    .limit(1);

  if (!conv) return null;

  const messages = await db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.conversationId, conversationId))
    .orderBy(agentMessages.createdAt);

  return {
    id: conv.id,
    projectId: conv.projectId,
    userId: conv.userId,
    agentType: conv.agentType,
    contextType: conv.contextType,
    contextId: conv.contextId,
    title: conv.title,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolCalls: m.toolCalls,
      inputTokens: m.inputTokens,
      outputTokens: m.outputTokens,
      model: m.model,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function listConversations(
  db: Database,
  projectId: string,
  filters: { agentType?: string; cursor?: string; limit?: number }
) {
  const limit = Math.min(filters.limit ?? 20, 100);
  const conditions = [eq(agentConversations.projectId, projectId)];

  if (filters.agentType) {
    conditions.push(eq(agentConversations.agentType, filters.agentType));
  }
  if (filters.cursor) {
    conditions.push(lt(agentConversations.createdAt, new Date(filters.cursor)));
  }

  const rows = await db
    .select({
      conv: agentConversations,
      messageCount: sql<number>`(SELECT COUNT(*) FROM agent_messages WHERE conversation_id = ${agentConversations.id})`,
    })
    .from(agentConversations)
    .where(and(...conditions))
    .orderBy(desc(agentConversations.updatedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    conversations: items.map((r) => ({
      id: r.conv.id,
      agentType: r.conv.agentType,
      title: r.conv.title,
      contextType: r.conv.contextType,
      contextId: r.conv.contextId,
      messageCount: r.messageCount,
      createdAt: r.conv.createdAt.toISOString(),
      updatedAt: r.conv.updatedAt.toISOString(),
    })),
    nextCursor: hasMore ? items[items.length - 1]!.conv.createdAt.toISOString() : null,
  };
}
