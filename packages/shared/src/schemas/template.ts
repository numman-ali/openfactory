// SPDX-License-Identifier: AGPL-3.0-only
import { z } from "zod";
import { uuidSchema, datetimeSchema } from "./common.js";

export const templateTypeSchema = z.enum(["refinery", "foundry", "planner_extraction", "planner_work_order", "planner_phase"]);
export const templateListItemSchema = z.object({ id: uuidSchema, type: templateTypeSchema, name: z.string(), description: z.string().nullable(), isDefault: z.boolean(), createdAt: datetimeSchema });
export const createTemplateRequestSchema = z.object({ name: z.string().min(1).max(255), type: templateTypeSchema, description: z.string().max(2000).optional(), content: z.record(z.string(), z.unknown()) });
