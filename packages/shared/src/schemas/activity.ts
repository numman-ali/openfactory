// SPDX-License-Identifier: AGPL-3.0-only
import { z } from "zod";
import { uuidSchema, datetimeSchema, actorSchema, paginationRequestSchema } from "./common.js";

export const activitySchema = z.object({ id: uuidSchema, entityType: z.string(), entityId: uuidSchema, action: z.string(), changes: z.record(z.string(), z.object({ old: z.unknown(), new: z.unknown() })).nullable(), actor: actorSchema, createdAt: datetimeSchema });
export const listActivityQuerySchema = paginationRequestSchema.extend({ entityType: z.string().optional(), entityId: uuidSchema.optional() });
