# OpenFactory - Project Context

## What Is This Project?

OpenFactory is an open-source AI-native SDLC orchestration platform. It guides software teams through a structured pipeline: Requirements (Refinery) -> Architecture (Foundry) -> Tasks (Planner) -> Feedback (Validator). A knowledge graph connects all artifacts so changes propagate automatically. AI agents assist at every stage with human-in-the-loop approval.

The full specification lives at `docs/specs/openfactory-specification.md`. 

## Organizational Structure

This project is built by a swarm of AI agents organized into departments. Each department has a lead and its own team/task list.

### Executive Team (`openfactory-exec`)
- **Program Director** (top-level lead) -- coordinates all departments, reviews plans, resolves cross-department conflicts
- Department heads report here

### Departments

| Department | Team Name | Responsibility |
|---|---|---|
| Research & Architecture | `openfactory-research` | Tech stack validation, API contracts, data models, ADRs |
| Backend Engineering | `openfactory-backend` | Database, API layer, auth, services, WebSocket infrastructure |
| Frontend Engineering | `openfactory-frontend` | Next.js app, module UIs, editor integration, real-time collab UI |
| AI & Intelligence | `openfactory-ai` | Agent orchestrator, LLM abstraction, embeddings, knowledge graph, drift detection |
| Platform & Integrations | `openfactory-platform` | GitHub App, MCP server, codebase indexer, Slack/Jira, Docker/deployment |

## Project Structure

```
openfactory/
├── CLAUDE.md                          # This file - read by all agents
├── docs/
│   ├── specs/                         # Our specifications
│   │   └── openfactory-specification.md
│   ├── research/                      # Research department output
│   │   ├── tech-stack-validation.md   # Validated technology choices
│   │   ├── api-contracts/             # API contract definitions
│   │   └── data-model.md             # Canonical data model
│   └── adrs/                         # Architecture Decision Records
├── packages/                          # Monorepo packages
│   ├── web/                          # Next.js frontend application
│   │   ├── src/
│   │   │   ├── app/                  # Next.js App Router pages
│   │   │   ├── components/           # Shared UI components
│   │   │   │   ├── editor/           # TipTap rich text editor
│   │   │   │   └── ui/              # Base UI components
│   │   │   ├── modules/             # Module-specific UI
│   │   │   │   ├── refinery/
│   │   │   │   ├── foundry/
│   │   │   │   ├── planner/
│   │   │   │   └── validator/
│   │   │   ├── lib/                 # Shared utilities
│   │   │   └── hooks/               # React hooks
│   │   └── package.json
│   ├── api/                          # Backend API server
│   │   ├── src/
│   │   │   ├── routes/              # API route handlers
│   │   │   ├── services/            # Business logic
│   │   │   ├── models/              # Database models
│   │   │   ├── agents/              # AI agent orchestration
│   │   │   │   ├── orchestrator.ts
│   │   │   │   ├── refinery-agent.ts
│   │   │   │   ├── foundry-agent.ts
│   │   │   │   ├── planner-agent.ts
│   │   │   │   └── validator-agent.ts
│   │   │   ├── graph/               # Knowledge graph service
│   │   │   ├── indexer/             # Codebase indexing pipeline
│   │   │   └── integrations/        # External service integrations
│   │   │       ├── github/
│   │   │       ├── slack/
│   │   │       └── jira/
│   │   └── package.json
│   ├── mcp-server/                   # MCP server for IDE integration
│   │   └── package.json
│   └── shared/                       # Shared types, constants, utilities
│       ├── src/
│       │   ├── types/               # TypeScript type definitions
│       │   ├── constants/
│       │   └── utils/
│       └── package.json
├── docker/                           # Docker and deployment configs
│   ├── docker-compose.yml
│   ├── Dockerfile.web
│   ├── Dockerfile.api
│   └── nginx/
├── scripts/                          # Build, dev, and utility scripts
├── .env.example                      # Environment variable template
├── package.json                      # Root monorepo package.json
├── turbo.json                        # Turborepo config (if using)
└── tsconfig.base.json               # Shared TypeScript config
```

## Coding Conventions

### General
- **Language**: TypeScript everywhere (frontend, backend, MCP server, shared)
- **Package manager**: pnpm with workspaces
- **Monorepo**: Turborepo for build orchestration
- **Formatting**: Prettier with defaults
- **Linting**: ESLint with strict TypeScript rules

### Backend
- **Runtime**: Node.js with Express or Fastify (Research to validate)
- **Database**: PostgreSQL with pgvector extension (Research to validate)
- **ORM**: Drizzle ORM or Prisma (Research to validate)
- **Auth**: To be determined by Research
- **API style**: RESTful with OpenAPI spec, typed with Zod for validation
- **Error handling**: Consistent error response format across all endpoints
- **Testing**: Vitest for unit tests, Supertest for API integration tests

### Frontend
- **Framework**: Next.js with App Router (Research to validate current patterns)
- **Styling**: Tailwind CSS
- **Component library**: shadcn/ui for base components
- **State management**: React Server Components + minimal client state (Research to validate)
- **Editor**: TipTap v2/v3 (Research to validate current version)
- **Testing**: Vitest + React Testing Library

