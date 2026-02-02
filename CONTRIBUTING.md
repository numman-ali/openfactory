# Contributing to OpenFactory

Thank you for your interest in contributing to OpenFactory. This guide will help you get started.

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **Docker** and **Docker Compose**
- **Git**

## Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/your-org/openfactory.git
cd openfactory
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Configure environment**

```bash
cp .env.example .env
```

Edit `.env` with your configuration. At minimum, you need:
- A database connection (or use the Docker Compose defaults)
- An LLM API key (OpenAI, Anthropic, or Ollama endpoint)

4. **Start infrastructure services**

```bash
docker compose up -d
```

This starts PostgreSQL (with pgvector) and Redis.

5. **Run database migrations**

```bash
pnpm db:migrate
```

6. **Start development servers**

```bash
pnpm dev
```

This starts all services (web, API, MCP server) in development mode with hot reload.

Open http://localhost:3000.

## Code Standards

- **TypeScript** strict mode everywhere. No `any` types.
- **ESLint** with strict TypeScript rules. Run `pnpm lint` to check.
- **Prettier** for formatting. Run `pnpm format` to auto-format.
- **Zod v4** for all validation schemas. Types are inferred from schemas (`z.infer<>`).
- **AGPL-3.0** license headers on all source files.

## Git Workflow

### Branch Naming

```
{area}/{short-description}
```

Examples: `backend/auth-api`, `frontend/planner-ui`, `platform/mcp-tools`

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `chore:` — Build, tooling, or dependency changes
- `refactor:` — Code restructuring without behavior change
- `test:` — Adding or updating tests

### Pull Request Process

1. Create a branch from `main`
2. Make your changes with clear, incremental commits
3. Ensure all checks pass: `pnpm lint && pnpm type-check && pnpm test && pnpm build`
4. Open a PR against `main` using the PR template
5. Address review feedback
6. A maintainer will merge once approved

## Testing

```bash
pnpm test          # Run all tests
pnpm test:web      # Frontend tests only
pnpm test:api      # Backend tests only
```

We use Vitest across all packages. Write tests for:
- API route handlers (integration tests with Supertest)
- Business logic and services (unit tests)
- React components (React Testing Library)

## Architecture Overview

OpenFactory is a **pnpm monorepo** managed by **Turborepo**:

| Package | Description |
|---|---|
| `packages/web` | Next.js 16 frontend with App Router |
| `packages/api` | Fastify API server with Drizzle ORM |
| `packages/shared` | Shared TypeScript types and Zod schemas |
| `packages/mcp-server` | MCP server for IDE integration |

Shared types live in `packages/shared` and are imported by all other packages. Never duplicate type definitions.

## Getting Help

- **GitHub Issues** — Bug reports and feature requests
- **Discussions** — Questions and general conversation

## Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. Please be respectful and constructive in all interactions.
