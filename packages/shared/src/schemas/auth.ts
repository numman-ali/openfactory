// SPDX-License-Identifier: AGPL-3.0-only
import { z } from "zod";
import { uuidSchema, datetimeSchema } from "./common.js";

export const signupRequestSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1).max(255), organizationName: z.string().min(1).max(255) });
export const signupResponseSchema = z.object({
  user: z.object({ id: uuidSchema, email: z.string().email(), name: z.string() }),
  organization: z.object({ id: uuidSchema, name: z.string(), slug: z.string() }),
  session: z.object({ token: z.string(), expiresAt: datetimeSchema }),
});
export const signinRequestSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const signinResponseSchema = z.object({
  user: z.object({ id: uuidSchema, email: z.string().email(), name: z.string(), avatarUrl: z.string().nullable() }),
  session: z.object({ token: z.string(), expiresAt: datetimeSchema }),
});
export const forgotPasswordRequestSchema = z.object({ email: z.string().email() });
export const resetPasswordRequestSchema = z.object({ token: z.string().min(1), newPassword: z.string().min(8) });
export const apiKeyScopeSchema = z.enum(["mcp:read", "mcp:write", "validator:write"]);
export const apiKeySchema = z.object({ id: uuidSchema, name: z.string(), keyPrefix: z.string(), scopes: z.array(apiKeyScopeSchema), projectId: uuidSchema.nullable(), lastUsedAt: datetimeSchema.nullable(), expiresAt: datetimeSchema.nullable(), createdAt: datetimeSchema });
export const createApiKeyRequestSchema = z.object({ name: z.string().min(1).max(255), scopes: z.array(apiKeyScopeSchema).min(1), projectId: uuidSchema.optional(), expiresAt: datetimeSchema.optional() });
export const createApiKeyResponseSchema = apiKeySchema.extend({ key: z.string() });
