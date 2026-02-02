# Tech Stack Validation Report

**Date:** 2026-02-02
**Department:** Research & Architecture
**Status:** Approved

---

## 1. Next.js

**Current Stable Version:** 16.1.1 LTS (December 2025)

**Key Changes Since 2024:**
- Next.js 15 (Oct 2024) introduced async request APIs, React 19 support, and Turbopack dev stabilization
- Next.js 16 (mid-2025) made Turbopack the default for both `dev` and `build`, stabilized React Compiler, introduced `proxy.ts` replacing middleware, Cache Components with `use cache`, Partial Pre-Rendering (PPR), and DevTools MCP
- Routing overhaul with layout deduplication and incremental prefetching
- `cacheLife` and `cacheTag` are now stable APIs

**Security Note:** CVE-2025-55184 (DoS via RSC) and CVE-2025-55183 (source code exposure) affect all 13.x-16.x versions. Pin to latest patched release.

**Planned Usage:** App Router with Server Components, file-system routing, SSR/SSG for the web frontend.

**RECOMMENDATION: Use Next.js 16 (latest LTS patch).** The App Router is fully mature. Server Components are the default rendering model. Key patterns to adopt:
- Default to Server Components; isolate interactivity in small Client Component islands
- Use Suspense boundaries with `loading.tsx` for progressive rendering
- Leverage `use cache` and PPR for optimal caching
- Use the React Compiler (stable in v16) for automatic memoization
- Organize routes with `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx` per segment

No better alternative exists for a full-stack React application with SSR, built-in routing, and the ecosystem we need.

---

## 2. TipTap

**Current Stable Version:** 3.0.x (stable release after 2-month beta)

**Key Changes Since 2024:**
- TipTap v3 is now stable with 8M+ monthly npm downloads
- Extensions consolidated into unified packages (e.g., TableKit)
- Replaced tippy.js with Floating UI for popovers
- MarkViews support added
- SSR rendering support (no browser required for server-side)
- Several previously pro-only extensions released under MIT license
- 2026 roadmap: AI Toolkit for real-time agent-document collaboration, DOCX/PDF conversion improvements

**Planned Usage:** Rich text editor for PRDs, blueprints, work orders with collaborative editing, @mentions, comments, and agent suggestion diffs.

**RECOMMENDATION: Use TipTap v3 (MIT-licensed open source).** It is the most mature extensible rich text editor for our use case. Key decisions:
- Use `@tiptap/extension-collaboration` with Yjs for real-time co-editing
- Leverage the new Floating UI-based menus
- Build custom extensions for: agent suggestion diffs (color-coded accept/reject), @mentions, artifact linking, Mermaid diagram embedding
- The 2026 AI Toolkit aligns with our agent-in-editor pattern but do not depend on it; build our own diff suggestion system

No viable alternative (Lexical is less mature for collaboration; Slate lacks the plugin ecosystem; ProseMirror is what TipTap wraps).

---

## 3. PostgreSQL + pgvector

**Current Stable Version:** PostgreSQL 17.x, pgvector 0.8.0

**Key Changes Since 2024:**
- pgvector 0.8.0 delivers 3-5x query throughput improvements over previous versions
- Binary quantization reduces memory footprint by 32x while maintaining 95% accuracy
- pgvectorscale achieves 471 QPS at 99% recall on 50M vectors (11.4x better than Qdrant)
- Sub-100ms query latencies for similarity search at moderate scale
- Industry consensus: pgvector wins for < 100M vectors; dedicated DBs win for billion-scale

**Planned Usage:** Single database for relational data + vector embeddings for codebase semantic search.

**RECOMMENDATION: Use PostgreSQL + pgvector.** For our use case (codebase embeddings, likely < 10M vectors per project), pgvector is more than sufficient and eliminates an entire infrastructure component. Key benefits:
- Single database to back up, monitor, and scale
- 60-80% cost reduction vs. dedicated vector DB
- Relational data and vectors in the same transactional boundary
- HNSW indexes for approximate nearest neighbor search
- Use binary quantization for large codebases

Only consider a dedicated vector DB (Qdrant) if a single project's codebase exceeds 100M embedded chunks, which is extremely unlikely.

---

## 4. Drizzle ORM vs Prisma

**Current Stable Versions:** Drizzle ORM latest, Prisma latest (Rust-free, multifile schema)

**Key Comparison (2026):**

