# OpenFactory Data Model

**Date:** 2026-02-02
**Department:** Research & Architecture
**Status:** Approved

This document defines the complete database schema for OpenFactory. All tables use PostgreSQL conventions. The schema is designed to be implemented directly by the Backend team using Drizzle ORM.

---

## Conventions

- All primary keys are UUIDs (`gen_random_uuid()`)
- All tables include `created_at` and `updated_at` timestamps
- Soft deletes use `deleted_at` timestamp where applicable
- Foreign keys use `ON DELETE CASCADE` for owned relationships, `ON DELETE SET NULL` for references
- All text fields use `TEXT` (not `VARCHAR`) unless a specific length constraint is required
- JSONB is used for flexible/extensible metadata
- Indexes are specified for common query patterns

---

## SQL Schema

```sql
-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "vector";        -- pgvector for embeddings

-- ============================================================================
-- 1. ORGANIZATIONS & USERS
-- ============================================================================

CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    logo_url        TEXT,
    settings        JSONB NOT NULL DEFAULT '{}',  -- org-wide settings
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    avatar_url      TEXT,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Junction: org membership with roles
CREATE TABLE organization_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- ============================================================================
-- 2. AUTHENTICATION
-- ============================================================================

-- Sessions for authenticated users
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           TEXT NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    ip_address      TEXT,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- OAuth accounts linked to users
CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        TEXT NOT NULL,         -- 'github', 'google', etc.
    provider_account_id TEXT NOT NULL,
    access_token    TEXT,
    refresh_token   TEXT,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_account_id)
);

CREATE INDEX idx_accounts_user ON accounts(user_id);

-- API keys for programmatic access (MCP, Validator feedback API)
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id      UUID,                  -- NULL = org-wide, set = project-scoped
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    key_prefix      TEXT NOT NULL,          -- first 8 chars for identification
    key_hash        TEXT NOT NULL,           -- bcrypt hash of the full key
    scopes          TEXT[] NOT NULL DEFAULT '{}', -- e.g., ['mcp:read', 'mcp:write', 'validator:write']
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_org ON api_keys(organization_id);

-- ============================================================================
-- 3. PROJECTS
-- ============================================================================

CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    description     TEXT,
    settings        JSONB NOT NULL DEFAULT '{}',  -- project settings (templates, extraction strategies, etc.)
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, slug)
);

CREATE INDEX idx_projects_org ON projects(organization_id) WHERE archived_at IS NULL;

-- ============================================================================
-- 4. FEATURES (shared concept across Refinery & Foundry)
-- ============================================================================

CREATE TABLE features (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES features(id) ON DELETE CASCADE,  -- hierarchical features
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE (project_id, slug)
);

CREATE INDEX idx_features_project ON features(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_features_parent ON features(parent_id);

-- ============================================================================
-- 5. DOCUMENTS (unified table for all document types)
-- ============================================================================

-- Document types: product_overview, feature_requirements, technical_requirements,
--                 foundation_blueprint, system_diagram, feature_blueprint

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    feature_id      UUID REFERENCES features(id) ON DELETE SET NULL,  -- for feature-scoped docs
    type            TEXT NOT NULL CHECK (type IN (
                        'product_overview',
                        'feature_requirements',
                        'technical_requirements',
                        'foundation_blueprint',
                        'system_diagram',
                        'feature_blueprint'
                    )),
    title           TEXT NOT NULL,
    slug            TEXT NOT NULL,
    -- Current content stored as TipTap JSON (ProseMirror document)
    content         JSONB,
    -- Mermaid source for system diagrams
    diagram_source  TEXT,
    -- Template that was used to create this document
    template_id     UUID,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE (project_id, type, slug)
);

CREATE INDEX idx_documents_project_type ON documents(project_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_feature ON documents(feature_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 6. DOCUMENT VERSIONS
-- ============================================================================

-- Each save creates a new version. Yjs updates are persisted here for
-- collaborative editing history. The `content` snapshot is created at
-- explicit save points (not every keystroke).

CREATE TABLE document_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number  INTEGER NOT NULL,
    content         JSONB NOT NULL,           -- ProseMirror document snapshot
    diagram_source  TEXT,                      -- Mermaid source snapshot (system diagrams)
    change_summary  TEXT,                      -- Optional human/AI-readable summary
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, version_number)
);

CREATE INDEX idx_doc_versions_document ON document_versions(document_id, version_number DESC);

-- Yjs document state for real-time collaboration persistence
CREATE TABLE yjs_documents (
    document_id     UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
    state           BYTEA NOT NULL,            -- Yjs encoded document state
    state_vector    BYTEA,                     -- Yjs state vector for sync
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Yjs incremental updates (for efficient sync; periodically compacted)
CREATE TABLE yjs_updates (
    id              BIGSERIAL PRIMARY KEY,
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    update_data     BYTEA NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_yjs_updates_document ON yjs_updates(document_id, id);

-- ============================================================================
-- 7. TEMPLATES
-- ============================================================================

CREATE TABLE templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL = system template
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,       -- NULL = org-level
    type            TEXT NOT NULL CHECK (type IN (
                        'refinery',           -- refinery document template
                        'foundry',            -- foundry blueprint template set
                        'planner_extraction', -- work order extraction strategy
                        'planner_work_order', -- work order template
                        'planner_phase'       -- phase template
                    )),
    name            TEXT NOT NULL,
    description     TEXT,
    content         JSONB NOT NULL,           -- template structure and content
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_org ON templates(organization_id, type);
CREATE INDEX idx_templates_project ON templates(project_id, type);

-- ============================================================================
-- 8. PLANNER: PHASES & WORK ORDERS
-- ============================================================================

CREATE TABLE phases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phases_project ON phases(project_id);

CREATE TABLE work_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id        UUID REFERENCES phases(id) ON DELETE SET NULL,
    feature_id      UUID REFERENCES features(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN (
                        'backlog', 'ready', 'in_progress', 'in_review', 'done'
                    )),
    -- Rich description stored as TipTap JSON
    description     JSONB,
    -- Acceptance criteria (separate for easy extraction)
    acceptance_criteria JSONB,
    -- Out of scope notes
    out_of_scope    JSONB,
    -- Implementation plan (step-by-step, file-level)
    implementation_plan JSONB,
    -- Assignees stored as array of user IDs
    assignee_ids    UUID[] NOT NULL DEFAULT '{}',
    sort_order      INTEGER NOT NULL DEFAULT 0,
    deliverable_type TEXT,                    -- e.g., 'feature', 'bugfix', 'chore'
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_work_orders_project ON work_orders(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_orders_phase ON work_orders(phase_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_orders_status ON work_orders(project_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_orders_feature ON work_orders(feature_id) WHERE deleted_at IS NULL;
-- GIN index for assignee array lookups
CREATE INDEX idx_work_orders_assignees ON work_orders USING GIN (assignee_ids) WHERE deleted_at IS NULL;

-- ============================================================================
-- 9. VALIDATOR: FEEDBACK
-- ============================================================================

CREATE TABLE feedback_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    -- Feedback content
    title           TEXT,
    description     TEXT NOT NULL,
    category        TEXT CHECK (category IN ('bug', 'feature_request', 'performance', 'other')),
    priority_score  REAL,                     -- AI-assigned priority (0.0 - 1.0)
    status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
                        'new', 'triaged', 'in_progress', 'resolved', 'dismissed'
                    )),
    -- Enrichment context
    browser_info    JSONB,
    device_info     JSONB,
    session_data    JSONB,
    -- Source tracking
    source_app_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    external_user_id  TEXT,                   -- ID from the client's system
    -- Generated issue references
    generated_issue_url TEXT,                 -- GitHub/Jira issue URL
    generated_issue_id  TEXT,
    -- Tags for filtering
    tags            TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_project ON feedback_items(project_id);
CREATE INDEX idx_feedback_status ON feedback_items(project_id, status);
CREATE INDEX idx_feedback_category ON feedback_items(project_id, category);
CREATE INDEX idx_feedback_tags ON feedback_items USING GIN (tags);

-- ============================================================================
-- 10. KNOWLEDGE GRAPH
-- ============================================================================

-- Nodes represent any entity in the system that participates in the graph.
-- The actual content lives in the domain tables (documents, work_orders, etc.).
-- This table provides the graph overlay.

CREATE TABLE graph_nodes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    -- Polymorphic reference to the source entity
    entity_type     TEXT NOT NULL CHECK (entity_type IN (
                        'document',
                        'work_order',
                        'feature',
                        'feedback_item',
                        'artifact',
                        'codebase_file'
                    )),
    entity_id       UUID NOT NULL,
    -- Cached metadata for graph traversal without joins
    label           TEXT NOT NULL,
    metadata        JSONB NOT NULL DEFAULT '{}',
    -- State tracking for drift detection
    content_hash    TEXT,                     -- hash of content at last sync
    last_synced_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, entity_type, entity_id)
);

CREATE INDEX idx_graph_nodes_project ON graph_nodes(project_id);
CREATE INDEX idx_graph_nodes_entity ON graph_nodes(entity_type, entity_id);

-- Edges represent typed relationships between nodes.

CREATE TABLE graph_edges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_node_id  UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    target_node_id  UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    edge_type       TEXT NOT NULL CHECK (edge_type IN (
                        'derives_from',       -- work_order -> blueprint -> requirement
                        'shared_context',     -- foundation -> feature_blueprint
                        'implements',         -- codebase_file -> blueprint
                        'feedback_on',        -- feedback_item -> feature/requirement
                        'parent_of',          -- parent feature -> child feature
                        'references',         -- generic reference link
                        'blocks',             -- work_order -> work_order dependency
                        'related_to'          -- generic related
                    )),
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_node_id, target_node_id, edge_type)
);

CREATE INDEX idx_graph_edges_source ON graph_edges(source_node_id);
CREATE INDEX idx_graph_edges_target ON graph_edges(target_node_id);
CREATE INDEX idx_graph_edges_project ON graph_edges(project_id);
CREATE INDEX idx_graph_edges_type ON graph_edges(project_id, edge_type);

-- Drift alerts generated when graph detects inconsistencies
CREATE TABLE drift_alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_node_id  UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    target_node_id  UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
    drift_type      TEXT NOT NULL CHECK (drift_type IN (
                        'code_drift',          -- code changed, blueprint stale
                        'requirements_drift',  -- PRD updated, blueprint not
                        'foundation_drift',    -- foundation changed, feature blueprint not
                        'work_order_drift'     -- blueprint changed, work orders stale
                    )),
    description     TEXT NOT NULL,
    severity        TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
    resolved_at     TIMESTAMPTZ,
    resolved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drift_alerts_project ON drift_alerts(project_id, status);
CREATE INDEX idx_drift_alerts_source ON drift_alerts(source_node_id);

-- ============================================================================
-- 11. ARTIFACTS (file uploads)
-- ============================================================================

CREATE TABLE artifact_folders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES artifact_folders(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifact_folders_project ON artifact_folders(project_id);

CREATE TABLE artifacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    folder_id       UUID REFERENCES artifact_folders(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    file_size       BIGINT NOT NULL,          -- bytes
    storage_key     TEXT NOT NULL,             -- S3/MinIO object key
    -- Processing state
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN (
                        'pending', 'processing', 'completed', 'failed'
                    )),
    -- Extracted text content for search/agent context
    extracted_text  TEXT,
    uploaded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_artifacts_project ON artifacts(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_artifacts_folder ON artifacts(folder_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 12. CODEBASE CONNECTION
-- ============================================================================

CREATE TABLE codebase_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
    -- GitHub repository info
    github_installation_id BIGINT NOT NULL,
    repository_url  TEXT NOT NULL,
    repository_owner TEXT NOT NULL,
    repository_name TEXT NOT NULL,
    default_branch  TEXT NOT NULL DEFAULT 'main',
    -- Webhook
    webhook_id      BIGINT,
    webhook_secret  TEXT,
    -- Indexing state
    index_status    TEXT NOT NULL DEFAULT 'pending' CHECK (index_status IN (
                        'pending', 'indexing', 'completed', 'failed'
                    )),
    last_indexed_at TIMESTAMPTZ,
    last_indexed_commit TEXT,                -- SHA of last indexed commit
    file_count      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexed code files with embeddings
CREATE TABLE codebase_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id   UUID NOT NULL REFERENCES codebase_connections(id) ON DELETE CASCADE,
    file_path       TEXT NOT NULL,
    language        TEXT,
    file_hash       TEXT NOT NULL,            -- SHA of file content
    last_modified   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (connection_id, file_path)
);

CREATE INDEX idx_codebase_files_conn ON codebase_files(connection_id);
CREATE INDEX idx_codebase_files_path ON codebase_files(connection_id, file_path);

-- Code chunks: semantic units parsed by tree-sitter, with vector embeddings
CREATE TABLE code_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id         UUID NOT NULL REFERENCES codebase_files(id) ON DELETE CASCADE,
    -- Chunk metadata
    chunk_type      TEXT NOT NULL,            -- 'function', 'class', 'method', 'import', 'block'
    name            TEXT,                     -- function/class name if applicable
    start_line      INTEGER NOT NULL,
    end_line        INTEGER NOT NULL,
    content         TEXT NOT NULL,            -- raw source code of the chunk
    -- Vector embedding for semantic search
    embedding       vector(1536),             -- OpenAI text-embedding-3-small dimension
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_code_chunks_file ON code_chunks(file_id);
-- HNSW index for approximate nearest neighbor search
CREATE INDEX idx_code_chunks_embedding ON code_chunks USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- 13. COMMENTS & MENTIONS
-- ============================================================================

-- Comments can be attached to any entity (documents, work orders, feedback items)
CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    -- Polymorphic parent
    parent_type     TEXT NOT NULL CHECK (parent_type IN (
                        'document', 'work_order', 'feedback_item'
                    )),
    parent_id       UUID NOT NULL,
    -- Thread support
    thread_id       UUID REFERENCES comments(id) ON DELETE CASCADE,  -- NULL = root comment
    -- Content
    content         JSONB NOT NULL,           -- TipTap JSON for rich text
    -- For inline comments (position in document)
    anchor_data     JSONB,                    -- position/selection info in the document
    -- Agent-generated comments (flagged issues, suggestions)
    is_agent        BOOLEAN NOT NULL DEFAULT FALSE,
    agent_type      TEXT,                     -- 'review', 'suggestion', 'drift_alert'
    -- Status for flagged comments
    resolved        BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at     TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_comments_parent ON comments(parent_type, parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_thread ON comments(thread_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_project ON comments(project_id) WHERE deleted_at IS NULL;

-- Mentions track @user and @artifact references in content
CREATE TABLE mentions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Where the mention appears
    source_type     TEXT NOT NULL CHECK (source_type IN (
                        'document', 'work_order', 'comment'
                    )),
    source_id       UUID NOT NULL,
    -- What is mentioned
    target_type     TEXT NOT NULL CHECK (target_type IN ('user', 'artifact', 'document', 'work_order', 'feature')),
    target_id       UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mentions_source ON mentions(source_type, source_id);
CREATE INDEX idx_mentions_target ON mentions(target_type, target_id);

-- ============================================================================
-- 14. ACTIVITY FEED
-- ============================================================================

CREATE TABLE activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    -- What entity was affected
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    -- What happened
    action          TEXT NOT NULL,             -- 'created', 'updated', 'deleted', 'status_changed',
                                              -- 'comment_added', 'version_created', 'drift_detected', etc.
    -- Change details
    changes         JSONB,                    -- {field: {old: ..., new: ...}}
    metadata        JSONB NOT NULL DEFAULT '{}',
    -- Who did it
    actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type      TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'agent', 'system')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_project ON activities(project_id, created_at DESC);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id, created_at DESC);

-- ============================================================================
-- 15. AGENT SUGGESTIONS
-- ============================================================================

-- Structured edit suggestions from AI agents (diff-based)
CREATE TABLE agent_suggestions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    -- The agent that generated this
    agent_type      TEXT NOT NULL,             -- 'refinery', 'foundry', 'planner', 'validator'
    -- Suggestion content: array of section-level diffs
    diffs           JSONB NOT NULL,           -- [{sectionId, oldContent, newContent, explanation}]
    -- Status tracking
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                        'pending', 'accepted', 'rejected', 'partially_accepted'
                    )),
    accepted_diffs  UUID[] DEFAULT '{}',      -- IDs of accepted individual diffs
    rejected_diffs  UUID[] DEFAULT '{}',      -- IDs of rejected individual diffs
    -- Context used to generate suggestion
    context_summary TEXT,
    -- Conversation reference
    conversation_id UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suggestions_document ON agent_suggestions(document_id);
CREATE INDEX idx_suggestions_status ON agent_suggestions(project_id, status);

-- ============================================================================
-- 16. AGENT CONVERSATIONS
-- ============================================================================

CREATE TABLE agent_conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type      TEXT NOT NULL,             -- 'refinery', 'foundry', 'planner', 'validator'
    -- Context: which entity the conversation is about
    context_type    TEXT,                      -- 'document', 'work_order', etc.
    context_id      UUID,
    title           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_project ON agent_conversations(project_id);
CREATE INDEX idx_conversations_user ON agent_conversations(user_id);

CREATE TABLE agent_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT NOT NULL,
    -- Tool calls and results
    tool_calls      JSONB,
    -- Attached artifacts/files referenced in this message
    attachments     JSONB,
    -- Token usage tracking
    input_tokens    INTEGER,
    output_tokens   INTEGER,
    model           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_messages_conv ON agent_messages(conversation_id, created_at);

-- ============================================================================
-- 17. NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,             -- 'mention', 'drift_alert', 'comment_reply', 'status_change'
    title           TEXT NOT NULL,
    body            TEXT,
    -- Link to the relevant entity
    entity_type     TEXT,
    entity_id       UUID,
    -- Read state
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_project ON notifications(project_id);

-- ============================================================================
-- 18. INTEGRATION CONFIGS
-- ============================================================================

CREATE TABLE integration_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN ('slack', 'github_issues', 'jira')),
    config          JSONB NOT NULL,           -- encrypted webhook URLs, API tokens, etc.
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, type)
);

-- ============================================================================
-- 19. BACKGROUND JOBS METADATA
-- ============================================================================

-- BullMQ handles the actual job queue in Redis.
-- This table tracks job metadata for UI display and auditing.
CREATE TABLE job_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    job_type        TEXT NOT NULL,             -- 'codebase_index', 'drift_detection', 'export', 'embedding'
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                        'pending', 'running', 'completed', 'failed'
                    )),
    input           JSONB,
    output          JSONB,
    error           TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_runs_project ON job_runs(project_id, created_at DESC);
CREATE INDEX idx_job_runs_status ON job_runs(status) WHERE status IN ('pending', 'running');
```

