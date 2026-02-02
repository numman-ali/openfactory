# OpenFactory: High-Level Requirements Specification

## 1. Executive Summary

OpenFactory is an open-source AI-native SDLC orchestration platform that guides software teams from idea to implementation. It provides a structured pipeline where requirements are refined into architectural blueprints, blueprints are decomposed into executable work orders, and user feedback flows back into the planning cycle. The platform uses AI agents at each stage to reduce ambiguity, enforce consistency, and maintain alignment between what was planned and what gets built.

### What Problem Does This Solve?

Modern software teams face three compounding problems:

1. **Fragmented context**: Requirements live in Google Docs, architecture in Confluence, tasks in Jira, and tribal knowledge in people's heads. There is no single connected source of truth, so teams constantly re-derive context or work from stale information.

2. **AI tools that skip the hard parts**: Current AI coding tools excel at generating code fast but do nothing to ensure the *right* code gets written. They bypass requirements analysis, architectural reasoning, and traceability -- the actual bottlenecks in software delivery.

3. **The real bottleneck is decisions, not code**: Writing code is faster than ever. The bottleneck is deciding *what* to build, *why* it matters, and *how it fits* into the larger system. Misalignment across teams causes more delays than slow typing.

### How OpenFactory Solves It

OpenFactory provides a **connected pipeline** with four modules:

| Module | Purpose | Input | Output |
|---|---|---|---|
| **Refinery** | Define product intent | Ideas, feedback, artifacts | Structured PRDs |
| **Foundry** | Design architecture | PRDs + codebase context | Technical blueprints |
| **Planner** | Decompose into tasks | Blueprints + requirements | Executable work orders |
| **Validator** | Close the feedback loop | User feedback via API | Categorized issues + tasks |

A **Knowledge Graph** connects all artifacts so that changes propagate automatically -- update a requirement and the system flags affected blueprints and work orders.

---

## 2. Core Concepts

### 2.1 Knowledge Graph

The knowledge graph is the connective tissue of the platform. Every document (requirement, blueprint, work order, artifact) is a node. Edges represent dependencies and derivation relationships:

- Feature Requirements -> Feature Blueprints
- Feature Blueprints -> Work Orders
- Foundation Blueprints -> Feature Blueprints (shared context)
- Codebase -> Blueprints (drift detection)
- User Feedback -> Requirements / Work Orders

When any node changes, the graph identifies downstream nodes that may be affected and surfaces alerts for review. This is what makes the platform a *system* rather than a collection of disconnected tools.

### 2.2 AI Agents

Each module has a dedicated AI agent that operates within strict boundaries:

- Agents **suggest** changes; humans **approve** them
- Agents have read access to the full project context (requirements, blueprints, work orders, codebase, artifacts)
- Agents use structured edit suggestions that appear as reviewable diffs
- Agents can search code, cross-reference documents, and flag inconsistencies
- Agents never make structural changes (create/delete/merge features) without explicit user confirmation

### 2.3 Drift Detection

Drift is the divergence between documentation and reality. OpenFactory detects two types:

- **Code drift**: Code changes that invalidate blueprints (detected via webhook-triggered reindexing on push)
- **Requirements drift**: PRD updates not yet reflected in blueprints or work orders

When drift is detected, the system raises alerts and guides users through resolution workflows.

### 2.4 MCP (Model Context Protocol) Integration

MCP enables coding agents (Cursor, Claude Code, Windsurf, etc.) to pull work order context and update task statuses directly from the IDE. This is the bridge between planning and execution.

---

## 3. Module Specifications

### 3.1 Refinery (Requirements Layer)

**Purpose**: Transform raw ideas, artifacts, and feedback into structured, versioned product requirements.

#### Document Types

| Document Type | Scope | Content |
|---|---|---|
| Product Overview | Project-wide | Business context, target users, success criteria, executive summary |
| Feature Requirements | Per-feature | Behavior, acceptance criteria, user stories, constraints |
| Technical Requirements | Cross-cutting | Auth, security, performance, integrations, compliance |

#### Core Capabilities

