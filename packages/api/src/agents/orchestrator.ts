/**
 * OpenFactory - Agent Orchestrator
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Core agent execution engine. Handles context assembly, tool routing,
 * streaming via SSE, structured output, and human-in-the-loop confirmation.
 */

import { streamText, type CoreMessage, type StreamTextResult } from 'ai';
import { createModel, getDefaultConfig } from './providers/index.js';
import { createAgentTools, AGENT_TOOL_SETS, CONFIRMATION_REQUIRED_TOOLS } from './tools/index.js';
import { buildSystemPrompt, type PromptContext } from './prompts/index.js';
import type { ToolContext } from './tools/index.js';
import type { AgentRequest, AgentType, AgentStreamEvent } from '@repo/shared/types/agent';

export interface OrchestratorDeps {
  toolContext: ToolContext;
  promptContext: PromptContext;
  loadConversation(conversationId: string): Promise<CoreMessage[]>;
  saveMessage(conversationId: string, message: CoreMessage & { inputTokens?: number; outputTokens?: number; model?: string }): Promise<void>;
  createConversation(params: { projectId: string; userId: string; agentType: AgentType; contextType?: string; contextId?: string }): Promise<string>;
}

export async function executeAgent(
  request: AgentRequest,
  deps: OrchestratorDeps
): Promise<ReadableStream<AgentStreamEvent>> {
  const { agentType, projectId, message, conversationId, contextDocumentId, confirmations } = request;

  const convId = conversationId ?? (await deps.createConversation({
    projectId,
    userId: deps.toolContext.userId,
    agentType,
    contextType: contextDocumentId ? 'document' : undefined,
    contextId: contextDocumentId,
  }));

  const history = conversationId ? await deps.loadConversation(convId) : [];
  const systemPrompt = buildSystemPrompt(agentType, deps.promptContext);
  const config = getDefaultConfig();
  const model = createModel(config);

  const allTools = createAgentTools(deps.toolContext);
  const allowedToolNames = AGENT_TOOL_SETS[agentType];
  const tools: Record<string, (typeof allTools)[keyof typeof allTools]> = {};
  for (const name of allowedToolNames) {
    const toolName = name as keyof typeof allTools;
    if (allTools[toolName]) tools[name] = allTools[toolName];
  }

  const messages: CoreMessage[] = [...history, { role: 'user' as const, content: message }];

  if (confirmations) {
    for (const c of confirmations) {
      messages.push({
        role: 'user' as const,
        content: c.approved
          ? `[CONFIRMED] The user approved the ${c.toolName} operation.`
          : `[REJECTED] The user rejected the ${c.toolName} operation.`,
      });
    }
  }

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
    tools,
    maxSteps: 10,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  });

  return createEventStream(result, convId, deps);
}

function createEventStream(
  result: StreamTextResult<Record<string, unknown>>,
  conversationId: string,
  deps: OrchestratorDeps
): ReadableStream<AgentStreamEvent> {
  return new ReadableStream<AgentStreamEvent>({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          switch (part.type) {
            case 'text-delta':
              controller.enqueue({ type: 'text-delta', content: part.textDelta });
              break;
            case 'tool-call':
              if (CONFIRMATION_REQUIRED_TOOLS.has(part.toolName)) {
                controller.enqueue({
                  type: 'confirmation-required',
                  toolName: part.toolName,
                  args: part.args as Record<string, unknown>,
                  description: `The agent wants to execute ${part.toolName}. Please review and confirm.`,
                } as AgentStreamEvent);
              } else {
                controller.enqueue({ type: 'tool-call', toolName: part.toolName, args: part.args as Record<string, unknown> } as AgentStreamEvent);
              }
              break;
            case 'tool-result':
              controller.enqueue({ type: 'tool-result', toolName: part.toolName, result: part.result } as AgentStreamEvent);
              break;
            case 'error':
              controller.enqueue({ type: 'error', message: part.error instanceof Error ? part.error.message : 'Unknown error' });
              break;
            case 'finish':
              await deps.saveMessage(conversationId, {
                role: 'assistant', content: part.text ?? '',
                inputTokens: part.usage?.promptTokens, outputTokens: part.usage?.completionTokens, model: undefined,
              } as CoreMessage & { inputTokens?: number; outputTokens?: number; model?: string });
              controller.enqueue({
                type: 'done',
                usage: part.usage ? { inputTokens: part.usage.promptTokens, outputTokens: part.usage.completionTokens, model: 'unknown' } : undefined,
              });
              break;
          }
        }
      } catch (error) {
        controller.enqueue({ type: 'error', message: error instanceof Error ? error.message : 'Stream processing failed' });
      } finally {
        controller.close();
      }
    },
  });
}

export function toSSEStream(eventStream: ReadableStream<AgentStreamEvent>): ReadableStream<string> {
  const reader = eventStream.getReader();
  return new ReadableStream<string>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) { controller.close(); return; }
      controller.enqueue(`data: ${JSON.stringify(value)}\n\n`);
    },
  });
}