---

## Entity Relationship Summary

```
Organization 1--* OrganizationMember *--1 User
Organization 1--* Project
Organization 1--* Template
Organization 1--* ApiKey

Project 1--* Feature
Project 1--* Document
Project 1--* Phase
Project 1--* WorkOrder
Project 1--* FeedbackItem
Project 1--* Artifact
Project 1--1 CodebaseConnection
Project 1--* GraphNode
Project 1--* GraphEdge
Project 1--* DriftAlert
Project 1--* Comment
Project 1--* Activity
Project 1--* AgentConversation
Project 1--* AgentSuggestion
Project 1--* Notification
Project 1--* IntegrationConfig
Project 1--* JobRun

Feature 1--* Document (feature-scoped)
Feature 1--* WorkOrder
Feature *--1 Feature (parent hierarchy)

Document 1--* DocumentVersion
Document 1--1 YjsDocument
Document 1--* YjsUpdate
Document 1--* AgentSuggestion
Document 1--* Comment

WorkOrder *--1 Phase
WorkOrder 1--* Comment

CodebaseConnection 1--* CodebaseFile
CodebaseFile 1--* CodeChunk (with vector embedding)

GraphNode --* GraphEdge (source/target)
GraphNode --* DriftAlert
```

---

## Key Design Decisions

