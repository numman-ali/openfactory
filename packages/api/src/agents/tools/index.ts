/**
 * OpenFactory - Agent Tool Registry
 * SPDX-License-Identifier: AGPL-3.0
 *
 * Defines all tools available to agents with Zod input/output schemas.
 */

import { z } from 'zod';
import { tool } from 'ai';
import type { AgentType } from '@repo/shared/types';

export interface ToolContext {
  projectId: string;
  userId: string;
  readDocument(documentId: string): Promise<unknown>;
  searchDocuments(params: { query: string; documentType?: string; limit?: number }): Promise<unknown>;
  listDocuments(params: { type?: string }): Promise<unknown>;
  suggestEdits(params: { documentId: string; diffs: Array<{ sectionPath?: string; operation: string; oldContent?: string; newContent?: string; explanation?: string }>; summary: string }): Promise<unknown>;
  searchCode(params: { query: string; language?: string; limit?: number }): Promise<unknown>;
  readCodeFile(filePath: string): Promise<unknown>;
  queryGraph(params: { entityType: string; entityId: string; direction?: string; maxDepth?: number }): Promise<unknown>;
  getRelatedNodes(params: { entityType: string; entityId: string }): Promise<unknown>;
  getDriftAlerts(params: { status?: string; driftType?: string }): Promise<unknown>;
  createFeature(params: { name: string; parentFeatureId?: string }): Promise<unknown>;
  updateFeature(params: { featureId: string; name?: string; parentFeatureId?: string }): Promise<unknown>;
  createWorkOrder(params: { title: string; description?: string; phaseId?: string; featureId?: string; status?: string; acceptanceCriteria?: string }): Promise<unknown>;
  updateWorkOrder(params: { workOrderId: string; title?: string; description?: string; status?: string; phaseId?: string; implementationPlan?: string }): Promise<unknown>;
  batchUpdateWorkOrders(params: { updates: Array<{ workOrderId: string; title?: string; status?: string; phaseId?: string }> }): Promise<unknown>;
  listArtifacts(params: { folderId?: string }): Promise<unknown>;
  readArtifact(artifactId: string): Promise<unknown>;
  listFeedback(params: { status?: string; category?: string; limit?: number }): Promise<unknown>;
  categorizeFeedback(params: { feedbackId: string; category: string; priorityScore: number; tags?: string[] }): Promise<unknown>;
}

const readDocumentParams = z.object({ documentId: z.string().uuid() });

const searchDocumentsParams = z.object({
  query: z.string(),
  documentType: z.enum(['product_overview', 'feature_requirements', 'technical_requirements', 'foundation_blueprint', 'system_diagram', 'feature_blueprint']).optional(),
  limit: z.number().int().min(1).max(20).default(5),
});

const listDocumentsParams = z.object({
  type: z.enum(['product_overview', 'feature_requirements', 'technical_requirements', 'foundation_blueprint', 'system_diagram', 'feature_blueprint']).optional(),
});

const suggestEditsParams = z.object({
  documentId: z.string().uuid(),
  diffs: z.array(z.object({
    sectionPath: z.string().optional(),
    operation: z.enum(['insert', 'replace', 'delete']),
    oldContent: z.string().optional(),
    newContent: z.string().optional(),
    explanation: z.string().optional(),
  })),
  summary: z.string(),
});

const searchCodeParams = z.object({ query: z.string(), language: z.string().optional(), limit: z.number().int().min(1).max(20).default(5) });

const readCodeFileParams = z.object({ filePath: z.string() });

const queryGraphParams = z.object({
  entityType: z.enum(['document', 'work_order', 'feature', 'feedback_item', 'artifact', 'codebase_file']),
  entityId: z.string().uuid(),
  direction: z.enum(['upstream', 'downstream', 'both']).default('both'),
  maxDepth: z.number().int().min(1).max(5).default(2),
});

const getRelatedNodesParams = z.object({
  entityType: z.enum(['document', 'work_order', 'feature', 'feedback_item', 'artifact', 'codebase_file']),
  entityId: z.string().uuid(),
});

