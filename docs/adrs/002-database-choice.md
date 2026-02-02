# ADR-002: Database Choice

**Status:** Proposed
**Date:** 2026-02-02

## Context

OpenFactory needs to store relational data (users, orgs, projects, documents, work orders) and vector embeddings (codebase chunks for semantic search). We need to decide between:

1. **PostgreSQL + pgvector** - Single database for both relational and vector data
2. **PostgreSQL + dedicated vector DB (Qdrant/Weaviate/Pinecone)** - Separate databases for each concern
3. **SQLite + vector extension** - Lightweight alternative for self-hosting

## Decision

Use **PostgreSQL 17 with the pgvector 0.8.0 extension** as the single data store for both relational and vector data.

## Consequences

**Positive:**
- Single database to deploy, back up, monitor, and scale
- Relational data and vectors share the same transactional boundary (consistency)
- pgvector 0.8.0 achieves competitive performance for datasets under 100M vectors (far exceeding our needs)
- HNSW indexes provide sub-100ms similarity search at 99% recall
- 60-80% cost reduction vs. running a separate vector database
- PostgreSQL is the most widely supported database in the self-hosting ecosystem
- Binary quantization (32x memory reduction) available for large embedding datasets
- Well-supported by Drizzle ORM with pgvector extensions

**Negative:**
- pgvector performance degrades at billion-scale datasets (not a concern for our use case)
- No GPU acceleration for vector operations
- Index build times are longer than dedicated vector databases
- Less advanced vector analytics (clustering, dimensionality reduction) than specialized DBs

**Why not a dedicated vector DB?**
Our codebase embedding use case will have at most a few million vectors per project. At this scale, pgvector matches or exceeds dedicated vector DB performance. Adding a separate database doubles operational complexity for no measurable benefit.

**Why not SQLite?**
SQLite lacks concurrent write support needed for multi-user collaboration. It also lacks pgvector's mature HNSW implementation and would require a separate extension for vector search.

**Embedding dimensions:**
Default to 1536 dimensions (OpenAI text-embedding-3-small). This is configurable per deployment since users may use different embedding models.
