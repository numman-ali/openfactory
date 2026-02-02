// SPDX-License-Identifier: AGPL-3.0-only
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { users, sessions, organizationMembers } from "../db/schema/users.js";
import { organizations } from "../db/schema/organizations.js";
import { requireAuth } from "../plugins/auth.js";
import { AppError } from "../plugins/error-handler.js";

const authRoutes: FastifyPluginAsync = async (fastify) => {
  /** POST /api/auth/signup */
  fastify.post("/signup", {
    schema: {
      body: z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
        organizationName: z.string().min(1),
      }),
    },
  }, async (request, reply) => {
    const body = request.body as {
      email: string; password: string; name: string; organizationName: string;
    };
    const { email, name, organizationName } = body;
    // body.password will be used when better-auth is integrated

    const db = fastify.db;

    // Check existing user
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) throw new AppError(409, "EMAIL_EXISTS", "An account with this email already exists");

    // Create user
    // TODO: integrate better-auth for password hashing
    const [user] = await db.insert(users).values({
      email,
      name,
      emailVerified: false,
    }).returning();

    // Store password hash (in a real app, use better-auth; storing in accounts or a dedicated table)
    // For now, we rely on better-auth integration for password management

    // Create organization
    const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const [org] = await db.insert(organizations).values({
      name: organizationName,
      slug,
      settings: {},
    }).returning();

    // Add user as admin
    await db.insert(organizationMembers).values({
      organizationId: org!.id,
      userId: user!.id,
      role: "admin",
    });

    // Create session
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await db.insert(sessions).values({
      userId: user!.id,
      token,
      expiresAt,
    });

    return reply.status(201).send({
      user: { id: user!.id, email: user!.email, name: user!.name },
      organization: { id: org!.id, name: org!.name, slug: org!.slug },
      session: { token, expiresAt: expiresAt.toISOString() },
    });
  });

  /** POST /api/auth/signin */
  fastify.post("/signin", {
    schema: {
      body: z.object({
        email: z.string().email(),
        password: z.string(),
      }),
    },
  }, async (request, reply) => {
    const { email } = request.body as { email: string; password: string };
    const db = fastify.db;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");

    // TODO: verify password hash via better-auth
    // For now, create session for any existing user (placeholder)

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(sessions).values({ userId: user.id, token, expiresAt });

    return reply.status(200).send({
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      session: { token, expiresAt: expiresAt.toISOString() },
    });
  });

  /** POST /api/auth/signout */
  fastify.post("/signout", { preHandler: [requireAuth] }, async (request, reply) => {
    const db = fastify.db;
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      await db.delete(sessions).where(eq(sessions.token, token));
    }
    return reply.status(204).send();
  });

  /** GET /api/auth/session */
  fastify.get("/session", { preHandler: [requireAuth] }, async (request) => {
    const db = fastify.db;
    const [member] = await db
      .select({ organizationId: organizationMembers.organizationId, role: organizationMembers.role })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, request.user.id))
      .limit(1);

    return {
      user: {
        id: request.user.id,
        email: request.user.email,
        name: request.user.name,
        avatarUrl: request.user.avatarUrl,
      },
      organizationId: member?.organizationId ?? null,
      role: member?.role ?? null,
    };
  });

  /** POST /api/auth/forgot-password */
  fastify.post("/forgot-password", {
    schema: {
      body: z.object({ email: z.string().email() }),
    },
  }, async () => {
    // Always return success to prevent email enumeration
    return { message: "If an account exists, a reset email has been sent." };
  });

  /** POST /api/auth/reset-password */
  fastify.post("/reset-password", {
    schema: {
      body: z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      }),
    },
  }, async () => {
    // TODO: implement token verification and password update via better-auth
    throw new AppError(501, "NOT_IMPLEMENTED", "Password reset not yet implemented");
  });
};

export default authRoutes;
