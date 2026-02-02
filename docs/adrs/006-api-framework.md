# ADR-006: API Framework

**Status:** Proposed
**Date:** 2026-02-02

## Context

OpenFactory's API server handles REST endpoints, WebSocket connections (agent streaming, collaboration), background job orchestration, and MCP server hosting. We need a Node.js HTTP framework.

Options considered:
1. **Fastify 5** - High-performance, TypeScript-native, plugin-based Node.js framework
2. **Express 4/5** - The ubiquitous Node.js framework
3. **Hono** - Ultrafast, lightweight framework for edge/serverless
4. **tRPC** - End-to-end type-safe API framework
5. **Next.js API Routes** - API routes within the Next.js application

## Decision

Use **Fastify 5** as the API server framework.

## Consequences

**Positive:**
- 2-3x higher throughput than Express (70-80K vs 20-30K req/s)
- First-class TypeScript support (native, not community @types)
- Built-in JSON Schema validation (Ajv) pairs with Zod via `fastify-type-provider-zod`
- Plugin encapsulation: each module (refinery, foundry, planner, validator) is a separate Fastify plugin with isolated routes and decorators
- Auto-generated OpenAPI spec from route schemas
- WebSocket support via `@fastify/websocket`
- Mature ecosystem: CORS, JWT, rate limiting, static files as first-party plugins
- Active development, stable v5 release

**Negative:**
- Smaller community than Express (though growing rapidly)
- Plugin encapsulation model has a learning curve
- Some Express middleware has no Fastify equivalent (though `@fastify/express` provides a compatibility layer)
- Fewer tutorials and Stack Overflow answers compared to Express

**Why not Express?**
Express 5 is still in beta after years. Express 4's TypeScript support is retrofitted. For a greenfield TypeScript API with performance requirements (agent streaming, real-time collaboration), Fastify is the modern standard.

**Why not Hono?**
Hono is optimized for edge/serverless environments. Our API server runs as a long-lived Node.js process with WebSocket connections, background jobs, and database connections. Fastify is better suited for this deployment model.

**Why not tRPC?**
tRPC provides end-to-end type safety but couples the API to a specific client. OpenFactory's API must serve multiple clients: the Next.js frontend, the MCP server, external integrations (GitHub, Slack), and the public Validator feedback API. A REST API with OpenAPI spec provides the needed flexibility.

**Why not Next.js API Routes?**
Separating the API server from the frontend gives us independent scaling, clearer separation of concerns, and the ability to run the API without Next.js (e.g., for MCP-only deployments). Next.js API Routes also lack WebSocket support and background job integration.

**Plugin Architecture:**

```typescript
// packages/api/src/app.ts
const app = fastify()

// Register module plugins
app.register(authPlugin, { prefix: '/api/auth' })
app.register(orgPlugin, { prefix: '/api/organizations' })
app.register(projectPlugin, { prefix: '/api/projects' })
app.register(refineryPlugin, { prefix: '/api/projects/:projectId/refinery' })
app.register(foundryPlugin, { prefix: '/api/projects/:projectId/foundry' })
app.register(plannerPlugin, { prefix: '/api/projects/:projectId/planner' })
app.register(validatorPlugin, { prefix: '/api/projects/:projectId/validator' })
app.register(graphPlugin, { prefix: '/api/projects/:projectId/graph' })
app.register(artifactPlugin, { prefix: '/api/projects/:projectId/artifacts' })
app.register(mcpPlugin, { prefix: '/api/mcp' })
```
