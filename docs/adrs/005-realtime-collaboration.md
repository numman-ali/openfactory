# ADR-005: Real-Time Collaboration

**Status:** Proposed
**Date:** 2026-02-02

## Context

OpenFactory requires real-time collaborative editing for all document surfaces (PRDs, blueprints, work order descriptions). Multiple users must be able to edit the same document simultaneously with conflict-free merging, cursor presence, and offline support.

Options considered:
1. **Yjs + Hocuspocus** - CRDT-based collaboration with self-hosted WebSocket backend
2. **Yjs + custom WebSocket server** - Yjs with a hand-built sync server
3. **Liveblocks** - Managed real-time collaboration platform (Yjs-compatible)
4. **Tiptap Cloud** - Managed collaboration service from the TipTap team
5. **OT-based (ShareDB)** - Operational Transform approach

## Decision

Use **Yjs with a self-hosted Hocuspocus WebSocket server**.

## Consequences

**Positive:**
- CRDT-based: conflict-free merging without a central authority (works offline, handles network partitions)
- Yjs is the most widely adopted CRDT framework (900K+ weekly npm downloads)
- Used in production by Proton Docs, NextCloud, Evernote, ClickUp, Shopify, Monday, Meta, Gitbook, JupyterLab
- Hocuspocus is the official WebSocket backend for TipTap (seamless integration)
- Self-hosted aligns with OpenFactory's privacy-first, self-hosted philosophy
- Formally verified algorithm (lean-yjs proves YATA CRDT correctness)
- Yjs v14 (in development) adds attribution and accept/reject suggestions (useful for agent diffs)
- Awareness protocol for cursor presence and user indicators
- Persistence to PostgreSQL for durability

**Negative:**
- Self-hosting Hocuspocus requires operational investment (WebSocket server, Redis for horizontal scaling)
- Yjs documents grow over time as all updates are stored (requires periodic compaction)
- Horizontal scaling requires Redis pub/sub adapter for cross-instance sync
- More complex than a managed service (Liveblocks, Tiptap Cloud)

**Why not a managed service (Liveblocks/Tiptap Cloud)?**
Managed services contradict OpenFactory's self-hosted, privacy-first positioning. Users who deploy OpenFactory on their own infrastructure should not depend on a third-party service for core functionality. The managed services also add per-user costs that don't align with our open-source model.

**Why not OT (ShareDB)?**
CRDTs (Yjs) are architecturally simpler for our use case: no central server needed for conflict resolution, better offline support, and direct integration with TipTap via the Collaboration extension. OT requires a central server to resolve conflicts and is harder to scale.

**Architecture:**

```
Browser 1 (TipTap + y-prosemirror)
    |
    v
Hocuspocus WebSocket Server ---- Redis (pub/sub for multi-instance)
    |
    v
PostgreSQL (Yjs document state + updates)
    ^
    |
Browser 2 (TipTap + y-prosemirror)
```

**Persistence Strategy:**
1. Yjs incremental updates stored in `yjs_updates` table (append-only)
2. Full document state periodically compacted into `yjs_documents` table
3. Explicit save actions create `document_versions` snapshots with ProseMirror JSON
4. Version history UI reads from `document_versions`

**Scaling:**
Include Redis as a Hocuspocus adapter from day one. This allows horizontal scaling by running multiple Hocuspocus instances behind a load balancer with sticky sessions (or Redis-based session affinity).