- **AI-assisted initialization**: Agent walks users through structured Q&A to draft initial requirements, or reverse-engineers requirements from existing code/artifacts
- **Structured templates**: Customizable markdown outlines for each document type (configurable at project and org level)
- **Collaborative editing**: Real-time co-editing with comments, @mentions, and threaded discussions
- **Automatic versioning**: Full version history with diff comparison (per-document and aggregate)
- **Agent review**: On-demand review that flags ambiguity, gaps, conflicts, and duplication
- **Feature organization**: Agent can recommend splitting, merging, or reorganizing features
- **Foundry alignment monitoring**: Detects drift between requirements and blueprints
- **Import/Export**: Support for .md, .docx import; .md, .docx, .pdf export; aggregate export

#### Agent Capabilities

- Analyze artifacts (notes, transcripts, designs, images, audio, code) to draft requirements
- Review documents for quality issues (ambiguity, gaps, conflicts, duplication)
- Answer questions with source references
- Recommend feature organization changes
- Monitor and guide resolution of requirement-blueprint drift

---

### 3.2 Foundry (Architecture Layer)

**Purpose**: Transform requirements into clear, actionable technical blueprints that stay synchronized with code.

#### Blueprint Types

| Blueprint Type | Scope | Content |
|---|---|---|
| Foundations | Project-wide | Tech stack, architectural principles, security standards, coding conventions, deployment practices |
| System Diagrams | System-wide | Architecture diagrams, ERDs, flow diagrams (Mermaid-based) |
| Feature Blueprints | Per-feature | APIs, UI behavior, data models, testing requirements, component interactions |

#### Core Capabilities

- **Template system**: Configurable templates at project and org level that define blueprint structure, pre-written content, and agent instructions
- **Feature-blueprint linking**: 1:1 mapping between Refinery features and Feature Blueprints; renaming propagates bidirectionally; parent features get auto-generated overview blueprints
- **Code-aware context**: Agent has access to indexed codebase for grounded suggestions
- **Structured edit suggestions**: Color-coded diffs that can be accepted/rejected per-section
- **Mermaid diagram support**: Visual + code-based editing with zoom controls
- **Cross-document suggestions**: Agent can suggest edits across multiple blueprints simultaneously
- **Drift detection and sync**:
  - Code drift: Detected on every push via webhook-triggered reindexing
  - Requirements drift: PRD updates flagged against blueprints
  - Foundation drift: Foundation changes flagged against feature implementations
  - Guided resolution workflows for each drift type
- **Version history**: Full history with red/green diff views

#### Agent Capabilities

- Draft and refine blueprint content
- Generate and update Mermaid diagrams
- Review blueprints for gaps, ambiguity, or conflicts
- Answer architectural questions grounded in project context
- Sync blueprints to PRDs and code
- Flag issues via comments
- Guide structured decision-making workflows

---

### 3.3 Planner (Project Management Layer)

**Purpose**: Decompose blueprints into executable work orders with full traceability to upstream context.

#### Work Order Structure

Each work order contains:

- **Core metadata**: ID, title, status, assignee(s), phase
- **Rich description**: Purpose, acceptance criteria, out-of-scope notes (rich text with @mentions and images)
- **Knowledge graph connections**: Links to upstream requirements and/or blueprints with reference fetching
- **Implementation plan** (optional): Step-by-step, file-level implementation outline
- **Activity feed**: Chronological changes and threaded comments with attachments

#### Work Order Lifecycle

```
Backlog -> Ready -> In Progress -> In Review -> Done
```

#### Core Capabilities

- **Agent-driven extraction**: Generate work orders from blueprints using configurable extraction strategies (feature-slice vs. specialist-oriented, or custom)
- **Manual creation**: Direct work order creation with local draft caching
- **Phase management**: Assign work orders to phases, drag-and-drop sequencing within/across phases
- **Bulk operations**: Multi-row selection with bulk status changes, assignee updates, phase reassignment, deletion
- **Filtering and search**: By assignee, status, phase, deliverable type, feature
- **MCP integration**: Coding agents can list assigned work orders, read details, update status
- **Blueprint sync**: Background monitoring detects blueprint changes and suggests new/updated work orders
- **Configurable templates**: Separate templates for work order sizing, titles, and descriptions

#### Agent Capabilities

- Extract work orders from blueprints
- Create, edit, and batch-update work orders
- Phase planning with reasoning
- Refine implementation plans
- Retrieve context from requirements, blueprints, artifacts, and codebase

