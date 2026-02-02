/**
 * OpenFactory - Foundry Agent
 * SPDX-License-Identifier: AGPL-3.0
 */

import { executeAgent, type OrchestratorDeps } from './orchestrator.js';
import type { AgentRequest, AgentStreamEvent } from '@repo/shared/types/agent';

export async function executeFoundryAgent(request: Omit<AgentRequest, 'agentType'>, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ ...request, agentType: 'foundry' }, deps);
}

export async function draftFeatureBlueprint(projectId: string, featureId: string, blueprintDocumentId: string, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ agentType: 'foundry', projectId, message: 'Draft the Feature Blueprint. Read linked requirements, foundation blueprints, and search the codebase. Cover: solution design, APIs, UI behavior, data models, testing. Present as edit suggestions.', contextDocumentId: blueprintDocumentId }, deps);
}

export async function generateDiagram(projectId: string, diagramDocumentId: string, diagramType: 'flowchart' | 'sequence' | 'class' | 'er' | 'state', instructions: string, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ agentType: 'foundry', projectId, message: `Generate a ${diagramType} Mermaid diagram: ${instructions}. Output as edit suggestion.`, contextDocumentId: diagramDocumentId }, deps);
}

export async function resolveDrift(projectId: string, driftAlertId: string, blueprintDocumentId: string, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ agentType: 'foundry', projectId, message: 'A drift alert was raised. Read the alert, current blueprint, and source of change. Explain the inconsistency and suggest edits to resolve it.', contextDocumentId: blueprintDocumentId }, deps);
}

export async function reviewBlueprints(projectId: string, documentIds: string[], deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ agentType: 'foundry', projectId, message: `Review these blueprints: ${documentIds.map(id => `document:${id}`).join(', ')}. Check for gaps, ambiguity, conflicts, and code alignment.` }, deps);
}
