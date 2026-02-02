# ADR-003: Authentication Approach

**Status:** Proposed
**Date:** 2026-02-02

## Context

OpenFactory is a self-hosted platform that needs authentication supporting email/password, OAuth providers (GitHub, Google), role-based access (member, admin), and API key authentication for MCP and Validator integrations.

Options considered:
1. **Auth.js (NextAuth) v5** - The established Next.js auth library
2. **Better Auth** - TypeScript-native auth framework (YC-backed, recommended by Next.js and other frameworks)
3. **Keycloak** - Enterprise identity provider (self-hosted)
4. **Lucia Auth** - Lightweight auth library (deprecated in 2024, recommends rolling your own)
5. **Custom implementation** - Roll our own with bcrypt + JWT

## Decision

Use **Better Auth** as the authentication framework.

## Consequences

**Positive:**
- TypeScript-native from the ground up (not retrofitted like Auth.js)
- Self-hosted by design with full data control (aligns with OpenFactory's privacy-first positioning)
- Database-agnostic with PostgreSQL adapter (uses our existing database)
- Framework-agnostic (works with both Next.js frontend and Fastify API)
- Plugin architecture: 2FA, passkeys, social logins are separate installable plugins
- Actively maintained, YC-backed, recommended by Next.js, Nuxt, and Astro
- Production setup in under 30 minutes
- Growing community (5K+ Discord, 7K+ X followers)
- Session management and CSRF protection built in

**Negative:**
- Younger project than Auth.js (less battle-tested at scale)
- Smaller ecosystem of community extensions compared to Auth.js
- Less documentation and fewer tutorials available compared to Auth.js/NextAuth

**Why not Auth.js v5?**
Auth.js v5 has been in RC/beta for an extended period. The project's governance shifted when it was acquired by Better Auth. Auth.js is described as "a toolkit you assemble, not a product you adopt" - requiring more security ownership from the team. Better Auth provides a more complete, opinionated solution.

**Why not Keycloak?**
Keycloak is a full identity provider (Java-based) that is overkill for our needs. It adds significant deployment complexity and a separate service to maintain. Our auth requirements (email/password, OAuth, API keys) are well-served by a library-level solution.

**API Key Authentication:**
API keys for MCP and Validator use a custom implementation alongside Better Auth:
- Keys are generated with a `of-key-` prefix for identification
- Only bcrypt hashes are stored; the full key is shown once at creation
- Keys are scoped to organization + optional project
- Scopes control access (`mcp:read`, `mcp:write`, `validator:write`)
