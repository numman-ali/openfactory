# API Contract: Planner

**Base Path:** `/api/projects/:projectId/planner`
**Auth Required:** All endpoints. User must be org member.

---

## Phases

### GET /api/projects/:projectId/planner/phases

List phases.

**Response (200):**
```typescript
{
  phases: Array<{
    id: string
    name: string
    description: string | null
    sortOrder: number
    workOrderCount: number
    createdAt: string
  }>
}
```

### POST /api/projects/:projectId/planner/phases

Create a phase.

**Request:**
```typescript
{
  name: string
  description?: string
}
```

**Response (201):** Created phase.

### PATCH /api/projects/:projectId/planner/phases/:phaseId

Update a phase.

**Request:**
```typescript
{
  name?: string
  description?: string
  sortOrder?: number
}
```

**Response (200):** Updated phase.

### DELETE /api/projects/:projectId/planner/phases/:phaseId

Delete a phase. Work orders in the phase have their `phaseId` set to null.

**Response (204):** No content.

---

## Work Orders

### GET /api/projects/:projectId/planner/work-orders

List work orders with filtering.

**Query:**
- `status?: string` - Comma-separated statuses
- `phaseId?: string`
- `featureId?: string`
- `assigneeId?: string`
- `deliverableType?: string`
- `search?: string` - Full-text search on title
- `sortBy?: string` - `sortOrder` (default), `createdAt`, `updatedAt`
- `cursor?: string`
- `limit?: number` (default: 50, max: 200)

**Response (200):**
```typescript
{
  workOrders: Array<{
    id: string
    title: string
    status: 'backlog' | 'ready' | 'in_progress' | 'in_review' | 'done'
    phase: { id: string; name: string } | null
    feature: { id: string; name: string } | null
    assignees: Array<{ id: string; name: string; avatarUrl: string | null }>
    deliverableType: string | null
    sortOrder: number
    createdAt: string
    updatedAt: string
  }>
  nextCursor: string | null
  totalCount: number
}
```

### POST /api/projects/:projectId/planner/work-orders

Create a work order.

**Request:**
```typescript
{
  title: string
  phaseId?: string
  featureId?: string
  status?: 'backlog' | 'ready'
  description?: Record<string, unknown>
  acceptanceCriteria?: Record<string, unknown>
  outOfScope?: Record<string, unknown>
  implementationPlan?: Record<string, unknown>
  assigneeIds?: string[]
  deliverableType?: string
}
```

**Response (201):** Full work order object.

### GET /api/projects/:projectId/planner/work-orders/:workOrderId

Get full work order details.

**Response (200):**
```typescript
{
  id: string
  title: string
  status: string
  phase: { id: string; name: string } | null
  feature: { id: string; name: string } | null
  assignees: Array<{ id: string; name: string; avatarUrl: string | null }>
  description: Record<string, unknown> | null
  acceptanceCriteria: Record<string, unknown> | null
  outOfScope: Record<string, unknown> | null
  implementationPlan: Record<string, unknown> | null
  deliverableType: string | null
  sortOrder: number
  graphConnections: Array<{
    nodeId: string
    entityType: string
    entityId: string
    label: string
    edgeType: string
  }>
  createdBy: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}
```

### PATCH /api/projects/:projectId/planner/work-orders/:workOrderId

Update a work order.

**Request:**
```typescript
{
  title?: string
  status?: string
  phaseId?: string | null
  featureId?: string | null
  description?: Record<string, unknown>
  acceptanceCriteria?: Record<string, unknown>
  outOfScope?: Record<string, unknown>
  implementationPlan?: Record<string, unknown>
  assigneeIds?: string[]
  deliverableType?: string
  sortOrder?: number
}
```

**Response (200):** Updated work order.

### DELETE /api/projects/:projectId/planner/work-orders/:workOrderId

Soft-delete a work order.

**Response (204):** No content.

---

## Bulk Operations

### POST /api/projects/:projectId/planner/work-orders/bulk

Batch update multiple work orders.

**Request:**
```typescript
{
  workOrderIds: string[]
  updates: {
    status?: string
    phaseId?: string | null
    assigneeIds?: string[]
    deliverableType?: string
  }
}
```

**Response (200):**
```typescript
{
  updatedCount: number
  workOrders: Array<{ id: string; status: string; phaseId: string | null }>
}
```

---

## Reordering

### POST /api/projects/:projectId/planner/work-orders/reorder

Reorder work orders within a phase (drag-and-drop).

**Request:**
```typescript
{
  workOrderId: string
  targetPhaseId: string | null
  afterWorkOrderId: string | null  // null = move to beginning
}
```

**Response (200):**
```typescript
{
  updatedOrders: Array<{ id: string; sortOrder: number; phaseId: string | null }>
}
```

---

## Work Order Activity

### GET /api/projects/:projectId/planner/work-orders/:workOrderId/activity

Get activity feed for a work order.

**Query:**
- `cursor?: string`
- `limit?: number` (default: 30)

**Response (200):**
```typescript
{
  activities: Array<{
    id: string
    action: string
    changes: Record<string, { old: unknown; new: unknown }> | null
    actor: { id: string; name: string; type: string }
    createdAt: string
  }>
  nextCursor: string | null
}
```

---

## Comments on Work Orders

### GET /api/projects/:projectId/planner/work-orders/:workOrderId/comments

**Response (200):**
```typescript
{
  comments: Array<{
    id: string
    content: Record<string, unknown>
    threadId: string | null
    isAgent: boolean
    agentType: string | null
    resolved: boolean
    createdBy: { id: string; name: string } | null
    createdAt: string
    replies: Array</* same shape */>
  }>
}
```

### POST /api/projects/:projectId/planner/work-orders/:workOrderId/comments

**Request:**
```typescript
{
  content: Record<string, unknown>  // TipTap JSON
  threadId?: string                  // Reply to existing comment
}
```

**Response (201):** Created comment.

---

## Knowledge Graph Connections

### POST /api/projects/:projectId/planner/work-orders/:workOrderId/connections

Add a knowledge graph connection to a work order.

**Request:**
```typescript
{
  targetEntityType: 'document' | 'feature'
  targetEntityId: string
  edgeType: 'derives_from' | 'references'
}
```

**Response (201):** Created connection.

### DELETE /api/projects/:projectId/planner/work-orders/:workOrderId/connections/:connectionId

Remove a connection.

**Response (204):** No content.

---

## Sync Alerts

### GET /api/projects/:projectId/planner/sync-alerts

List work orders that need updates based on blueprint changes.

**Response (200):**
```typescript
{
  alerts: Array<{
    workOrderId: string
    workOrderTitle: string
    blueprintId: string
    blueprintTitle: string
    changeType: 'blueprint_updated' | 'blueprint_created'
    detectedAt: string
  }>
}
```
