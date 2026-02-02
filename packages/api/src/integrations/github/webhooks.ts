// SPDX-License-Identifier: AGPL-3.0-only

/**
 * GitHub webhook handler for push events.
 *
 * Verifies webhook signatures using HMAC-SHA256 and triggers
 * reindexing jobs when code is pushed to an indexed branch.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

/**
 * Verify the GitHub webhook signature (HMAC-SHA256).
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const actual = signature.slice("sha256=".length);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export interface PushEvent {
  ref: string;
  repository: {
    full_name: string;
    html_url: string;
  };
  commits: Array<{
    id: string;
    message: string;
    added: string[];
    modified: string[];
    removed: string[];
  }>;
  head_commit: { id: string } | null;
  installation?: { id: number };
}

/**
 * Register the webhook endpoint on Fastify.
 */
export async function registerWebhookRoute(
  app: FastifyInstance,
  webhookSecret: string,
): Promise<void> {
  app.post(
    "/api/integrations/github/webhooks",
    { config: { rawBody: true } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers["x-hub-signature-256"] as string | undefined;
      const event = request.headers["x-github-event"] as string | undefined;
      const rawBody =
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body);

      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        return reply.code(401).send({ error: "Invalid signature" });
      }

      if (event === "push") {
        await handlePushEvent(request.body as PushEvent);
        return reply.code(200).send({ status: "ok" });
      }

      return reply.code(200).send({ status: "ignored", event });
    },
  );
}

async function handlePushEvent(payload: PushEvent): Promise<void> {
  // TODO: Implement push event handling (Backend team)
  // 1. Look up codebase_connection by installation_id and repository URL
  // 2. Check if the push is to the indexed branch (compare payload.ref)
  // 3. Collect modified files from commits
  // 4. Enqueue BullMQ job for incremental reindexing
  // 5. Update codebase_connection.last_indexed_commit
  void payload;
}