| Factor | Drizzle | Prisma |
|---|---|---|
| Performance | 2-3x faster queries | Baseline |
| Bundle size | ~7.4 KB | ~6.5 MB |
| Cold start | 10x faster | Baseline |
| TypeScript | Inference-based (heavier on TS compiler) | Code-generated (faster type-checking) |
| SQL control | Full SQL transparency | Abstracted |
| Migration tooling | Drizzle Kit | Prisma Migrate (more mature) |
| GUI | Drizzle Studio | Prisma Studio (more mature) |
| Ecosystem | Growing | Mature (Accelerate, Pulse) |
| Serverless | Excellent | Good |

**RECOMMENDATION: Use Drizzle ORM.** For OpenFactory's use case:
- We are an API server, not serverless edge functions, but Drizzle's performance advantages still matter for codebase indexing and graph traversal queries
- SQL transparency is valuable for complex knowledge graph queries (recursive CTEs, window functions)
- Smaller bundle size benefits our Docker deployment
- Code-first schema definition keeps the schema in TypeScript alongside our types
- The `packages/shared` types can directly reference Drizzle's inferred types

Trade-off: Prisma's migration tooling is more mature, but Drizzle Kit is sufficient for our needs. The performance and SQL control advantages outweigh Prisma's DX edge.

---

## 5. Auth.js (formerly NextAuth)

**Current Stable Version:** Auth.js v5 (RC, but widely used in production with Next.js 16)

**Key Changes Since 2024:**
- Auth.js v5 is a major rewrite; configuration moved to `auth.ts` exporting `signIn`, `signOut`, `auth`, `handlers`
- Framework-agnostic: works with Next.js, SvelteKit, SolidStart
- Auto-infers env vars prefixed with `AUTH_`
- OAuth 1.0 deprecated
- Auth.js project is now part of Better Auth organization
- Better Auth has emerged as a strong TypeScript-native alternative (YC-backed, recommended by Next.js/Nuxt/Astro)

**Planned Usage:** Self-hosted authentication with OAuth, email/password, and role-based access.

