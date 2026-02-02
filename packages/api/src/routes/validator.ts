// SPDX-License-Identifier: AGPL-3.0-only
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, sql, lt, count, gte, inArray } from "drizzle-orm";
import { feedbackItems } from "../db/schema/feedback.js";
import { requireAuth } from "../plugins/auth.js";
import { AppError } from "../plugins/error-handler.js";

const validatorRoutes: FastifyPluginAsync = async (fastify) => {
  /** POST /api/projects/:projectId/validator/feedback - public (API key auth) */
  fastify.post<{ Params: { projectId: string } }>("/:projectId/validator/feedback", {
    schema: {
      body: z.object({
        title: z.string().optional(),
        description: z.string().min(1),
        category: z.enum(["bug", "feature_request", "performance", "other"]).optional(),
        browserInfo: z.record(z.string(), z.unknown()).optional(),
        deviceInfo: z.record(z.string(), z.unknown()).optional(),
        sessionData: z.record(z.string(), z.unknown()).optional(),
        externalUserId: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    },
  }, async (request, reply) => {
    // API key auth is handled at the middleware level
    const db = fastify.db;
    const body = request.body as Record<string, unknown>;

    const [item] = await db.insert(feedbackItems).values({
      projectId: request.params.projectId,
      title: (body.title as string) ?? null,
      description: body.description as string,
      category: (body.category as string) ?? null,
      browserInfo: body.browserInfo ?? null,
      deviceInfo: body.deviceInfo ?? null,
      sessionData: body.sessionData ?? null,
      externalUserId: (body.externalUserId as string) ?? null,
      tags: (body.tags as string[]) ?? [],
      status: "new",
    }).returning();

    return reply.status(201).send({
      id: item!.id,
      status: item!.status,
      createdAt: item!.createdAt.toISOString(),
    });
  });

  /** GET /api/projects/:projectId/validator/feedback - list (authenticated) */
  fastify.get<{ Params: { projectId: string }; Querystring: Record<string, string | undefined> }>(
    "/:projectId/validator/feedback",
    { preHandler: [requireAuth] },
    async (request) => {
      const db = fastify.db;
      const { status, category, minPriority, cursor, limit: limitStr, sortBy, sortOrder: sortDir } = request.query;
      const limit = Math.min(parseInt(limitStr ?? "30", 10), 100);

      const conditions = [eq(feedbackItems.projectId, request.params.projectId)];
      if (status) {
        const statuses = status.split(",");
        conditions.push(inArray(feedbackItems.status, statuses));
      }
      if (category) conditions.push(eq(feedbackItems.category, category));
      if (minPriority) conditions.push(gte(feedbackItems.priorityScore, parseFloat(minPriority)));
      if (cursor) conditions.push(lt(feedbackItems.createdAt, new Date(cursor)));

      const orderCol = sortBy === "priorityScore" ? feedbackItems.priorityScore : feedbackItems.createdAt;
      const orderDir = sortDir === "asc" ? sql`ASC` : sql`DESC`;

      const [[totalRow], rows] = await Promise.all([
        db.select({ count: count() }).from(feedbackItems).where(and(...conditions)),
        db.select()
          .from(feedbackItems)
          .where(and(...conditions))
          .orderBy(sql`${orderCol} ${orderDir}`)
          .limit(limit + 1),
      ]);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;

      return {
        feedbackItems: items.map((f) => ({
          id: f.id,
          title: f.title,
          description: f.description,
          category: f.category,
          priorityScore: f.priorityScore,
          status: f.status,
          tags: f.tags,
          browserInfo: f.browserInfo,
          externalUserId: f.externalUserId,
          generatedIssueUrl: f.generatedIssueUrl,
          createdAt: f.createdAt.toISOString(),
        })),
        nextCursor: hasMore ? items[items.length - 1]!.createdAt.toISOString() : null,
        totalCount: totalRow?.count ?? 0,
      };
    },
  );

  /** GET /api/projects/:projectId/validator/feedback/:feedbackId */
  fastify.get<{ Params: { projectId: string; feedbackId: string } }>(
    "/:projectId/validator/feedback/:feedbackId",
    { preHandler: [requireAuth] },
    async (request) => {
      const db = fastify.db;
      const [item] = await db
        .select()
        .from(feedbackItems)
        .where(and(eq(feedbackItems.id, request.params.feedbackId), eq(feedbackItems.projectId, request.params.projectId)))
        .limit(1);
      if (!item) throw new AppError(404, "NOT_FOUND", "Feedback item not found");

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        priorityScore: item.priorityScore,
        status: item.status,
        tags: item.tags,
        browserInfo: item.browserInfo,
        deviceInfo: item.deviceInfo,
        sessionData: item.sessionData,
        externalUserId: item.externalUserId,
        generatedIssueUrl: item.generatedIssueUrl,
        generatedIssueId: item.generatedIssueId,
        sourceAppKey: item.sourceAppKeyId ? { id: item.sourceAppKeyId, name: "" } : null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      };
    },
  );

  /** PATCH /api/projects/:projectId/validator/feedback/:feedbackId */
  fastify.patch<{ Params: { projectId: string; feedbackId: string } }>(
    "/:projectId/validator/feedback/:feedbackId",
    {
      preHandler: [requireAuth],
      schema: {
        body: z.object({
          status: z.enum(["triaged", "in_progress", "resolved", "dismissed"]).optional(),
          category: z.string().optional(),
          priorityScore: z.number().min(0).max(1).optional(),
          tags: z.array(z.string()).optional(),
        }),
      },
    },
    async (request) => {
      const db = fastify.db;
      const body = request.body as Record<string, unknown>;
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      for (const key of ["status", "category", "priorityScore", "tags"]) {
        if (body[key] !== undefined) updates[key] = body[key];
      }

      const [updated] = await db
        .update(feedbackItems)
        .set(updates)
        .where(and(eq(feedbackItems.id, request.params.feedbackId), eq(feedbackItems.projectId, request.params.projectId)))
        .returning();
      if (!updated) throw new AppError(404, "NOT_FOUND", "Feedback item not found");

      return {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        category: updated.category,
        priorityScore: updated.priorityScore,
        tags: updated.tags,
        updatedAt: updated.updatedAt.toISOString(),
      };
    },
  );

  /** POST /api/projects/:projectId/validator/feedback/:feedbackId/generate-issue */
  fastify.post<{ Params: { projectId: string; feedbackId: string } }>(
    "/:projectId/validator/feedback/:feedbackId/generate-issue",
    {
      preHandler: [requireAuth],
      schema: {
        body: z.object({
          integration: z.enum(["github_issues", "jira"]),
          title: z.string().optional(),
          body: z.string().optional(),
          labels: z.array(z.string()).optional(),
        }),
      },
    },
    async () => {
      // TODO: integrate with GitHub/Jira APIs
      throw new AppError(501, "NOT_IMPLEMENTED", "Issue generation not yet implemented");
    },
  );

  /** GET /api/projects/:projectId/validator/stats */
  fastify.get<{ Params: { projectId: string }; Querystring: { since?: string } }>(
    "/:projectId/validator/stats",
    { preHandler: [requireAuth] },
    async (request) => {
      const db = fastify.db;
      const since = request.query.since ? new Date(request.query.since) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const conditions = [eq(feedbackItems.projectId, request.params.projectId), gte(feedbackItems.createdAt, since)];

      const [totalRow] = await db.select({ count: count() }).from(feedbackItems).where(and(...conditions));

      const byCategory = await db
        .select({ category: feedbackItems.category, count: count() })
        .from(feedbackItems)
        .where(and(...conditions))
        .groupBy(feedbackItems.category);

      const byStatus = await db
        .select({ status: feedbackItems.status, count: count() })
        .from(feedbackItems)
        .where(and(...conditions))
        .groupBy(feedbackItems.status);

      const [avgRow] = await db
        .select({ avg: sql<number>`COALESCE(AVG(${feedbackItems.priorityScore}), 0)` })
        .from(feedbackItems)
        .where(and(...conditions));

      return {
        totalCount: totalRow?.count ?? 0,
        byCategory: Object.fromEntries(byCategory.map((r) => [r.category ?? "uncategorized", r.count])),
        byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.count])),
        averagePriorityScore: avgRow?.avg ?? 0,
        topTags: [], // TODO: aggregate tags
        timeline: [], // TODO: daily counts
      };
    },
  );
};

export default validatorRoutes;
