// SPDX-License-Identifier: AGPL-3.0-only
import { z } from "zod";
import { uuidSchema, datetimeSchema } from "./common.js";

export const userSchema = z.object({ id: uuidSchema, email: z.string().email(), name: z.string().min(1).max(255), avatarUrl: z.string().nullable(), emailVerified: z.boolean(), createdAt: datetimeSchema, updatedAt: datetimeSchema });
export const sessionInfoSchema = z.object({
  user: z.object({ id: uuidSchema, email: z.string().email(), name: z.string(), avatarUrl: z.string().nullable() }),
  organizationId: uuidSchema, role: z.enum(["member", "admin"]),
});
