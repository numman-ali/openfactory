// SPDX-License-Identifier: AGPL-3.0-only
import { z } from "zod";
import { uuidSchema, datetimeSchema } from "./common.js";

export const featureSchema = z.object({ id: uuidSchema, projectId: uuidSchema, parentId: uuidSchema.nullable(), name: z.string().min(1).max(255), slug: z.string(), sortOrder: z.number().int(), createdAt: datetimeSchema, updatedAt: datetimeSchema, deletedAt: datetimeSchema.nullable() });
export interface FeatureTreeItem { id: string; name: string; slug: string; parentId: string | null; sortOrder: number; children: FeatureTreeItem[]; }
export const featureTreeItemSchema: z.ZodType<FeatureTreeItem> = z.object({ id: uuidSchema, name: z.string(), slug: z.string(), parentId: uuidSchema.nullable(), sortOrder: z.number().int(), children: z.lazy(() => z.array(featureTreeItemSchema)) });
export const createFeatureRequestSchema = z.object({ name: z.string().min(1).max(255), parentId: uuidSchema.optional() });
export const updateFeatureRequestSchema = z.object({ name: z.string().min(1).max(255).optional(), parentId: uuidSchema.nullable().optional(), sortOrder: z.number().int().optional() });