1. **Unified documents table**: All document types (PRDs, blueprints) share a single `documents` table with a `type` discriminator. This simplifies the knowledge graph (one entity type) and versioning system.

2. **Yjs persistence**: Real-time collaboration state is stored in `yjs_documents` (full state) and `yjs_updates` (incremental). Periodic compaction merges updates into the full state. Explicit save points create `document_versions` snapshots.

3. **Knowledge graph as overlay**: The graph tables (`graph_nodes`, `graph_edges`) are an overlay on top of domain entities. Each domain entity (document, work order, etc.) gets a corresponding graph node. This decouples graph logic from domain logic.

4. **Polymorphic comments**: Comments use `parent_type` + `parent_id` to attach to any entity. This avoids separate comment tables per entity type.

5. **Embedding dimension**: The `code_chunks.embedding` column uses 1536 dimensions (OpenAI text-embedding-3-small). This should be configurable per deployment since users may use different embedding models. Consider storing the dimension in project settings and using a migration to alter the column.

6. **Array-based assignees**: Work order assignees use a UUID array with a GIN index rather than a junction table. This simplifies queries and updates for the common case of 1-3 assignees per work order.

7. **API keys with hash**: Full API keys are never stored. Only a bcrypt hash is stored alongside a prefix for identification. The full key is shown once at creation time.
