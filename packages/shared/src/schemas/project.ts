// SPDX-License-Identifier: AGPL-3.0-only
import { z } from "zod";
import { uuidSchema, datetimeSchema } from "./common.js";

export const projectSchema = z.object({ id: uuidSchema, organizationId: uuidSchema, name: z.string().min(1).max(255), slug: z.string(), description: z.string().nullable(), settings: z.record(z.string(), z.unknown()), archivedAt: datetimeSchema.nullable(), createdAt: datetimeSchema, updatedAt: datetimeSchema });
export const projectListItemSchema = z.object({ id: uuidSchema, name: z.string(), slug: z.string(), description: z.string().nullable(), archivedAt: datetimeSchema.nullable(), featureCount: z.number().int(), documentCount: z.number().int(), workOrderCount: z.number().int(), createdAt: datetimeSchema, updatedAt: datetimeSchema });
export const projectDetailSchema = projectSchema.extend({ stats: z.object({ featureCount: z.number().int(), documentCount: z.number().int(), workOrderCount: z.number().int(), artifactCount: z.number().int(), hasCodebaseConnection: z.boolean() }) });
export const createProjectRequestSchema = z.object({ name: z.string().min(1).max(255), description: z.string().max(2000).optional(), templateId: uuidSchema.optional() });
export const updateProjectRequestSchema = z.object({ name: z.string().min(1).max(255).optional(), description: z.string().max(2000).optional(), settings: z.record(z.string(), z.unknown()).optional() });
