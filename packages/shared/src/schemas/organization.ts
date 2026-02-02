// SPDX-License-Identifier: AGPL-3.0-only
import { z } from "zod";
import { uuidSchema, datetimeSchema } from "./common.js";

export const orgRoleSchema = z.enum(["member", "admin"]);
export const organizationSchema = z.object({ id: uuidSchema, name: z.string().min(1).max(255), slug: z.string(), logoUrl: z.string().nullable(), settings: z.record(z.string(), z.unknown()), createdAt: datetimeSchema, updatedAt: datetimeSchema, deletedAt: datetimeSchema.nullable() });
export const organizationListItemSchema = z.object({ id: uuidSchema, name: z.string(), slug: z.string(), logoUrl: z.string().nullable(), role: orgRoleSchema, memberCount: z.number().int(), projectCount: z.number().int() });
export const organizationMemberSchema = z.object({ id: uuidSchema, userId: uuidSchema, email: z.string().email(), name: z.string(), avatarUrl: z.string().nullable(), role: orgRoleSchema, joinedAt: datetimeSchema });
export const updateOrganizationSchema = z.object({ name: z.string().min(1).max(255).optional(), logoUrl: z.string().nullable().optional(), settings: z.record(z.string(), z.unknown()).optional() });
export const inviteMemberSchema = z.object({ email: z.string().email(), role: orgRoleSchema });
export const updateMemberRoleSchema = z.object({ role: orgRoleSchema });
