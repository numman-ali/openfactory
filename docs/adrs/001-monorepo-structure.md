# ADR-001: Monorepo Structure

**Status:** Proposed
**Date:** 2026-02-02

## Context

OpenFactory consists of multiple packages: a Next.js web frontend, a Fastify API server, an MCP server, and shared types/utilities. We need to decide how to organize the codebase and manage builds across packages.

Options considered:
1. **Turborepo + pnpm workspaces** - Build system optimized for JS/TS, written in Rust
2. **Nx** - Full-featured monorepo tool with generators, dependency graph, and plugins
3. **Bare pnpm workspaces** - Package manager workspaces without a build orchestrator
4. **Separate repositories** - One repo per package

## Decision

Use **Turborepo 2.7+ with pnpm 9 workspaces**.

### Structure

```
openfactory/
├── packages/
│   ├── web/           # Next.js 16 frontend (@repo/web)
│   ├── api/           # Fastify API server (@repo/api)
│   ├── mcp-server/    # MCP server (@repo/mcp-server)
│   └── shared/        # Shared types, schemas, utilities (@repo/shared)
├── package.json       # Root workspace config
├── pnpm-workspace.yaml
├── turbo.json         # Turborepo task configuration
└── tsconfig.base.json # Shared TypeScript config
```

### Task Pipeline (turbo.json)

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "persistent": true, "cache": false },
    "lint": {},
    "type-check": {},
    "test": {}
  }
}
```

## Consequences

**Positive:**
- Turborepo handles incremental builds and caching (local + remote), reducing CI times significantly
- pnpm's symlink strategy saves disk space and provides true dependency isolation
- Shared TypeScript types are imported directly (no separate publish step)
- The `@repo/*` namespace prevents npm conflicts
- Turborepo Boundaries (2.3+) can enforce package dependency rules

**Negative:**
- Turborepo is less full-featured than Nx (no generators, fewer plugins)
- Developers must understand pnpm workspace protocol for internal dependencies
- All packages share a single CI pipeline (a change in `shared` triggers all downstream builds)

**Trade-offs vs Nx:**
Nx is more powerful but significantly more opinionated. Turborepo is lighter, easier to eject from, and the standard in the Vercel/Next.js ecosystem. For our project size (4 packages), Turborepo's simplicity is an advantage.
