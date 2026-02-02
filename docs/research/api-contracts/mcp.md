# API Contract: MCP Server

**Transport:** Streamable HTTP
**Auth:** Project-scoped API key with `mcp:read` and/or `mcp:write` scopes
**SDK:** @modelcontextprotocol/sdk (TypeScript)

The MCP server exposes tools that coding agents (Cursor, Claude Code, Windsurf, etc.) can use to interact with OpenFactory's Planner module.

---

## Authentication

The MCP server authenticates using project-scoped API keys. The key is passed during the MCP connection setup. The key must have the appropriate scopes:

- `mcp:read` - Required for `list_work_orders`, `get_work_order`, `search_context`
- `mcp:write` - Required for `update_work_order_status`

---

## Tools

### list_work_orders

List work orders assigned to the authenticated user in "Ready" state.

**Input Schema:**
```typescript
{
  status?: 'ready' | 'in_progress' | 'in_review'  // default: 'ready'
  limit?: number                                     // default: 10, max: 50
}
```

**Output:**
```typescript
{
  workOrders: Array<{
    id: string
    title: string
    status: string
    phase: string | null
    feature: string | null
    deliverableType: string | null
  }>
}
```

---

### get_work_order

Get full work order details including description, acceptance criteria, and implementation plan.

**Input Schema:**
```typescript
{
  workOrderId: string
}
```

**Output:**
```typescript
{
  id: string
  title: string
  status: string
  phase: string | null
  feature: string | null
  description: string           // Rendered as markdown
  acceptanceCriteria: string    // Rendered as markdown
  outOfScope: string            // Rendered as markdown
  implementationPlan: string    // Rendered as markdown
  graphConnections: Array<{
    entityType: string
    label: string
    edgeType: string
  }>
}
```

---

### update_work_order_status

Update the status of a work order.

**Input Schema:**
```typescript
{
  workOrderId: string
  status: 'in_progress' | 'in_review' | 'done'
}
```

**Output:**
```typescript
{
  success: boolean
  workOrderId: string
  previousStatus: string
  newStatus: string
}
```

---

### search_context

Search across requirements, blueprints, and artifacts for additional context.

**Input Schema:**
```typescript
{
  query: string
  types?: Array<'documents' | 'blueprints' | 'artifacts' | 'code'>
  limit?: number    // default: 5, max: 20
}
```

**Output:**
```typescript
{
  results: Array<{
    type: string
    title: string
    snippet: string
    entityId: string
    score: number
  }>
}
```

---

## Resources

The MCP server also exposes read-only resources:

### project://overview

Project overview information including name, description, and feature list.

### project://features

List of all features with their names and relationships.

---

## Connection Setup

Users configure the MCP connection from the Planner UI. The setup dialog provides:

1. **One-click install** for supported agents (Cursor, Claude Code)
2. **Configuration JSON** for manual setup:

```json
{
  "mcpServers": {
    "openfactory": {
      "transport": "streamable-http",
      "url": "https://<instance>/api/mcp",
      "headers": {
        "Authorization": "Bearer of-key-xxxxxxxxxxxxx"
      }
    }
  }
}
```

The URL and API key are generated per-project from the Planner settings.
