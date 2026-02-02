// SPDX-License-Identifier: AGPL-3.0-only
import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import multipart from "@fastify/multipart";
import databasePlugin from "./plugins/database.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import authPlugin from "./plugins/auth.js";
import swaggerPlugin from "./plugins/swagger.js";
import websocketPlugin from "./plugins/websocket.js";
import authRoutes from "./routes/auth.js";
import orgRoutes from "./routes/organizations.js";
import projectRoutes from "./routes/projects.js";
import artifactRoutes from "./routes/artifacts.js";
import refineryRoutes from "./routes/refinery.js";
import foundryRoutes from "./routes/foundry.js";
import plannerRoutes from "./routes/planner.js";
import validatorRoutes from "./routes/validator.js";
import graphRoutes from "./routes/graph.js";

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

  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
  await app.register(swaggerPlugin);
  await app.register(authPlugin);
  await app.register(websocketPlugin);

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // API routes
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(orgRoutes, { prefix: "/api/organizations" });
  await app.register(projectRoutes, { prefix: "/api" });
  await app.register(artifactRoutes, { prefix: "/api" });
  await app.register(refineryRoutes, { prefix: "/api/projects" });
  await app.register(foundryRoutes, { prefix: "/api/projects" });
  await app.register(plannerRoutes, { prefix: "/api/projects" });
  await app.register(validatorRoutes, { prefix: "/api/projects" });
  await app.register(graphRoutes, { prefix: "/api/projects" });

  return app;
}
