// SPDX-License-Identifier: AGPL-3.0-only
import { z } from "zod";

export const uuidSchema = z.uuid();
export const datetimeSchema = z.string().datetime();
export const paginationRequestSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
});
export const paginationResponseSchema = z.object({ nextCursor: z.string().nullable() });
export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.record(z.string(), z.unknown()).optional() }),
});
export const actorSchema = z.object({ id: uuidSchema, name: z.string(), avatarUrl: z.string().nullable().optional(), type: z.enum(["user", "agent", "system"]) });
export const userRefSchema = z.object({ id: uuidSchema, name: z.string() });
export const userRefWithAvatarSchema = userRefSchema.extend({ avatarUrl: z.string().nullable() });
