// SPDX-License-Identifier: AGPL-3.0-only
import { z } from "zod";
import { uuidSchema, datetimeSchema, paginationRequestSchema } from "./common.js";

export const graphEntityTypeSchema = z.enum(["document", "work_order", "feature", "feedback_item", "artifact", "codebase_file"]);
export const graphEdgeTypeSchema = z.enum(["derives_from", "shared_context", "implements", "feedback_on", "parent_of", "references", "blocks", "related_to"]);
export const driftTypeSchema = z.enum(["code_drift", "requirements_drift", "foundation_drift", "work_order_drift"]);
export const driftSeveritySchema = z.enum(["low", "medium", "high"]);
export const driftAlertStatusSchema = z.enum(["open", "acknowledged", "resolved", "dismissed"]);
export const graphNodeListItemSchema = z.object({ id: uuidSchema, entityType: graphEntityTypeSchema, entityId: uuidSchema, label: z.string(), metadata: z.record(z.string(), z.unknown()), contentHash: z.string().nullable(), lastSyncedAt: datetimeSchema.nullable(), edgeCount: z.number().int() });
export const nodeRefSchema = z.object({ id: uuidSchema, entityType: graphEntityTypeSchema, entityId: uuidSchema, label: z.string() });
export const edgeListItemSchema = z.object({ id: uuidSchema, edgeType: graphEdgeTypeSchema, sourceNode: z.object({ id: uuidSchema, entityType: graphEntityTypeSchema, label: z.string() }), targetNode: z.object({ id: uuidSchema, entityType: graphEntityTypeSchema, label: z.string() }), metadata: z.record(z.string(), z.unknown()), createdAt: datetimeSchema });
export const createEdgeRequestSchema = z.object({ sourceNodeId: uuidSchema, targetNodeId: uuidSchema, edgeType: graphEdgeTypeSchema, metadata: z.record(z.string(), z.unknown()).optional() });
export const driftAlertSchema = z.object({ id: uuidSchema, driftType: driftTypeSchema, description: z.string(), severity: driftSeveritySchema, status: driftAlertStatusSchema, sourceNode: z.object({ id: uuidSchema, entityType: graphEntityTypeSchema, label: z.string() }), targetNode: z.object({ id: uuidSchema, entityType: graphEntityTypeSchema, label: z.string() }).nullable(), createdAt: datetimeSchema, updatedAt: datetimeSchema });
export const updateDriftAlertRequestSchema = z.object({ status: z.enum(["acknowledged", "resolved", "dismissed"]) });
export const listDriftAlertsQuerySchema = paginationRequestSchema.extend({ status: z.string().optional(), driftType: z.string().optional(), severity: z.string().optional() });
