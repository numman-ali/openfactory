/**
 * OpenFactory - Agent Types
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Shared type definitions for the AI agent system.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Agent Identity
// ---------------------------------------------------------------------------

export const AgentType = z.enum(['refinery', 'foundry', 'planner', 'validator']);
export type AgentType = z.infer<typeof AgentType>;

// ---------------------------------------------------------------------------
// Structured Edit Suggestions
// ---------------------------------------------------------------------------

export const EditOperation = z.enum(['insert', 'replace', 'delete']);
export type EditOperation = z.infer<typeof EditOperation>;

export const EditDiff = z.object({
  id: z.string().uuid(),
  sectionPath: z.string().optional(),
  operation: EditOperation,
  from: z.number().int().nonnegative().optional(),
  to: z.number().int().nonnegative().optional(),
  newContent: z.string().optional(),
  oldContent: z.string().optional(),
  explanation: z.string().optional(),
});
export type EditDiff = z.infer<typeof EditDiff>;

export const EditSuggestion = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  agentType: AgentType,
  diffs: z.array(EditDiff),
  summary: z.string(),
  contextSources: z.array(z.string()).optional(),
});
export type EditSuggestion = z.infer<typeof EditSuggestion>;

// ---------------------------------------------------------------------------
// Agent Tool Names
// ---------------------------------------------------------------------------

export const AgentToolName = z.enum([
  'readDocument', 'searchDocuments', 'listDocuments', 'suggestEdits',
  'searchCode', 'readCodeFile',
  'queryGraph', 'getRelatedNodes', 'getDriftAlerts',
  'createFeature', 'updateFeature',
  'createWorkOrder', 'updateWorkOrder', 'batchUpdateWorkOrders',
  'listArtifacts', 'readArtifact',
  'listFeedback', 'categorizeFeedback',
]);
export type AgentToolName = z.infer<typeof AgentToolName>;

// ---------------------------------------------------------------------------
// Agent Stream Events
// ---------------------------------------------------------------------------

export const AgentStreamEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text-delta'), content: z.string() }),
  z.object({ type: z.literal('tool-call'), toolName: AgentToolName, args: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal('tool-result'), toolName: AgentToolName, result: z.unknown() }),
  z.object({ type: z.literal('edit-suggestion'), suggestion: EditSuggestion }),
  z.object({ type: z.literal('confirmation-required'), toolName: AgentToolName, args: z.record(z.string(), z.unknown()), description: z.string() }),
  z.object({ type: z.literal('error'), message: z.string() }),
  z.object({ type: z.literal('done'), usage: z.object({ inputTokens: z.number().int(), outputTokens: z.number().int(), model: z.string() }).optional() }),
]);
export type AgentStreamEvent = z.infer<typeof AgentStreamEvent>;

// ---------------------------------------------------------------------------
// Agent Request
// ---------------------------------------------------------------------------

export const AgentRequest = z.object({
  agentType: AgentType,
  projectId: z.string().uuid(),
  message: z.string(),
  conversationId: z.string().uuid().optional(),
  contextDocumentId: z.string().uuid().optional(),
  contextWorkOrderId: z.string().uuid().optional(),
  attachmentIds: z.array(z.string().uuid()).optional(),
  confirmations: z.array(z.object({
    toolName: AgentToolName,
    args: z.record(z.string(), z.unknown()),
    approved: z.boolean(),
  })).optional(),
});
export type AgentRequest = z.infer<typeof AgentRequest>;

// ---------------------------------------------------------------------------
// LLM Provider Configuration
// ---------------------------------------------------------------------------

export const LLMProvider = z.enum(['openai', 'anthropic', 'ollama', 'openrouter']);
export type LLMProvider = z.infer<typeof LLMProvider>;

export const LLMConfig = z.object({
  provider: LLMProvider,
  model: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(4096),
});
export type LLMConfig = z.infer<typeof LLMConfig>;
