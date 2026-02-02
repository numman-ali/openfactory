// SPDX-License-Identifier: AGPL-3.0-only
import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import databasePlugin from "./plugins/database.js";
import errorHandlerPlugin from "./plugins/error-handler.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env["LOG_LEVEL"] ?? "info",
      transport: process.env["NODE_ENV"] !== "production" ? { target: "pino-pretty" } : undefined,
    },
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: process.env["CORS_ORIGIN"] ?? true, credentials: true });
  await app.register(sensible);
  await app.register(errorHandlerPlugin);
  await app.register(databasePlugin);

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  return app;
}
