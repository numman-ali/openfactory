# API Contract: Projects

**Base Path:** `/api/organizations/:orgId/projects`
**Auth Required:** All endpoints. User must be org member.

---

## GET /api/organizations/:orgId/projects

List projects in an organization.

**Query:**
- `includeArchived?: boolean` (default: false)

**Response (200):**
```typescript
{
  projects: Array<{
    id: string
    name: string
    slug: string
    description: string | null
    archivedAt: string | null
    featureCount: number
    documentCount: number
    workOrderCount: number
    createdAt: string
    updatedAt: string
  }>
}
```

---

## POST /api/organizations/:orgId/projects

Create a new project.

**Request:**
```typescript
{
  name: string
  description?: string
  templateId?: string       // Foundry template to initialize with
}
```

**Response (201):**
```typescript
{
  id: string
  name: string
  slug: string
  description: string | null
  settings: Record<string, unknown>
  createdAt: string
}
```

---

## GET /api/projects/:projectId

Get project details.

**Response (200):**
```typescript
{
  id: string
  name: string
  slug: string
  description: string | null
  organizationId: string
  settings: Record<string, unknown>
  stats: {
    featureCount: number
    documentCount: number
    workOrderCount: number
    artifactCount: number
    hasCodebaseConnection: boolean
  }
  createdAt: string
  updatedAt: string
}
```

---

## PATCH /api/projects/:projectId

Update project settings.

**Request:**
```typescript
{
  name?: string
  description?: string
  settings?: Record<string, unknown>
}
```

**Response (200):** Updated project object.

---

## POST /api/projects/:projectId/archive

Archive a project. **Admin only.**

**Response (200):**
```typescript
{
  archivedAt: string
}
```

---

## GET /api/projects/:projectId/features

List features for a project.

**Response (200):**
```typescript
{
  features: Array<{
    id: string
    name: string
    slug: string
    parentId: string | null
    sortOrder: number
    children: Array</* recursive */>
  }>
}
```

---

## POST /api/projects/:projectId/features

Create a feature.

**Request:**
```typescript
{
  name: string
  parentId?: string
}
```

**Response (201):** Created feature with generated slug.

---

## PATCH /api/projects/:projectId/features/:featureId

Update a feature. Renaming propagates to linked documents.

**Request:**
```typescript
{
  name?: string
  parentId?: string
  sortOrder?: number
}
```

**Response (200):** Updated feature.

---

## DELETE /api/projects/:projectId/features/:featureId

Soft-delete a feature and its child features.

**Response (204):** No content.

---

## GET /api/projects/:projectId/activity

Get the project activity feed.

**Query:**
- `entityType?: string`
- `entityId?: string`
- `cursor?: string`
- `limit?: number` (default: 50, max: 100)

**Response (200):**
```typescript
{
  activities: Array<{
    id: string
    entityType: string
    entityId: string
    action: string
    changes: Record<string, { old: unknown; new: unknown }> | null
    actor: {
      id: string
      name: string
      avatarUrl: string | null
      type: 'user' | 'agent' | 'system'
    }
    createdAt: string
  }>
  nextCursor: string | null
}
```

---

## GET /api/projects/:projectId/search

Full-text search across all project entities.

**Query:**
- `q: string` - Search query
- `types?: string` - Comma-separated entity types to search
- `limit?: number` (default: 20)

**Response (200):**
```typescript
{
  results: Array<{
    entityType: string
    entityId: string
    title: string
    snippet: string
    score: number
  }>
}
```
