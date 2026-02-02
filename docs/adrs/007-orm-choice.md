# ADR-007: ORM Choice

**Status:** Proposed
**Date:** 2026-02-02

## Context

OpenFactory's API server needs a TypeScript ORM for database access. The application has complex query requirements: knowledge graph traversal (recursive CTEs), vector similarity search, full-text search, array operations, and standard CRUD.

Options considered:
1. **Drizzle ORM** - TypeScript-first, SQL-transparent, code-first schema
2. **Prisma** - Schema-first, code-generated client, mature ecosystem
3. **Kysely** - Type-safe SQL query builder (no ORM layer)
4. **TypeORM** - Decorator-based ORM (legacy)

## Decision

Use **Drizzle ORM**.

## Consequences

**Positive:**
- 2-3x faster query execution than Prisma
- ~7.4 KB bundle size vs. Prisma's ~6.5 MB (smaller Docker images)
- 10x faster cold starts (relevant for development iteration)
- Full SQL transparency: complex queries (recursive CTEs for graph traversal, window functions, pgvector operations) can be written naturally
- Code-first schema definition in TypeScript: schema files in `packages/shared` serve as the single source of truth for both the database and TypeScript types
- `$inferSelect` and `$inferInsert` types derived directly from schema
- Excellent pgvector support via community extensions
- No code generation step (unlike Prisma's `prisma generate`)
- No Rust engine dependency (Prisma recently removed theirs, but historically this was a pain point)

**Negative:**
- TypeScript type-checking can be slower on large schemas (Drizzle infers types at compile time vs. Prisma's pre-generated types)
- Drizzle Kit (migration tooling) is less mature than Prisma Migrate
- Drizzle Studio (database GUI) is less featured than Prisma Studio
- Smaller ecosystem and community than Prisma
- Less documentation and fewer tutorials

**Why not Prisma?**
Prisma's schema language (PSL) is a separate DSL that doesn't integrate with our TypeScript types. For a project where `packages/shared` types should be the canonical source of truth, having the database schema defined in TypeScript is a significant advantage. Additionally, our knowledge graph queries require complex SQL (recursive CTEs, conditional aggregation, pgvector operators) that Prisma's abstraction would fight against.

**Why not Kysely?**
Kysely is a query builder, not an ORM. We want schema-as-code with inferred types, migration support, and relational queries. Drizzle provides all of this while still allowing raw SQL when needed.

**Schema Location:**
Drizzle schema files live in `packages/shared/src/db/schema/` so that both `packages/api` (for database access) and `packages/web` (for type inference) can import the types.

**Migration Workflow:**
```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate

# Open Drizzle Studio for visual inspection
pnpm drizzle-kit studio
```
