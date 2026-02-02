// SPDX-License-Identifier: AGPL-3.0-only

/**
 * GitHub webhook receiver and event handlers.
 *
 * Verifies webhook signatures using HMAC-SHA256, then dispatches
 * events to the appropriate handler. Supports push events (trigger
 * reindexing) and installation events (store/remove installations).
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { PushEvent, InstallationEvent } from "./types.js";
import { clearInstallationToken } from "./app.js";

/**
 * Verify the GitHub webhook signature (HMAC-SHA256).
 *
 * Uses timing-safe comparison to prevent timing attacks.
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

/**
 * Register the webhook endpoint on Fastify.
 *
 * POST /api/integrations/github/webhooks
 *
 * Verifies the signature header, then routes by event type:
 *   - push -> handlePushEvent (trigger reindexing)
 *   - installation -> handleInstallationEvent (store/remove installation)
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
      const deliveryId = request.headers["x-github-delivery"] as string | undefined;
      const rawBody =
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body);

      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        return reply.code(401).send({ error: "Invalid signature" });
      }

      switch (event) {
        case "push":
          await handlePushEvent(request.body as PushEvent, deliveryId);
          return reply.code(200).send({ status: "ok", event: "push" });

        case "installation":
          await handleInstallationEvent(request.body as InstallationEvent, deliveryId);
          return reply.code(200).send({ status: "ok", event: "installation" });

        default:
          return reply.code(200).send({ status: "ignored", event });
      }
    },
  );
}

/**
 * Handle a push event by enqueueing a reindexing job.
 *
 * Steps:
 * 1. Extract the branch name from the ref (refs/heads/<branch>)
 * 2. Collect modified file paths from all commits
 * 3. Enqueue a BullMQ job for incremental reindexing
 */
async function handlePushEvent(payload: PushEvent, deliveryId?: string): Promise<void> {
  const branch = payload.ref.replace("refs/heads/", "");
  const repoFullName = payload.repository.full_name;
  const installationId = payload.installation?.id;

  if (!installationId) {
    console.warn(`[webhook:push] No installation ID in push event for ${repoFullName}`);
    return;
  }

  // Collect all changed file paths across commits.
  const changedFiles = new Set<string>();
  for (const commit of payload.commits) {
    for (const file of [...commit.added, ...commit.modified]) {
      changedFiles.add(file);
    }
  }

  const removedFiles = new Set<string>();
  for (const commit of payload.commits) {
    for (const file of commit.removed) {
      removedFiles.add(file);
    }
  }

  // TODO: Enqueue BullMQ reindexing job (Backend team)
  // await reindexQueue.add('reindex', {
  //   installationId,
  //   repository: repoFullName,
  //   branch,
  //   headCommitSha: payload.after,
  //   changedFiles: [...changedFiles],
  //   removedFiles: [...removedFiles],
  //   deliveryId,
  // });

  console.log(
    `[webhook:push] ${repoFullName}@${branch}: ` +
      `${changedFiles.size} changed, ${removedFiles.size} removed ` +
      `(delivery: ${deliveryId ?? "unknown"})`,
  );
}

/**
 * Handle installation events (app installed, uninstalled, etc.).
 *
 * - created: Store the installation ID for the account
 * - deleted: Remove the installation and clear cached tokens
 * - suspend/unsuspend: Update installation status
 */
async function handleInstallationEvent(
  payload: InstallationEvent,
  deliveryId?: string,
): Promise<void> {
  const installationId = payload.installation.id;
  const account = payload.installation.account.login;
  const action = payload.action;

  switch (action) {
    case "created": {
      // TODO: Persist installation record (Backend team)
      // Store { installationId, accountLogin: account, repositories: payload.repositories }
      console.log(
        `[webhook:installation] App installed for ${account} ` +
          `(installation: ${installationId}, delivery: ${deliveryId ?? "unknown"})`,
      );
      break;
    }

    case "deleted": {
      clearInstallationToken(installationId);
      // TODO: Remove installation record and associated codebase connections (Backend team)
      console.log(
        `[webhook:installation] App uninstalled from ${account} ` +
          `(installation: ${installationId}, delivery: ${deliveryId ?? "unknown"})`,
      );
      break;
    }

    case "suspend": {
      clearInstallationToken(installationId);
      // TODO: Mark installation as suspended (Backend team)
      console.log(
        `[webhook:installation] Installation suspended for ${account} ` +
          `(installation: ${installationId})`,
      );
      break;
    }

    case "unsuspend": {
      // TODO: Mark installation as active (Backend team)
      console.log(
        `[webhook:installation] Installation unsuspended for ${account} ` +
          `(installation: ${installationId})`,
      );
      break;
    }

    default:
      console.log(`[webhook:installation] Unhandled action: ${action}`);
  }
}
