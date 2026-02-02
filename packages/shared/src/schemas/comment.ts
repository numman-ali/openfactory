// SPDX-License-Identifier: AGPL-3.0-only
import { z } from "zod";
import { uuidSchema, datetimeSchema, userRefSchema } from "./common.js";
import { tiptapContentSchema } from "./document.js";

export interface CommentItem { id: string; content: Record<string, unknown>; threadId: string | null; isAgent: boolean; agentType: string | null; resolved: boolean; createdBy: { id: string; name: string } | null; createdAt: string; replies: CommentItem[]; }
export const commentItemSchema: z.ZodType<CommentItem> = z.object({ id: uuidSchema, content: tiptapContentSchema, threadId: uuidSchema.nullable(), isAgent: z.boolean(), agentType: z.string().nullable(), resolved: z.boolean(), createdBy: userRefSchema.nullable(), createdAt: datetimeSchema, replies: z.lazy(() => z.array(commentItemSchema)) });
export const createCommentRequestSchema = z.object({ content: tiptapContentSchema, threadId: uuidSchema.optional() });
