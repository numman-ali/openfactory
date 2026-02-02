// SPDX-License-Identifier: AGPL-3.0-only

import { z } from "zod";

export const ListWorkOrdersInput = z.object({
  status: z.enum(["ready", "in_progress", "in_review"]).default("ready").describe("Filter by work order status"),
  limit: z.number().int().min(1).max(50).default(10).describe("Maximum number of results to return"),
});

export const GetWorkOrderInput = z.object({
  workOrderId: z.string().uuid().describe("The work order UUID"),
});

export const UpdateWorkOrderStatusInput = z.object({
  workOrderId: z.string().uuid().describe("The work order UUID"),
  status: z.enum(["in_progress", "in_review", "done"]).describe("New status for the work order"),
});

export const SearchContextInput = z.object({
  query: z.string().min(1).describe("Search query string"),
  types: z.array(z.enum(["documents", "blueprints", "artifacts", "code"])).optional().describe("Filter by entity types"),
  limit: z.number().int().min(1).max(20).default(5).describe("Maximum number of results to return"),
});

export type ListWorkOrdersParams = z.infer<typeof ListWorkOrdersInput>;
export type GetWorkOrderParams = z.infer<typeof GetWorkOrderInput>;
export type UpdateWorkOrderStatusParams = z.infer<typeof UpdateWorkOrderStatusInput>;
export type SearchContextParams = z.infer<typeof SearchContextInput>;
