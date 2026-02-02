# ADR-008: Editor Choice

**Status:** Proposed
**Date:** 2026-02-02

## Context

OpenFactory requires a rich text editor for all document surfaces: PRDs (Refinery), blueprints (Foundry), work order descriptions (Planner), and comments across the platform. The editor must support markdown rendering, real-time collaboration, @mentions, inline images, comments, agent suggestion diffs (color-coded accept/reject), and Mermaid diagram embedding.

Options considered:
1. **TipTap v3** - Headless ProseMirror wrapper with extension system, MIT-licensed
2. **Lexical (Meta)** - Facebook's text editor framework
3. **Slate** - Customizable rich text editor framework
4. **ProseMirror (direct)** - The underlying framework TipTap wraps
5. **Quill** - Simple rich text editor

## Decision

Use **TipTap v3** (stable release, MIT-licensed).

## Consequences

**Positive:**
- Most mature extensible rich text editor in the React ecosystem (8M+ monthly npm downloads)
- TipTap v3 is now stable with several previously pro-only extensions released under MIT
- Built on ProseMirror: battle-tested editing engine with proven document model
- Native Yjs integration via `@tiptap/extension-collaboration` (critical for our real-time collaboration requirement)
- Headless architecture: full control over UI rendering (renders with our shadcn/ui design system)
- Extension system supports all our requirements: @mentions, comments, inline images, code blocks, tables
- Floating UI integration (v3 replaced tippy.js) for menus and popovers
- SSR support (server-side rendering without browser required)
- 2026 roadmap includes AI Toolkit for agent-document collaboration
- MarkViews support for custom mark rendering
- Mermaid diagrams implementable as a custom NodeView extension

**Negative:**
- Complex custom extensions require deep ProseMirror knowledge
- Large bundle for a text editor (~200KB gzipped with common extensions)
- Some advanced features (track changes, comments plugin) were previously pro-only; verify MIT availability for each needed feature
- The TipTap 2026 AI Toolkit is not yet available; we must build our own agent suggestion system

**Why not Lexical?**
Lexical is newer and less mature for collaborative editing. Its Yjs integration is community-maintained and less tested than TipTap's official Collaboration extension. Lexical also has a smaller extension ecosystem.

**Why not ProseMirror directly?**
ProseMirror is powerful but low-level. TipTap provides the extension system, React integration, and collaboration support that would take months to build from scratch with raw ProseMirror.

**Why not Slate?**
Slate's plugin ecosystem is smaller, and its collaboration story is less mature. TipTap's Hocuspocus integration gives us production-ready collaboration out of the box.

**Custom Extensions to Build:**

1. **Agent Suggestion Diff** - Renders color-coded diffs (green for additions, red for removals) with per-section accept/reject buttons. Uses TipTap's decoration system.
2. **@Mentions** - Autocomplete for users, artifacts, documents, work orders, and features. Uses TipTap's suggestion utility.
3. **Artifact Linking** - Text highlighting with artifact attachment. Hover preview with open/remove options.
4. **Mermaid Diagram Node** - Custom NodeView that renders Mermaid diagrams with code editor toggle and zoom controls.
5. **Internal Link** - Links to PRD sections, blueprint headings, features, work orders, and code files with hover preview.
6. **Comment Anchoring** - Inline comments attached to text ranges with thread support.

**Editor Architecture:**

```
packages/web/src/components/editor/
├── Editor.tsx                 # Main editor component
├── extensions/
│   ├── agent-suggestion.ts    # Diff rendering extension
│   ├── mention.ts             # @mention extension
│   ├── artifact-link.ts       # Artifact linking
│   ├── mermaid-node.ts        # Mermaid diagram node
│   ├── internal-link.ts       # Cross-document links
│   └── comment-anchor.ts      # Inline comments
├── menus/
│   ├── BubbleMenu.tsx         # Selection-based floating menu
│   ├── SlashMenu.tsx          # Slash command menu
│   └── MentionMenu.tsx        # @mention autocomplete
└── collaboration/
    ├── CollaborationProvider.tsx   # Yjs + Hocuspocus setup
    └── CursorPresence.tsx         # Awareness cursors
```
