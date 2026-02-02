# API Contract: Foundry

**Base Path:** `/api/projects/:projectId/foundry`
**Auth Required:** All endpoints. User must be org member.

---

## GET /api/projects/:projectId/foundry/blueprints

List all Foundry blueprints.

**Query:**
- `type?: 'foundation_blueprint' | 'system_diagram' | 'feature_blueprint'`
- `featureId?: string`

**Response (200):**
```typescript
{
  blueprints: Array<{
    id: string
    type: string
    title: string
    slug: string
    featureId: string | null
    featureName: string | null
    sortOrder: number
    createdBy: { id: string; name: string } | null
    updatedAt: string
    createdAt: string
  }>
}
```

---

## POST /api/projects/:projectId/foundry/blueprints

Create a new blueprint.

**Request:**
```typescript
{
  type: 'foundation_blueprint' | 'system_diagram' | 'feature_blueprint'
  title: string
  featureId?: string          // Required for feature_blueprint
  templateId?: string
  content?: Record<string, unknown>
  diagramSource?: string      // Mermaid source for system_diagram
}
```

**Response (201):**
```typescript
{
  id: string
  type: string
  title: string
  slug: string
  featureId: string | null
  content: Record<string, unknown> | null
  diagramSource: string | null
  createdAt: string
}
```

---

## GET /api/projects/:projectId/foundry/blueprints/:blueprintId

Get a single blueprint with full content.

**Response (200):**
```typescript
{
  id: string
  type: string
  title: string
  slug: string
  featureId: string | null
  content: Record<string, unknown> | null
  diagramSource: string | null
  sortOrder: number
  createdBy: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}
```

---

## PATCH /api/projects/:projectId/foundry/blueprints/:blueprintId

Update blueprint metadata.

**Request:**
```typescript
{
  title?: string
  sortOrder?: number
  diagramSource?: string      // Update Mermaid source
}
```

**Response (200):** Updated blueprint object.

---

## DELETE /api/projects/:projectId/foundry/blueprints/:blueprintId

Soft-delete a blueprint.

**Response (204):** No content.

---

## Version History

Version endpoints follow the same pattern as Refinery documents:

- `GET .../blueprints/:id/versions` - List versions
- `GET .../blueprints/:id/versions/:versionId` - Get version content
- `POST .../blueprints/:id/versions` - Create version snapshot
- `GET .../blueprints/:id/versions/:versionId/diff?compareWith=:id` - Diff two versions

See [refinery.md](./refinery.md) for the detailed response shapes.

---

## POST /api/projects/:projectId/foundry/initialize

Initialize Foundry from a template. Creates foundation blueprints and system diagram stubs.

**Request:**
```typescript
{
  templateId: string
}
```

**Response (201):**
```typescript
{
  blueprintsCreated: number
  blueprints: Array<{
    id: string
    type: string
    title: string
  }>
}
```

---

## GET /api/projects/:projectId/foundry/drift-alerts

List drift alerts for Foundry blueprints.

**Query:**
- `status?: 'open' | 'acknowledged' | 'resolved' | 'dismissed'`
- `type?: 'code_drift' | 'requirements_drift' | 'foundation_drift'`

**Response (200):**
```typescript
{
  alerts: Array<{
    id: string
    driftType: string
    description: string
    severity: 'low' | 'medium' | 'high'
    status: string
    sourceNode: { id: string; label: string; entityType: string }
    targetNode: { id: string; label: string; entityType: string } | null
    createdAt: string
  }>
}
```

---

## PATCH /api/projects/:projectId/foundry/drift-alerts/:alertId

Update drift alert status.

**Request:**
```typescript
{
  status: 'acknowledged' | 'resolved' | 'dismissed'
}
```

**Response (200):** Updated alert object.

---

## Import/Export

Same pattern as Refinery:
- `POST .../blueprints/:id/import` - Import from `.md`/`.docx`
- `GET .../blueprints/:id/export?format=md|docx|pdf` - Export single blueprint
- `GET .../foundry/export?format=md|docx|pdf` - Export all blueprints
