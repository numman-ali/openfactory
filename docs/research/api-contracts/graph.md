# API Contract: Knowledge Graph

**Base Path:** `/api/projects/:projectId/graph`
**Auth Required:** All endpoints. User must be org member.

---

## GET /api/projects/:projectId/graph/nodes

List graph nodes with optional filtering.

**Query:**
- `entityType?: string` - Filter by entity type
- `search?: string` - Search by label
- `limit?: number` (default: 100, max: 500)

**Response (200):**
```typescript
{
  nodes: Array<{
    id: string
    entityType: string
    entityId: string
    label: string
    metadata: Record<string, unknown>
    contentHash: string | null
    lastSyncedAt: string | null
    edgeCount: number
  }>
}
```

---

## GET /api/projects/:projectId/graph/nodes/:nodeId

Get a single node with its edges.

**Response (200):**
```typescript
{
  node: {
    id: string
    entityType: string
    entityId: string
    label: string
    metadata: Record<string, unknown>
    contentHash: string | null
    lastSyncedAt: string | null
  }
  outgoingEdges: Array<{
    id: string
    edgeType: string
    targetNode: { id: string; entityType: string; entityId: string; label: string }
    metadata: Record<string, unknown>
  }>
  incomingEdges: Array<{
    id: string
    edgeType: string
    sourceNode: { id: string; entityType: string; entityId: string; label: string }
    metadata: Record<string, unknown>
  }>
}
```

---

## GET /api/projects/:projectId/graph/edges

List edges with filtering.

**Query:**
- `edgeType?: string`
- `sourceNodeId?: string`
- `targetNodeId?: string`

**Response (200):**
```typescript
{
  edges: Array<{
    id: string
    edgeType: string
    sourceNode: { id: string; entityType: string; label: string }
    targetNode: { id: string; entityType: string; label: string }
    metadata: Record<string, unknown>
    createdAt: string
  }>
}
```

---

## POST /api/projects/:projectId/graph/edges

Create an edge between two nodes.

**Request:**
```typescript
{
  sourceNodeId: string
  targetNodeId: string
  edgeType: 'derives_from' | 'shared_context' | 'implements' | 'feedback_on' | 'references' | 'blocks' | 'related_to'
  metadata?: Record<string, unknown>
}
```

**Response (201):** Created edge.

**Errors:**
- `409` - Edge already exists with this type between these nodes
- `404` - Node not found

---

## DELETE /api/projects/:projectId/graph/edges/:edgeId

Delete an edge.

**Response (204):** No content.

---

## GET /api/projects/:projectId/graph/traverse

Traverse the graph from a starting node.

**Query:**
- `startNodeId: string` - Starting node
- `edgeTypes?: string` - Comma-separated edge types to follow
- `direction?: 'outgoing' | 'incoming' | 'both'` (default: `outgoing`)
- `maxDepth?: number` (default: 3, max: 10)

**Response (200):**
```typescript
{
  nodes: Array<{
    id: string
    entityType: string
    entityId: string
    label: string
    depth: number
  }>
  edges: Array<{
    id: string
    edgeType: string
    sourceNodeId: string
    targetNodeId: string
  }>
}
```

---

## GET /api/projects/:projectId/graph/impact

Get the impact analysis for a node change (which downstream nodes would be affected).

**Query:**
- `nodeId: string` - The changed node

**Response (200):**
```typescript
{
  impactedNodes: Array<{
    id: string
    entityType: string
    entityId: string
    label: string
    impactPath: Array<{
      edgeType: string
      nodeLabel: string
    }>
    severity: 'direct' | 'indirect'
  }>
}
```

---

## Drift Alerts

### GET /api/projects/:projectId/graph/drift-alerts

List all drift alerts across the project.

**Query:**
- `status?: string`
- `driftType?: string`
- `severity?: string`
- `cursor?: string`
- `limit?: number` (default: 20)

**Response (200):**
```typescript
{
  alerts: Array<{
    id: string
    driftType: string
    description: string
    severity: 'low' | 'medium' | 'high'
    status: string
    sourceNode: { id: string; entityType: string; label: string }
    targetNode: { id: string; entityType: string; label: string } | null
    createdAt: string
    updatedAt: string
  }>
  nextCursor: string | null
}
```

### PATCH /api/projects/:projectId/graph/drift-alerts/:alertId

Update a drift alert status.

**Request:**
```typescript
{
  status: 'acknowledged' | 'resolved' | 'dismissed'
}
```

**Response (200):** Updated alert.
