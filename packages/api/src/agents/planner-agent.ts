/**
 * OpenFactory - Planner Agent
 * SPDX-License-Identifier: AGPL-3.0
 */

import { executeAgent, type OrchestratorDeps } from './orchestrator.js';
import type { AgentRequest, AgentStreamEvent } from '@repo/shared/types/agent';

export type ExtractionStrategy = 'feature_slice' | 'specialist' | 'custom';

export async function executePlannerAgent(request: Omit<AgentRequest, 'agentType'>, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ ...request, agentType: 'planner' }, deps);
}

export async function extractWorkOrders(projectId: string, blueprintDocumentIds: string[], strategy: ExtractionStrategy, customInstructions: string | undefined, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  const desc: Record<ExtractionStrategy, string> = {
    feature_slice: 'Break each blueprint into vertical slices delivering end-to-end user-facing behavior.',
    specialist: 'Break blueprints into specialist tasks (backend, frontend, DB, testing).',
    custom: customInstructions ?? 'Follow custom extraction instructions.',
  };
  return executeAgent({ agentType: 'planner', projectId, message: `Extract work orders from: ${blueprintDocumentIds.map(id => `document:${id}`).join(', ')}. Strategy: ${strategy} -- ${desc[strategy]}. Use createWorkOrder for each.` }, deps);
}

export async function planPhases(projectId: string, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ agentType: 'planner', projectId, message: 'Review all work orders and propose a phase plan based on dependencies, feature completeness, and risk. Use batchUpdateWorkOrders.' }, deps);
}

export async function generateImplementationPlan(projectId: string, workOrderId: string, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ agentType: 'planner', projectId, message: 'Generate a detailed implementation plan. Read linked blueprint/requirements, search codebase for patterns, produce a step-by-step file-level plan. Use updateWorkOrder.', contextWorkOrderId: workOrderId }, deps);
}

export async function syncWithBlueprints(projectId: string, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ agentType: 'planner', projectId, message: 'Check for drift between work orders and linked blueprints. Suggest updates using updateWorkOrder.' }, deps);
}