#### MCP Server Specification

The MCP server exposes these tools to coding agents:

| Tool | Description |
|---|---|
| `list_work_orders` | List work orders assigned to the authenticated user in "Ready" state |
| `get_work_order` | Get full work order details including description and implementation plan |
| `update_work_order_status` | Update work order status (e.g., move to "In Review") |
| `search_context` | Search requirements, blueprints, and artifacts for additional context |

Authentication: Project-scoped API key tied to a specific user.

---

### 3.4 Validator (Feedback Loop)

**Purpose**: Capture user feedback, enrich it with technical context, and convert it into actionable development tasks.

#### Process Flow

```
Collect -> Enrich & Categorize -> Notify -> Generate Tasks
```

1. **Collect**: Lightweight API integration captures feedback (bugs, feature requests, performance issues)
2. **Enrich**: Automatically adds browser/device info, session data, recent code changes
3. **Categorize**: AI classifies feedback type and assigns priority scores
4. **Notify**: Critical issues trigger Slack alerts; all feedback appears in the Inbox
5. **Generate**: AI creates GitHub/Jira issues with code context and suggested fixes

#### Core Capabilities

- **Feedback API**: Simple REST endpoint authenticated via App Keys (`sf-int-xxxxx` format)
- **Validator Inbox**: Real-time dashboard with filtering, search, and priority scoring
- **AI categorization**: Automatic classification of bugs, feature requests, and performance issues
- **Slack integration**: Configurable webhook-based alerts for high-priority issues
- **GitHub/Jira integration**: Auto-create tickets with code context and suggested fixes
- **Feedback-to-PRD loop**: Actionable tasks flow back into Planner and requirements

#### Agent Capabilities

- Answer questions about user feedback patterns
- Suggest priority and categorization
- Generate issue descriptions with code references

---

## 4. Supporting Systems

### 4.1 Codebase Connection

- **GitHub App**: Read-only access to selected repositories
- **Indexing**: Chunks and embeds code for semantic search; smart indexing (only modified files on reindex)
- **Automatic reindexing**: Webhook-triggered on push to indexed branch
- **Drift analysis**: Every reindex compares code against blueprints
- **Branch selection**: User chooses active development branch

### 4.2 Artifacts

- **Supported formats**: Documents (.md, .docx, .pdf), images, audio, Microsoft Office files
- **Upload methods**: Project overview console or directly in agent chat
- **Agent access**: Dynamic retrieval when relevant; manual via @mentions or drag-and-drop
- **Documentation linking**: Highlight text to link to artifact; hover preview with open/remove options
- **Folder organization**: Hierarchical folders with drag-and-drop and breadcrumb navigation

### 4.3 Organization Management

- **Organizations**: Private workspaces containing one or more projects
- **Roles**: Member (collaborate on projects) and Administrator (manage members, settings, billing, templates)
- **Seat management**: Fixed seat allocation managed by admins
- **Shared templates**: Promote project-level templates to organization-wide use
- **Project management**: Consolidated view of all projects; archive/rename capabilities

### 4.4 Rich Text Editor

All document editing surfaces (PRDs, blueprints, work orders) share a common editor with:

- Markdown rendering (headers, lists, code blocks)
- @mentions for team members and artifacts
- Inline images with resize
- Comments and threaded discussions
- Agent suggestion diffs (color-coded accept/reject)
- Internal linking to artifacts, PRD sections, blueprint headings, features, work orders, code files
- Import/export support
- Version history with diff views

---

## 5. Architecture Overview

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Web Application                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Refinery │ │ Foundry  │ │ Planner  │ │  Validator    │   │
│  │   UI     │ │   UI     │ │   UI     │ │   UI         │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │
│       └─────────────┴────────────┴──────────────┘           │
│                          │                                   │
│              ┌───────────┴───────────┐                       │
│              │    Rich Text Editor   │                       │
│              │   (Shared Component)  │                       │
│              └───────────────────────┘                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │   API Layer  │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────────┐
        │                  │                      │
