// SPDX-License-Identifier: AGPL-3.0-only
import { z } from "zod";
import { uuidSchema, datetimeSchema, userRefSchema } from "./common.js";

export const documentTypeSchema = z.enum(["product_overview", "feature_requirements", "technical_requirements", "foundation_blueprint", "system_diagram", "feature_blueprint"]);
export const refineryDocumentTypeSchema = z.enum(["product_overview", "feature_requirements", "technical_requirements"]);
export const foundryDocumentTypeSchema = z.enum(["foundation_blueprint", "system_diagram", "feature_blueprint"]);
export const tiptapContentSchema = z.record(z.string(), z.unknown());
export const documentListItemSchema = z.object({ id: uuidSchema, type: documentTypeSchema, title: z.string(), slug: z.string(), featureId: uuidSchema.nullable(), featureName: z.string().nullable(), sortOrder: z.number().int(), createdBy: userRefSchema.nullable(), updatedAt: datetimeSchema, createdAt: datetimeSchema });
export const documentDetailSchema = z.object({ id: uuidSchema, type: documentTypeSchema, title: z.string(), slug: z.string(), featureId: uuidSchema.nullable(), content: tiptapContentSchema.nullable(), diagramSource: z.string().nullable(), sortOrder: z.number().int(), createdBy: userRefSchema.nullable(), createdAt: datetimeSchema, updatedAt: datetimeSchema });
export const createRefineryDocumentRequestSchema = z.object({ type: refineryDocumentTypeSchema, title: z.string().min(1).max(500), featureId: uuidSchema.optional(), templateId: uuidSchema.optional(), content: tiptapContentSchema.optional() });
export const createFoundryBlueprintRequestSchema = z.object({ type: foundryDocumentTypeSchema, title: z.string().min(1).max(500), featureId: uuidSchema.optional(), templateId: uuidSchema.optional(), content: tiptapContentSchema.optional(), diagramSource: z.string().optional() });
export const updateDocumentRequestSchema = z.object({ title: z.string().min(1).max(500).optional(), sortOrder: z.number().int().optional(), diagramSource: z.string().optional() });
export const documentVersionListItemSchema = z.object({ id: uuidSchema, versionNumber: z.number().int().positive(), changeSummary: z.string().nullable(), createdBy: userRefSchema.nullable(), createdAt: datetimeSchema });
export const createVersionRequestSchema = z.object({ changeSummary: z.string().max(1000).optional() });