### AI / Agents
- **LLM abstraction**: Must support multiple providers (OpenAI, Anthropic, local via Ollama)
- **Streaming**: All agent responses stream via SSE or WebSocket
- **Structured output**: Agents produce structured edit suggestions, not raw text patches
- **Context assembly**: Agents receive assembled context from the knowledge graph, not raw DB queries

### Git Workflow
- **Branch per feature/task**: `{department}/{short-description}` (e.g., `research/tech-validation`, `backend/auth-api`)
- **Commit messages**: Conventional Commits format (`feat:`, `fix:`, `chore:`, `docs:`)
- **Commit often**: Each meaningful unit of work gets its own commit. Don't batch unrelated changes.
- **No direct commits to `main`**: All work goes through feature branches. Department heads merge to main after Program Director review.
- **All agents must commit their work**: When you complete a task or reach a stable checkpoint, stage and commit your changes on your branch. Use `git add` with specific file paths -- never `git add -A`.
- **Co-author tag**: All commits must include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`

## Cross-Department Contracts

The following interfaces are shared between departments. Changes require Program Director approval.

### API Contract (Backend <-> Frontend)
- Defined as OpenAPI spec in `docs/research/api-contracts/`
- Backend implements, Frontend consumes
- Shared TypeScript types in `packages/shared/src/types/`

### Agent Interface (Backend <-> AI)
- Agent orchestrator lives in `packages/api/src/agents/`
- AI department defines agent behavior and prompts
- Backend department provides the execution infrastructure

### Knowledge Graph Schema (Backend <-> AI <-> All)
- Node and edge types defined in `packages/shared/src/types/graph.ts`
- Backend implements storage and traversal
- AI department implements propagation logic and drift detection
- All modules interact with the graph through a service interface

### MCP Protocol (Platform <-> Planner)
- MCP server in `packages/mcp-server/`
- Must implement tools defined in the specification
- Planner API endpoints serve as the data source

## Validation Gates

This project uses automated validation gates to catch issues before they reach main. Every agent must respect these gates.

### Pre-Commit (Husky + lint-staged)
Runs on staged files only:
- `prettier --write` (auto-format)
- `eslint --fix` (auto-fix lintable issues)
- `tsc --noEmit` on affected packages (type-check)

### Pre-Push
Runs on the full affected package set:
- `turbo lint` (full lint pass)
- `turbo type-check` (full type-check)
- `turbo test` (run all tests)
- `turbo build` (verify everything compiles)

If any gate fails, the push is rejected. Fix the issue and try again.

### CODEOWNERS
The `CODEOWNERS` file maps paths to responsible departments:
```
packages/web/          @openfactory/frontend
packages/api/          @openfactory/backend
packages/shared/       @openfactory/backend @openfactory/frontend
packages/mcp-server/   @openfactory/platform
docker/                @openfactory/platform
docs/research/         @openfactory/research
docs/adrs/             @openfactory/research
```

Changes to `packages/shared/` or `CLAUDE.md` require Program Director review.

### CI Pipeline (GitHub Actions)
Every push and PR triggers:
1. Install dependencies (`pnpm install --frozen-lockfile`)
2. Lint (`turbo lint`)
3. Type-check (`turbo type-check`)
4. Test (`turbo test`)
5. Build (`turbo build`)

All checks must pass before merge to main.

## Open Source Standards

This is an open-source project. All code must meet public-facing quality standards:

- **Licensing**: AGPL-3.0 license. Every source file should have the license header where conventional for the language.
- **Documentation**: Public APIs must have JSDoc comments. README files at each package root.
- **CONTRIBUTING.md**: Will live at repo root describing how to contribute.
- **Code quality**: No `any` types. No eslint-disable without justification. No TODO comments without a linked issue/task.
- **Modularity**: Each package must be independently buildable and testable. Minimize cross-package imports -- go through `packages/shared/` for shared concerns.
- **Dependency discipline**: Minimize external dependencies. Justify every new dependency. Prefer well-maintained, actively developed libraries with permissive licenses (MIT, Apache-2.0, BSD).
- **Security**: No secrets in code. All credentials via environment variables. Input validation at every system boundary.
- **Accessibility**: WCAG 2.1 AA compliance for all UI components.

## Important Notes for All Agents

1. **Read the spec first**: Before doing any work, read `docs/specs/openfactory-specification.md` for full context on what you're building.
2. **Check research output**: Before making technology decisions, check `docs/research/` for validated choices. If a decision isn't there yet, flag it as a blocker.
3. **Shared types go in `packages/shared/`**: Never duplicate type definitions across packages.
4. **Plan mode is mandatory for department heads**: Propose your plan before writing code. The Program Director must approve.
5. **Report blockers immediately**: If you're blocked on another department's output, message the Program Director on the exec team.
6. **No placeholder implementations**: If you can't build something because a dependency isn't ready, don't stub it out. Create a task for it and move on to unblocked work.