const getDriftAlertsParams = z.object({
  status: z.enum(['open', 'acknowledged', 'resolved', 'dismissed']).optional().default('open'),
  driftType: z.enum(['code_drift', 'requirements_drift', 'foundation_drift', 'work_order_drift']).optional(),
});

const createFeatureParams = z.object({ name: z.string(), parentFeatureId: z.string().uuid().optional() });

const updateFeatureParams = z.object({ featureId: z.string().uuid(), name: z.string().optional(), parentFeatureId: z.string().uuid().optional() });

const createWorkOrderParams = z.object({
  title: z.string(), description: z.string().optional(), phaseId: z.string().uuid().optional(),
  featureId: z.string().uuid().optional(), status: z.enum(['backlog', 'ready', 'in_progress', 'in_review', 'done']).default('backlog'),
  acceptanceCriteria: z.string().optional(),
});

const updateWorkOrderParams = z.object({
  workOrderId: z.string().uuid(), title: z.string().optional(), description: z.string().optional(),
  status: z.enum(['backlog', 'ready', 'in_progress', 'in_review', 'done']).optional(),
  phaseId: z.string().uuid().optional(), implementationPlan: z.string().optional(),
});

const batchUpdateWorkOrdersParams = z.object({
  updates: z.array(z.object({
    workOrderId: z.string().uuid(), title: z.string().optional(),
    status: z.enum(['backlog', 'ready', 'in_progress', 'in_review', 'done']).optional(),
    phaseId: z.string().uuid().optional(),
  })),
});

const listArtifactsParams = z.object({ folderId: z.string().uuid().optional() });

const readArtifactParams = z.object({ artifactId: z.string().uuid() });

