/**
 * OpenFactory - Validator Agent
 * SPDX-License-Identifier: AGPL-3.0
 */

import { executeAgent, type OrchestratorDeps } from './orchestrator.js';
import type { AgentRequest, AgentStreamEvent } from '@repo/shared/types';

export async function executeValidatorAgent(request: Omit<AgentRequest, 'agentType'>, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ ...request, agentType: 'validator' }, deps);
}

export async function triageFeedback(projectId: string, _feedbackIds: string[], deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ agentType: 'validator', projectId, message: 'Triage new feedback items. Categorize each, assign priority (0.0-1.0), and suggest tags. Use categorizeFeedback.' }, deps);
}

export async function generateIssue(projectId: string, _feedbackId: string, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ agentType: 'validator', projectId, message: 'Generate a detailed issue description. Search codebase for relevant code. Include title, reproduction steps, expected vs. actual behavior, code references, and suggested approach.' }, deps);
}

export async function analyzeFeedbackPatterns(projectId: string, deps: OrchestratorDeps): Promise<ReadableStream<AgentStreamEvent>> {
  return executeAgent({ agentType: 'validator', projectId, message: 'Analyze feedback patterns: category distribution, recurring themes, component hotspots, priority trends, and actionable insights.' }, deps);
}
