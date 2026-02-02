// SPDX-License-Identifier: AGPL-3.0-only
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "OpenFactory API",
        description: "AI-native SDLC orchestration platform API",
        version: "0.1.0",
        license: { name: "AGPL-3.0-only", url: "https://www.gnu.org/licenses/agpl-3.0.html" },
      },
      servers: [
        { url: "http://localhost:3001", description: "Local development" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            description: "Session token or API key (of-key-xxx)",
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: "auth", description: "Authentication endpoints" },
        { name: "organizations", description: "Organization management" },
        { name: "projects", description: "Project management" },
        { name: "refinery", description: "Requirements documents" },
        { name: "foundry", description: "Architecture blueprints" },
        { name: "planner", description: "Work order management" },
        { name: "validator", description: "Feedback ingestion and triage" },
        { name: "graph", description: "Knowledge graph" },
        { name: "artifacts", description: "File storage" },
      ],
    },
    transform: jsonSchemaTransform,
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
};

export default fp(swaggerPlugin, { name: "swagger" });