**RECOMMENDATION: Use Better Auth instead of Auth.js.** Rationale:
- Better Auth is TypeScript-native from the ground up (not retrofitted)
- Self-hosted by design with full data control (aligns with OpenFactory's privacy-first positioning)
- Database-agnostic with PostgreSQL adapter
- Plugin architecture for 2FA, passkeys, social logins
- Framework-agnostic (works with both Next.js frontend and Fastify API)
- Rapidly growing ecosystem, YC-backed, recommended by major frameworks
- Auth.js v5 remains in a perpetual RC state and the project's governance has shifted

This is a departure from the original spec which suggested NextAuth. Better Auth is the stronger choice for a self-hosted, TypeScript-first open-source project in 2026.

---

## 6. Yjs / Hocuspocus

**Current Stable Version:** Yjs 13.x (v14 in active development), Hocuspocus latest

**Key Changes Since 2024:**
- Yjs has 900K+ weekly downloads, used by Proton Docs, NextCloud, Evernote, ClickUp, Shopify, Monday, Meta, Gitbook, JupyterLab
- Yjs v14 in progress: new event system, delta classes, attribution feature, accept/reject suggestions
- Formal verification of YATA CRDT algorithm via lean-yjs
- Hocuspocus remains the primary WebSocket backend for TipTap collaboration
- Managed alternatives: Tiptap Cloud, Liveblocks, y-sweet

**Planned Usage:** Real-time collaborative editing of all document types (PRDs, blueprints, work orders).

**RECOMMENDATION: Use Yjs + self-hosted Hocuspocus.** This is the only production-proven CRDT stack that integrates directly with TipTap. Key decisions:
- Self-host Hocuspocus WebSocket server (aligns with self-hosted philosophy)
- Persist Yjs document updates to PostgreSQL for durability and version history
- Use `y-prosemirror` for TipTap integration (included in `@tiptap/extension-collaboration`)
- Implement awareness protocol for cursor presence
- Plan for Yjs v14's attribution and suggestion accept/reject features (directly useful for agent diffs)

Production scaling considerations: Hocuspocus can handle thousands of concurrent connections but horizontal scaling requires Redis pub/sub for cross-instance sync. Include Redis as a Hocuspocus adapter from the start.

---

## 7. LLM Abstraction Layer

**Evaluated Options:**
- **LiteLLM** (Python-based, 100+ models, OpenAI-compatible API)
- **Vercel AI SDK** (TypeScript-native, unified API, streaming, structured output, tool calling)
- **Bifrost** (Go-based, 54x faster than LiteLLM)
- **Portkey** (hosted gateway)
- **OpenRouter** (hosted gateway)

**RECOMMENDATION: Use Vercel AI SDK (v6) as the primary LLM abstraction.** Rationale:
- TypeScript-native (matches our entire stack)
- Unified API across OpenAI, Anthropic, Google, Ollama, and more
- Built-in streaming with React integration (SSE to frontend)
- Structured output generation with Zod schemas (type-safe agent responses)
- Tool calling with `ToolLoopAgent` for agent orchestration
- Human-in-the-loop tool approval (matches our agent approval pattern)
- 50-70% faster development than custom implementations
- Free and open source (MIT)
- Massive adoption in the Next.js ecosystem

LiteLLM is Python-based and would require a separate service. Vercel AI SDK gives us the same provider abstraction natively in TypeScript with superior streaming and structured output support. For self-hosted users running Ollama, the AI SDK has an Ollama provider.

---

## 8. MCP SDK

**Current Stable Version:** @modelcontextprotocol/sdk 1.25.2

**Key Changes Since 2024:**
- 21,000+ projects using the SDK on npm
- Supports Streamable HTTP transport (recommended) and stdio
- Server primitives: Tools, Resources, Prompts
- Client features: `listTools`, `callTool`, `listResources`, `readResource`
- Zod v4 peer dependency for schema validation
- MCP spec 2025-11-25: structured tool outputs, OAuth authorization, elicitation, security improvements
- Upcoming: async long-running operations, server discovery via `.well-known` URLs, MCP Registry

**Planned Usage:** MCP server for IDE integration (Cursor, Claude Code, Windsurf) to list/read/update work orders.

**RECOMMENDATION: Use @modelcontextprotocol/sdk (latest).** It is the official TypeScript SDK and the only option for MCP server implementation. Key decisions:
- Use Streamable HTTP transport for the MCP server (not stdio, since we run as a web service)
- Implement tools: `list_work_orders`, `get_work_order`, `update_work_order_status`, `search_context`
- Use Zod v4 for tool input/output schema validation
- Implement project-scoped API key auth per the MCP OAuth spec
- Plan for MCP Registry listing for discoverability

---

## 9. shadcn/ui

**Current State:** Actively maintained, CLI 3.0, Tailwind CSS v4 compatible

**Key Changes Since 2024:**
- 7 new structural components (Field, Input Group, Button Group, Spinner, Kbd, Item, Empty)
- CLI 3.0 with namespaced registry support
- Components can ship their own Tailwind config (keyframes, etc.)
- Remote component registry support
- Tailwind CSS v4 theming integration
- Ecosystem explosion: Motion Primitives (animations), TanCN (TanStack integration), Cult UI (AI code gen)

**Planned Usage:** Base UI component library for all frontend surfaces.

**RECOMMENDATION: Use shadcn/ui (latest) with Tailwind CSS v4.** It remains the best choice for a component library that:
- Is copy-paste (no dependency lock-in, full customization)
- Builds on Radix UI primitives (accessibility, keyboard nav, ARIA)
- Integrates with Tailwind CSS v4
- Has a growing ecosystem for specialized needs
- The new Field component reduces form wiring boilerplate significantly

Use the shadcn CLI to manage components. Extend with custom components for our domain-specific UI (agent panels, diff viewers, graph visualizations).

---

## 10. Turborepo + pnpm

**Current Stable Version:** Turborepo 2.7.5, pnpm 9.x

**Key Changes Since 2024:**
- Turborepo 2.7: DevTools with visual Package/Task Graphs, composable package configs, Biome rule for undeclared env vars
- Turborepo 2.3: Boundaries RFC for enforcing package boundaries
- Turborepo 2.2: Repository query command, affected package detection
- Written in Rust for maximum performance
- Remote caching support for CI

**Planned Usage:** Monorepo orchestration for `packages/web`, `packages/api`, `packages/mcp-server`, `packages/shared`.

**RECOMMENDATION: Use Turborepo + pnpm workspaces.** This is the standard for TypeScript monorepos in 2026. Key decisions:
- Structure: `packages/` for all packages (not `apps/` + `packages/` split, since our Next.js app is also a package)
- Use `@repo/*` namespace for internal packages
- Configure `turbo.json` with tasks: `build`, `dev`, `lint`, `type-check`, `test`
- Enable remote caching in CI (Vercel Remote Cache or self-hosted)
- Use pnpm catalogs for shared dependency versions
- Use the Boundaries feature to enforce package dependency rules

No alternative (Nx is heavier and more opinionated; Lerna is deprecated; bare pnpm workspaces lack task orchestration).

---

## 11. Fastify vs Express

**Current Stable Version:** Fastify 5.x, Express 4.x (Express 5 still in beta)

**Key Comparison (2026):**

| Factor | Fastify | Express |
|---|---|---|
| Throughput | 70-80K req/s | 20-30K req/s |
| TypeScript | First-class (native) | Community types (@types/express) |
| Validation | Built-in JSON Schema (Ajv) | External libraries |
| Plugin system | Encapsulated plugins | Middleware chain |
| OpenAPI | Auto-generation from schemas | Manual (swagger-jsdoc) |
| Ecosystem | Growing, first-party plugins | Massive, mature |
| Learning curve | Moderate | Low |

**RECOMMENDATION: Use Fastify.** For OpenFactory's API server:
- 2-3x better throughput matters for agent streaming and real-time collaboration
- Native TypeScript support aligns with our all-TypeScript stack
- Built-in JSON Schema validation pairs with Zod (via `fastify-type-provider-zod`)
- Plugin encapsulation is better architecture for our modular API (refinery, foundry, planner, validator as separate plugins)
- Auto-generated OpenAPI spec from route schemas
- WebSocket support via `@fastify/websocket` for real-time features

Express 5 is still in beta after years. Fastify is the modern standard for new Node.js API servers.

---

## 12. Zod

**Current Stable Version:** 4.3.5

**Key Changes Since 2024:**
- Zod v4: 14x faster string parsing, 7x faster array parsing, 6.5x faster object parsing vs v3
- Type instantiations reduced from 25,000+ (v3) to ~175 (v4)
- @zod/mini: 1.9 KB gzipped for edge/serverless
- New: `z.interface()`, schema metadata, global registry, JSON Schema conversion
- Top-level format APIs: `z.email()`, `z.uuid()`, `z.url()`
- Unified error customization under single `error` param
- MCP SDK requires Zod v4 as peer dependency

**Planned Usage:** Request/response validation across API, shared type definitions, agent structured output schemas.

**RECOMMENDATION: Use Zod v4.** It is the standard for TypeScript validation and is required by both the MCP SDK and the Vercel AI SDK. Key patterns:
- Define all API schemas in `packages/shared` using Zod
- Use `fastify-type-provider-zod` for Fastify route validation
- Use Zod schemas for AI SDK structured output generation
- Use `z.infer<>` for deriving TypeScript types from schemas (single source of truth)
- Use the JSON Schema conversion for OpenAPI spec generation

No alternative worth considering. Zod v4 is the ecosystem standard.

---

## 13. Vitest

**Current Stable Version:** 4.0.18

**Key Changes Since 2024:**
- Vitest 3.0 (Jan 2025): Reporting overhaul, workspace simplification, browser mode improvements
- Vitest 3.2 (Jun 2025): Annotation API, scoped fixtures, AST-aware coverage, watch trigger patterns
- Vitest 4.0 (Oct 2025): Stable Browser Mode, visual regression testing, Playwright traces
- 25M+ weekly npm downloads
- Powered by Vite 7

**Planned Usage:** Unit tests, integration tests, and component tests across all packages.

**RECOMMENDATION: Use Vitest 4.** It is the standard test runner for Vite/TypeScript projects. Key decisions:
- Configure per-package with shared base config in `packages/shared`
- Use `vitest` for unit tests in all packages
- Use `@vitest/browser` with Playwright for component testing in `packages/web`
- Use Supertest with Vitest for API integration tests in `packages/api`
- Enable V8 coverage with AST-aware remapping
- Use the annotation API for test metadata

No alternative (Jest is slower and lacks native ESM/TypeScript support; Vitest is the successor).

---

## 14. Mermaid.js

**Current Stable Version:** 11.12.2

**Key Changes Since 2024:**
- Radar charts added
- New layout and look system (hand-drawn, classic styles)
- Architecture diagram improvements
- Label rendering refactored
- Security updates (DOMPurify, dagre-d3-es)
- AI integration for diagram generation from natural language

**Planned Usage:** System diagrams in Foundry (architecture, ERD, flow diagrams) with visual + code editing.

**RECOMMENDATION: Use Mermaid.js (latest).** It is the standard for text-based diagrams and is well-supported across the ecosystem. Key decisions:
- Render Mermaid in TipTap via a custom node extension
- Support both code editing and visual preview with zoom controls
- Use the sandboxed iframe rendering for security
- Supported diagram types: flowchart, sequence, class, ER, state, gantt, git graph
- Agent can generate/update Mermaid syntax directly

No alternative for text-based diagramming at this maturity level. For interactive editing, consider adding a visual diagram editor in a future phase (e.g., ReactFlow for custom diagrams).

---

## 15. BullMQ + Redis

**Current Stable Version:** BullMQ 5.66.5

**Key Changes Since 2024:**
- Cross-language support (Node.js, Python, Elixir, PHP)
- Deduplication with replace and extend options
- Performance: 50K+ jobs/sec on modern hardware
- Exactly-once semantics (or at-least-once in worst case)
- Repeatable jobs, delayed jobs, rate limiting, job priorities, flow (chained jobs)

**Planned Usage:** Background job queue for codebase indexing, agent tasks, drift detection, notifications, export generation.

**RECOMMENDATION: Use BullMQ + Redis.** It is the standard job queue for Node.js applications. Key decisions:
- Redis serves triple duty: BullMQ jobs, Hocuspocus collaboration pub/sub, session caching
- Use BullMQ flows for chained operations (e.g., index -> embed -> detect drift)
- Use repeatable jobs for periodic drift detection
- Use job priorities for user-initiated vs. background tasks
- Monitor with bull-board UI
- Use rate limiting for LLM API calls

No alternative worth considering for Node.js (Agenda is less maintained; Bee-Queue is simpler but less featured).

---

## 16. Tree-sitter

**Current Stable Version:** tree-sitter 0.25.0 (Node.js bindings)

**Key Changes Since 2024:**
- Active maintenance across the organization
- TypeScript grammar well-maintained at tree-sitter/tree-sitter-typescript
- Grammars available for 100+ languages
- Node.js bindings are native (C++ addon)

**Planned Usage:** Code parsing for codebase indexing pipeline (chunk code into semantic units for embedding).

**RECOMMENDATION: Use tree-sitter for code parsing.** It provides language-aware AST parsing that enables intelligent chunking:
- Parse code into AST nodes (functions, classes, methods, imports)
- Chunk at semantic boundaries (not arbitrary line counts)
- Use tree-sitter-typescript, tree-sitter-javascript, tree-sitter-python, etc. for multi-language support
- Incremental parsing for efficient reindexing (only re-parse changed files)

Note: The Node.js bindings use native C++ addons which require compilation. Include pre-built binaries in the Docker image. Alternative: `web-tree-sitter` (WASM-based) if native bindings cause deployment issues, at some performance cost.

---

## Summary Table

| Technology | Version | Recommendation | Confidence |
|---|---|---|---|
| Next.js | 16.1.1 | Use (App Router, RSC, PPR) | High |
| TipTap | 3.0.x | Use (v3 stable, MIT extensions) | High |
| PostgreSQL + pgvector | 17.x / 0.8.0 | Use (single DB for relational + vector) | High |
| ORM | Drizzle latest | Use Drizzle (performance, SQL control) | High |
| Auth | Better Auth 1.4.x | Use Better Auth (over Auth.js) | High |
| Real-time | Yjs + Hocuspocus | Use (self-hosted, TipTap integration) | High |
| LLM Abstraction | Vercel AI SDK v6 | Use (over LiteLLM; TypeScript-native) | High |
| MCP SDK | 1.25.2 | Use (only option, official SDK) | High |
| UI Components | shadcn/ui | Use (Tailwind v4, Radix primitives) | High |
| Monorepo | Turborepo 2.7 + pnpm 9 | Use (standard for TS monorepos) | High |
| API Framework | Fastify 5.x | Use Fastify (over Express) | High |
| Validation | Zod 4.3.x | Use (ecosystem standard) | High |
| Testing | Vitest 4.0.x | Use (standard for Vite/TS) | High |
| Diagrams | Mermaid.js 11.x | Use (standard for text diagrams) | High |
| Job Queue | BullMQ 5.x + Redis | Use (standard for Node.js jobs) | High |
| Code Parsing | tree-sitter 0.25.0 | Use (language-aware AST parsing) | High |
