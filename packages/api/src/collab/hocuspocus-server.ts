// SPDX-License-Identifier: AGPL-3.0-only

import { Server, type Hocuspocus } from "@hocuspocus/server";
import { Database as DatabaseExtension } from "@hocuspocus/extension-database";
import { Redis } from "@hocuspocus/extension-redis";
import { Logger } from "@hocuspocus/extension-logger";
import IORedis from "ioredis";
import { eq } from "drizzle-orm";
import { documents } from "../db/schema/projects.js";
import { sessions, users, apiKeys } from "../db/schema/users.js";
import type { Database } from "../db/connection.js";

/** Extract the document UUID from a Hocuspocus document name like "doc:<uuid>" */
function parseDocumentId(documentName: string): string | null {
  const match = /^doc:([0-9a-f-]{36})$/i.exec(documentName);
  return match?.[1] ?? null;
}

interface HocuspocusConfig {
  port: number;
  db: Database;
  redisUrl?: string;
}

export function createHocuspocusServer({ port, db, redisUrl }: HocuspocusConfig): Hocuspocus {
  const extensions = [];

  // Database persistence: load/store Yjs state from documents table
  extensions.push(
    new DatabaseExtension({
      async fetch({ documentName }) {
        const docId = parseDocumentId(documentName);
        if (!docId) return null;

        const [doc] = await db
          .select({ yjsState: documents.yjsState })
          .from(documents)
          .where(eq(documents.id, docId))
          .limit(1);

        if (!doc?.yjsState) return null;
        return new Uint8Array(doc.yjsState);
      },

      async store({ documentName, state }) {
        const docId = parseDocumentId(documentName);
        if (!docId) return;

        await db
          .update(documents)
          .set({
            yjsState: Buffer.from(state),
            updatedAt: new Date(),
          })
          .where(eq(documents.id, docId));
      },
    })
  );

  // Redis pub/sub for multi-instance synchronization
  if (redisUrl) {
    extensions.push(
      new Redis({
        createClient: () => new IORedis(redisUrl),
      })
    );
  }

  // Logging
  extensions.push(
    new Logger({
      log: process.env["NODE_ENV"] !== "production"
        ? (...args: unknown[]) => console.log(...args)
        : () => {},
      onChange: false,
      onLoadDocument: true,
      onConnect: true,
      onDisconnect: true,
    })
  );

  const server = Server.configure({
    port,
    extensions,

    async onAuthenticate({ token, documentName }) {
      if (!token) {
        throw new Error("Authentication required");
      }

      // Check if it's an API key
      if (token.startsWith("of-key-")) {
        const prefix = token.slice(0, 15);
        const [key] = await db
          .select()
          .from(apiKeys)
          .where(eq(apiKeys.keyPrefix, prefix))
          .limit(1);
        if (!key || key.revokedAt) {
          throw new Error("Invalid API key");
        }
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, key.userId))
          .limit(1);
        if (!user) {
          throw new Error("User not found");
        }

        return {
          user: {
            id: user.id,
            name: user.name ?? "Anonymous",
            email: user.email,
            avatarUrl: user.avatarUrl,
          },
        };
      }

      // Session token lookup
      const [sess] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, token))
        .limit(1);
      if (!sess || (sess.expiresAt && new Date(sess.expiresAt) < new Date())) {
        throw new Error("Invalid or expired session");
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, sess.userId))
        .limit(1);
      if (!user) {
        throw new Error("User not found");
      }

      // Verify the document exists
      const docId = parseDocumentId(documentName);
      if (docId) {
        const [doc] = await db
          .select({ id: documents.id })
          .from(documents)
          .where(eq(documents.id, docId))
          .limit(1);
        if (!doc) {
          throw new Error("Document not found");
        }
      }

      return {
        user: {
          id: user.id,
          name: user.name ?? "Anonymous",
          email: user.email,
          avatarUrl: user.avatarUrl,
        },
      };
    },
  });

  return server;
}