┌───────┴───────┐  ┌───────┴───────┐  ┌──────────┴──────────┐
│ Knowledge     │  │ Agent         │  │ Integration          │
│ Graph         │  │ Orchestrator  │  │ Layer                │
│ Service       │  │               │  │                      │
│               │  │ ┌───────────┐ │  │ ┌─────────────────┐  │
│ - Nodes       │  │ │ Refinery  │ │  │ │ GitHub App      │  │
│ - Edges       │  │ │ Agent     │ │  │ │ (read-only)     │  │
│ - Propagation │  │ ├───────────┤ │  │ ├─────────────────┤  │
│ - Drift       │  │ │ Foundry   │ │  │ │ Codebase        │  │
│   Detection   │  │ │ Agent     │ │  │ │ Indexer         │  │
│               │  │ ├───────────┤ │  │ ├─────────────────┤  │
│               │  │ │ Planner   │ │  │ │ Slack Webhook   │  │
│               │  │ │ Agent     │ │  │ ├─────────────────┤  │
│               │  │ ├───────────┤ │  │ │ GitHub/Jira     │  │
│               │  │ │ Validator │ │  │ │ Issue Creation  │  │
│               │  │ │ Agent     │ │  │ ├─────────────────┤  │
│               │  │ └───────────┘ │  │ │ MCP Server      │  │
│               │  │               │  │ └─────────────────┘  │
└───────────────┘  └───────────────┘  └─────────────────────┘
        │                  │                      │
        └──────────────────┼──────────────────────┘
                           │
                    ┌──────┴──────┐
                    │  Data Layer  │
                    │              │
                    │ - Database   │
                    │ - Vector DB  │
                    │ - File Store │
                    │ - Cache      │
                    └─────────────┘
```

### 5.2 Key Architectural Components

#### Web Application (Frontend)
- Single-page application with module-based routing
- Shared rich text editor component (TipTap-based recommended for open source)
- Real-time collaboration via WebSocket/CRDT
- Responsive panel layouts per module

#### API Layer
- RESTful API for CRUD operations
- WebSocket for real-time updates (collaboration, agent streaming)
- Authentication/authorization (org-scoped, role-based)
- Rate limiting and usage tracking

#### Knowledge Graph Service
- Stores document nodes and their relationships
- Propagates change events downstream
- Powers drift detection by comparing node states
- Provides traversal queries for agent context retrieval

#### Agent Orchestrator
- Routes user interactions to module-specific agents
- Manages agent context assembly (which documents, code, artifacts to include)
- Handles structured edit suggestions (diff generation and application)
- Supports streaming responses
- LLM-agnostic: should support pluggable model providers (OpenAI, Anthropic, local models via Ollama, etc.)

#### Integration Layer
- **GitHub App**: Repository access, webhook handling, PR/commit monitoring
- **Codebase Indexer**: Code chunking, embedding, semantic search index
- **Slack**: Webhook-based notifications
- **GitHub/Jira**: Issue creation via API
- **MCP Server**: Model Context Protocol server for IDE integration

#### Data Layer
- **Primary database**: Relational (PostgreSQL recommended) for documents, users, orgs, projects, work orders
- **Vector database**: For codebase embeddings and semantic search (pgvector, or dedicated like Qdrant/Weaviate)
- **File storage**: S3-compatible object store for artifacts and exports
- **Cache**: Redis for sessions, real-time state, and background job queuing

### 5.3 Technology Recommendations (Open Source Stack)

| Layer | Recommended Technology | Rationale |
|---|---|---|
| Frontend | Next.js + React | SSR, routing, large ecosystem |
| Editor | TipTap (ProseMirror) | Extensible, collaboration-ready, open source |
| Real-time | Yjs or Hocuspocus | CRDT-based collaborative editing |
| API | Node.js / Python (FastAPI) | Either works; Node shares frontend language |
| Database | PostgreSQL + pgvector | Relational + vector search in one DB |
| File Storage | S3 / MinIO (self-hosted) | Standard object storage |
| Cache/Queue | Redis + BullMQ | Job queues for indexing, agent tasks |
| LLM Integration | LiteLLM or custom adapter | Model-agnostic proxy |
| MCP Server | TypeScript SDK | Official MCP SDK is TypeScript |
| Auth | NextAuth.js or Keycloak | Flexible, self-hostable |
| Search | Codebase: tree-sitter + embeddings | Language-aware code parsing |
| Diagramming | Mermaid.js | Widely supported, text-based |
| Containerization | Docker + Docker Compose | Simple self-hosting |

---

## 6. Data Model (Simplified)

```
Organization
  ├── Members (User + Role)
  ├── Templates (Refinery, Foundry, Planner)
  └── Projects
       ├── Artifacts (files + metadata)
       ├── Codebase Connection (repo URL, branch, index state)
       ├── Refinery
       │    ├── Product Overview Documents
       │    ├── Technical Requirements Documents
       │    └── Feature Requirements Documents
       │         └── linked to → Feature Blueprints
       ├── Foundry
       │    ├── Foundation Blueprints
       │    ├── System Diagrams
       │    └── Feature Blueprints
       │         └── linked to → Work Orders
       ├── Planner
       │    ├── Phases
       │    └── Work Orders
       │         ├── Knowledge Graph Links
       │         ├── Implementation Plan
       │         └── Activity / Comments
       └── Validator
            ├── Feedback Items
            └── Generated Issues
