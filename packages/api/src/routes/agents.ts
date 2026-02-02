// SPDX-License-Identifier: AGPL-3.0-only

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AgentRequest } from "@repo/shared/types";
import { requireAuth } from "../plugins/auth.js";
import { AppError } from "../plugins/error-handler.js";
import { executeAgent, toSSEStream } from "../agents/orchestrator.js";
import { buildOrchestratorDeps } from "../agents/deps.js";
import { getConversation, listConversations } from "../agents/conversations.js";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    throw new AppError(429, "RATE_LIMITED", "Too many agent requests. Please wait before trying again.");
  }

  entry.count++;
}

// Periodically clean up expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now >= entry.resetAt) rateLimitMap.delete(key);
  }
}, 60_000).unref();

const agentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", requireAuth);

  /** POST /api/projects/:projectId/agents/stream */
  fastify.post<{ Params: { projectId: string } }>(
    "/:projectId/agents/stream",
    {
      schema: {
        body: AgentRequest.omit({ projectId: true }),
      },
    },
    async (request, reply) => {
      const db = fastify.db;
      const { projectId } = request.params;

      checkRateLimit(request.user.id);

      const body = request.body as z.infer<typeof AgentRequest>;
      const agentRequest: z.infer<typeof AgentRequest> = {
        ...body,
        projectId,
      };

      const deps = await buildOrchestratorDeps(db, projectId, request.user.id);
      const eventStream = await executeAgent(agentRequest, deps);
      const sseStream = toSSEStream(eventStream);

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });

      const reader = sseStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          reply.raw.write(value);
        }
      } catch (error) {
        fastify.log.error(error, "SSE stream error");
      } finally {
        reply.raw.end();
      }
    },
  );

  /** GET /api/projects/:projectId/agents/conversations */
  fastify.get<{
    Params: { projectId: string };
    Querystring: { agentType?: string; cursor?: string; limit?: string };
  }>(
    "/:projectId/agents/conversations",
    async (request) => {
      const db = fastify.db;
      const { agentType, cursor, limit: limitStr } = request.query;
      const limit = limitStr ? parseInt(limitStr, 10) : undefined;

      return listConversations(db, request.params.projectId, {
        agentType,
        cursor,
        limit,
      });
    },
  );

  /** GET /api/projects/:projectId/agents/conversations/:conversationId */
  fastify.get<{
    Params: { projectId: string; conversationId: string };
  }>(
    "/:projectId/agents/conversations/:conversationId",
    async (request) => {
      const db = fastify.db;
      const conversation = await getConversation(db, request.params.conversationId);

      if (!conversation || conversation.projectId !== request.params.projectId) {
        throw new AppError(404, "NOT_FOUND", "Conversation not found");
      }

      return conversation;
    },
  );
};

export default agentRoutes;
