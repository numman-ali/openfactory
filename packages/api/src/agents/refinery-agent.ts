/**
 * OpenFactory - Refinery Agent
 * SPDX-License-Identifier: AGPL-3.0
 */

import { executeAgent, type OrchestratorDeps } from './orchestrator.js';
import type { AgentRequest, AgentStreamEvent } from '@repo/shared/types';

export async function executeRefineryAgent(request: Omit<AgentRequest, 'agentType'>, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ ...request, agentType: 'refinery' }, deps);
}

export async function startInitializationWorkflow(projectId: string, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ agentType: 'refinery', projectId, message: `I'd like to start defining requirements. Walk me through: 1) Business problem, 2) Current solution, 3) Desired outcome, 4) Target users. Then draft the Product Overview and suggest initial features.` }, deps);
}

export async function startReverseEngineerWorkflow(projectId: string, artifactIds: string[], useCodebase: boolean, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  const refs = [artifactIds.length > 0 ? `I've uploaded ${artifactIds.length} artifact(s).` : '', useCodebase ? 'Analyze the connected codebase too.' : ''].filter(Boolean).join(' ');
  return executeAgent({ agentType: 'refinery', projectId, message: `Reverse-engineer requirements from existing materials. ${refs} Draft Product Overview, identify features, draft Feature Requirements. Present as edit suggestions.`, attachmentIds: artifactIds.length > 0 ? artifactIds : undefined }, deps);
}

export async function startReviewWorkflow(projectId: string, documentIds: string[], deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ agentType: 'refinery', projectId, message: `Review these documents: ${documentIds.map(id => `document:${id}`).join(', ')}. Check for Ambiguity, Gaps, Conflicts, and Duplication.` }, deps);
}
