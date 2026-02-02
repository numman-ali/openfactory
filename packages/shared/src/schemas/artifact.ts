// SPDX-License-Identifier: AGPL-3.0-only
import { z } from "zod";
import { uuidSchema, datetimeSchema, userRefSchema, paginationRequestSchema } from "./common.js";

export const processingStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);
export interface ArtifactFolderTreeItem { id: string; name: string; parentId: string | null; sortOrder: number; artifactCount: number; children: ArtifactFolderTreeItem[]; }
export const artifactFolderTreeItemSchema: z.ZodType<ArtifactFolderTreeItem> = z.object({ id: uuidSchema, name: z.string(), parentId: uuidSchema.nullable(), sortOrder: z.number().int(), artifactCount: z.number().int(), children: z.lazy(() => z.array(artifactFolderTreeItemSchema)) });
export const createArtifactFolderRequestSchema = z.object({ name: z.string().min(1).max(255), parentId: uuidSchema.optional() });
export const updateArtifactFolderRequestSchema = z.object({ name: z.string().min(1).max(255).optional(), parentId: uuidSchema.nullable().optional(), sortOrder: z.number().int().optional() });
export const artifactListItemSchema = z.object({ id: uuidSchema, name: z.string(), fileName: z.string(), mimeType: z.string(), fileSize: z.number().int(), folderId: uuidSchema.nullable(), processingStatus: processingStatusSchema, uploadedBy: userRefSchema.nullable(), createdAt: datetimeSchema });
export const artifactDetailSchema = artifactListItemSchema.extend({ extractedText: z.string().nullable(), updatedAt: datetimeSchema });
export const updateArtifactRequestSchema = z.object({ name: z.string().min(1).max(500).optional(), folderId: uuidSchema.nullable().optional() });
export const listArtifactsQuerySchema = paginationRequestSchema.extend({ folderId: z.string().optional(), search: z.string().optional(), mimeType: z.string().optional() });