const listFeedbackParams = z.object({
  status: z.enum(['new', 'triaged', 'in_progress', 'resolved', 'dismissed']).optional(),
  category: z.enum(['bug', 'feature_request', 'performance', 'other']).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

const categorizeFeedbackParams = z.object({
  feedbackId: z.string().uuid(), category: z.enum(['bug', 'feature_request', 'performance', 'other']),
  priorityScore: z.number().min(0).max(1), tags: z.array(z.string()).optional(),
});

export function createAgentTools(context: ToolContext) {
  return {
    readDocument: tool({
      description: 'Read the full content of a document by its ID.',
      parameters: readDocumentParams,
      execute: async (params: z.infer<typeof readDocumentParams>) => context.readDocument(params.documentId),
    }),
    searchDocuments: tool({
      description: 'Search across all project documents by keyword or semantic query.',
      parameters: searchDocumentsParams,
      execute: async (params: z.infer<typeof searchDocumentsParams>) => context.searchDocuments(params),
    }),
    listDocuments: tool({
      description: 'List all documents in the project, optionally filtered by type.',
      parameters: listDocumentsParams,
      execute: async (params: z.infer<typeof listDocumentsParams>) => context.listDocuments(params),
    }),
    suggestEdits: tool({
      description: 'Propose structured edit suggestions for a document as a reviewable diff.',
      parameters: suggestEditsParams,
      execute: async (params: z.infer<typeof suggestEditsParams>) => context.suggestEdits(params),
    }),
    searchCode: tool({
      description: 'Semantically search the indexed codebase.',
      parameters: searchCodeParams,
      execute: async (params: z.infer<typeof searchCodeParams>) => context.searchCode(params),
    }),
    readCodeFile: tool({
      description: 'Read the contents of a specific code file.',
      parameters: readCodeFileParams,
      execute: async (params: z.infer<typeof readCodeFileParams>) => context.readCodeFile(params.filePath),
    }),
    queryGraph: tool({
      description: 'Query the knowledge graph for relationships between entities.',
      parameters: queryGraphParams,
      execute: async (params: z.infer<typeof queryGraphParams>) => context.queryGraph(params),
    }),
    getRelatedNodes: tool({
      description: 'Get all directly connected nodes for an entity.',
      parameters: getRelatedNodesParams,
      execute: async (params: z.infer<typeof getRelatedNodesParams>) => context.getRelatedNodes(params),
    }),
    getDriftAlerts: tool({
      description: 'Get active drift alerts for the project.',
      parameters: getDriftAlertsParams,
      execute: async (params: z.infer<typeof getDriftAlertsParams>) => context.getDriftAlerts(params),
    }),
    createFeature: tool({
      description: 'Create a new feature. Requires user confirmation.',
      parameters: createFeatureParams,
      execute: async (params: z.infer<typeof createFeatureParams>) => context.createFeature(params),
    }),
    updateFeature: tool({
      description: 'Update an existing feature. Requires user confirmation.',
      parameters: updateFeatureParams,
      execute: async (params: z.infer<typeof updateFeatureParams>) => context.updateFeature(params),
    }),
    createWorkOrder: tool({
      description: 'Create a new work order. Requires user confirmation.',
      parameters: createWorkOrderParams,
      execute: async (params: z.infer<typeof createWorkOrderParams>) => context.createWorkOrder(params),
    }),
    updateWorkOrder: tool({
      description: 'Update an existing work order. Requires user confirmation.',
      parameters: updateWorkOrderParams,
      execute: async (params: z.infer<typeof updateWorkOrderParams>) => context.updateWorkOrder(params),
    }),
    batchUpdateWorkOrders: tool({
      description: 'Update multiple work orders at once. Requires user confirmation.',
      parameters: batchUpdateWorkOrdersParams,
      execute: async (params: z.infer<typeof batchUpdateWorkOrdersParams>) => context.batchUpdateWorkOrders(params),
    }),
    listArtifacts: tool({
      description: 'List all artifacts uploaded to the project.',
      parameters: listArtifactsParams,
      execute: async (params: z.infer<typeof listArtifactsParams>) => context.listArtifacts(params),
    }),
    readArtifact: tool({
      description: 'Read the extracted text content of an artifact.',
      parameters: readArtifactParams,
      execute: async (params: z.infer<typeof readArtifactParams>) => context.readArtifact(params.artifactId),
    }),
    listFeedback: tool({
      description: 'List feedback items from the Validator inbox.',
      parameters: listFeedbackParams,
      execute: async (params: z.infer<typeof listFeedbackParams>) => context.listFeedback(params),
    }),
    categorizeFeedback: tool({
      description: 'Categorize and assign priority to a feedback item. Requires user confirmation.',
      parameters: categorizeFeedbackParams,
      execute: async (params: z.infer<typeof categorizeFeedbackParams>) => context.categorizeFeedback(params),
    }),
  };
}

export const CONFIRMATION_REQUIRED_TOOLS = new Set([
  'createFeature', 'updateFeature', 'createWorkOrder', 'updateWorkOrder', 'batchUpdateWorkOrders', 'categorizeFeedback',
]);

export const AGENT_TOOL_SETS: Record<AgentType, string[]> = {
  refinery: ['readDocument', 'searchDocuments', 'listDocuments', 'suggestEdits', 'searchCode', 'readCodeFile', 'queryGraph', 'getRelatedNodes', 'getDriftAlerts', 'createFeature', 'updateFeature', 'listArtifacts', 'readArtifact'],
  foundry: ['readDocument', 'searchDocuments', 'listDocuments', 'suggestEdits', 'searchCode', 'readCodeFile', 'queryGraph', 'getRelatedNodes', 'getDriftAlerts', 'listArtifacts', 'readArtifact'],
  planner: ['readDocument', 'searchDocuments', 'listDocuments', 'searchCode', 'readCodeFile', 'queryGraph', 'getRelatedNodes', 'getDriftAlerts', 'createWorkOrder', 'updateWorkOrder', 'batchUpdateWorkOrders', 'listArtifacts', 'readArtifact'],
  validator: ['readDocument', 'searchDocuments', 'listDocuments', 'searchCode', 'readCodeFile', 'queryGraph', 'getRelatedNodes', 'listFeedback', 'categorizeFeedback', 'listArtifacts', 'readArtifact'],
};