```

Each document node participates in the Knowledge Graph with typed edges:
- `DERIVES_FROM` (work order -> blueprint -> requirement)
- `SHARED_CONTEXT` (foundation -> feature blueprint)
- `IMPLEMENTS` (code -> blueprint)
- `FEEDBACK_ON` (feedback -> feature/requirement)

---

## 7. Proposed Delivery Phases

### Phase 1: Foundation
**Goal**: Core platform with basic document editing and project structure.

- User authentication and organization management
- Project creation and settings
- Database schema and API scaffolding
- Rich text editor component (TipTap)
- Basic Refinery: Create/edit/version Product Overview and Feature Requirements documents
- Artifact upload and storage
- Basic UI shell with module navigation

**Outcome**: Users can create projects, write requirements documents, and upload artifacts.

---

### Phase 2: Architecture Layer
**Goal**: Foundry module with blueprint creation and template system.

- Foundry UI and blueprint CRUD (Foundations, System Diagrams, Feature Blueprints)
- Template system (project and org-level)
- Mermaid diagram rendering and editing
- Feature-to-blueprint linking (knowledge graph edges)
- Version history with diff views
- Technical Requirements documents in Refinery

**Outcome**: Users can create blueprints linked to requirements with full version tracking.

---

### Phase 3: AI Agents
**Goal**: Introduce AI agents across Refinery and Foundry.

- Agent orchestrator with LLM-agnostic provider support
- Structured edit suggestion system (diff generation, accept/reject UI)
- Refinery Agent: Initialization Q&A, drafting, review, feature organization
- Foundry Agent: Blueprint drafting, review, diagram generation
- Agent context assembly (retrieval from knowledge graph)
- Agent chat panel UI with streaming responses

**Outcome**: AI assists with writing requirements and blueprints, with human-in-the-loop approval.

---

### Phase 4: Codebase Integration
**Goal**: Connect to GitHub and enable code-aware features.

- GitHub App (OAuth + installation flow)
- Codebase indexing pipeline (chunking, embedding, semantic search)
- Webhook-triggered automatic reindexing (smart: modified files only)
- Code search available to agents
- Drift detection: code vs. blueprints
- Alert system for drift notifications

**Outcome**: Agents are code-aware; drift between blueprints and code is automatically detected.

---

### Phase 5: Planner
**Goal**: Full project management layer with work order lifecycle.

- Planner UI: Table view with filtering, search, grouping
- Work order CRUD with rich descriptions
- Phase management with drag-and-drop sequencing
- Agent-driven work order extraction from blueprints (configurable strategies)
- Planner Agent: Create, edit, batch-update, phase planning
- Implementation plan editing
- Knowledge graph connections (work order -> blueprint -> requirement)
- Blueprint sync: detect changes and suggest work order updates

**Outcome**: Blueprints can be decomposed into executable, traceable work orders.

---

### Phase 6: MCP & IDE Integration
**Goal**: Connect coding agents to OpenFactory via MCP.

- MCP server implementation (TypeScript SDK)
- Project-scoped API key management
- MCP tools: list_work_orders, get_work_order, update_status, search_context
- Connection setup UI with agent-specific instructions
- Status sync (IDE updates reflected in Planner in real-time)

**Outcome**: Developers can pull work orders and update status directly from their coding agent.

---

### Phase 7: Validator & Feedback Loop
**Goal**: Close the loop with user feedback collection.

- Feedback API (REST endpoint with App Key auth)
- Validator Inbox UI (dashboard, filtering, search, priority scoring)
- AI categorization of feedback
- Slack webhook integration for critical alerts
- GitHub/Jira issue auto-generation with code context
- Feedback -> Planner/Requirements routing

**Outcome**: User feedback is captured, enriched, categorized, and converted into actionable tasks.

---

### Phase 8: Collaboration & Polish
**Goal**: Real-time collaboration and production readiness.

- Real-time co-editing (CRDT-based via Yjs/Hocuspocus)
- Comments and @mentions across all modules
- Email notifications for mentions
- Aggregate export (full project documentation)
- Organization-wide templates
- Usage monitoring dashboard
- Comprehensive API documentation
- Docker Compose deployment configuration
- Performance optimization (large repositories, concurrent users)

**Outcome**: Production-ready platform with full collaboration support.

---

## 8. Open Source Considerations

### Licensing
Recommend **AGPL-3.0** or **Apache-2.0** depending on community strategy:
- AGPL-3.0: Ensures modifications stay open source (stronger copyleft)
- Apache-2.0: More permissive, broader adoption potential

### Self-Hosting
The platform must be self-hostable with minimal configuration:
- Single `docker-compose up` deployment
- Environment variable configuration for LLM provider, database, storage
- BYO-LLM: Users provide their own API keys or run local models

### Extension Points
- Pluggable LLM providers (OpenAI, Anthropic, local via Ollama)
- Custom template system for all document types
- Webhook-based event system for external integrations
- Plugin architecture for additional integrations beyond GitHub/Slack/Jira

### What Differentiates OpenFactory
- **Open source**: Self-hostable, no vendor lock-in
- **LLM-agnostic**: Works with any model provider, including local models
- **Extensible**: Plugin architecture for integrations and templates
- **Privacy-first**: All data stays on your infrastructure
- **Community-driven**: Templates, integrations, and improvements shared by the community

---

## 9. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Concurrent users per project | 20+ with real-time sync |
| Codebase indexing | Repos up to 100k files |
| Agent response latency | Streaming, first token < 3s |
| Document versioning | Unlimited history |
| Deployment | Docker Compose (single node), Kubernetes (scaled) |
| Backup | Automated database + file store backups |
| Authentication | OAuth 2.0, SSO support |
| Authorization | Role-based (Member, Admin) per organization |
| API | RESTful with OpenAPI spec |
| Accessibility | WCAG 2.1 AA compliance |

---

## 10. Glossary

| Term | Definition |
|---|---|
| **PRD** | Product Requirements Document -- captures product intent |
| **Blueprint** | Technical specification document describing how to build a feature |
| **Foundation** | Project-wide blueprint covering shared technical decisions |
| **System Diagram** | Visual architecture/flow diagram (Mermaid-based) |
| **Feature Blueprint** | Per-feature technical specification |
| **Work Order** | Actionable task derived from blueprints with full context |
| **Phase** | A time-boxed grouping of work orders |
| **Knowledge Graph** | Connected graph of all project artifacts with change propagation |
| **Drift** | Divergence between documentation and code or between upstream and downstream artifacts |
| **MCP** | Model Context Protocol -- enables IDE/coding agent integration |
| **Artifact** | External file uploaded as context (docs, images, audio, etc.) |
| **App Key** | API token for Validator feedback ingestion |

---

## 11. Summary

OpenFactory reimagines the SDLC as a connected, AI-assisted pipeline:

```
Ideas/Feedback → Refinery (PRDs) → Foundry (Blueprints) → Planner (Work Orders) → Code → Validator (Feedback) → ↩
```

Every stage produces structured artifacts. Every artifact is connected through the knowledge graph. AI agents assist at every stage but never act without human approval. The result is a system where **what gets built** always traces back to **why it should be built**, and feedback from users flows directly back into the planning cycle.

The open-source approach means teams own their data, choose their LLM providers, and can extend the platform to fit their workflows.
