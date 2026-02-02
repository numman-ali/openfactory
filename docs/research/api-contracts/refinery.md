# API Contract: Refinery

**Base Path:** `/api/projects/:projectId/refinery`
**Auth Required:** All endpoints. User must be org member.

---

## GET /api/projects/:projectId/refinery/documents

List all Refinery documents (product overviews, feature requirements, technical requirements).

**Query:**
- `type?: 'product_overview' | 'feature_requirements' | 'technical_requirements'`
- `featureId?: string`

**Response (200):**
```typescript
{
  documents: Array<{
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

## POST /api/projects/:projectId/refinery/documents

Create a new Refinery document.

**Request:**
```typescript
{
  type: 'product_overview' | 'feature_requirements' | 'technical_requirements'
  title: string
  featureId?: string           // Required for feature_requirements
  templateId?: string          // Template to initialize content from
  content?: Record<string, unknown>  // Initial TipTap JSON content
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
  createdAt: string
}
```

**Errors:**
- `409` - Document of this type already exists for the feature
- `422` - featureId required for feature_requirements type

---

## GET /api/projects/:projectId/refinery/documents/:documentId

Get a single document with full content.

**Response (200):**
```typescript
{
  id: string
  type: string
  title: string
  slug: string
  featureId: string | null
  content: Record<string, unknown> | null
  sortOrder: number
  createdBy: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}
```

---

## PATCH /api/projects/:projectId/refinery/documents/:documentId

Update document metadata. Content is updated via Yjs collaboration, not this endpoint.

**Request:**
```typescript
{
  title?: string
  sortOrder?: number
}
```

**Response (200):** Updated document object.

---

## DELETE /api/projects/:projectId/refinery/documents/:documentId

Soft-delete a document.

**Response (204):** No content.

---

## GET /api/projects/:projectId/refinery/documents/:documentId/versions

List version history for a document.

**Query:**
- `cursor?: string`
- `limit?: number` (default: 20)

**Response (200):**
```typescript
{
  versions: Array<{
    id: string
    versionNumber: number
    changeSummary: string | null
    createdBy: { id: string; name: string } | null
    createdAt: string
  }>
  nextCursor: string | null
}
```

---

## GET /api/projects/:projectId/refinery/documents/:documentId/versions/:versionId

Get a specific version's content.

**Response (200):**
```typescript
{
  id: string
  versionNumber: number
  content: Record<string, unknown>
  changeSummary: string | null
  createdBy: { id: string; name: string } | null
  createdAt: string
}
```

---

## POST /api/projects/:projectId/refinery/documents/:documentId/versions

Create a named version snapshot (explicit save).

**Request:**
```typescript
{
  changeSummary?: string
}
```

**Response (201):** Created version object.

---

## GET /api/projects/:projectId/refinery/documents/:documentId/versions/:versionId/diff

Get the diff between two versions.

**Query:**
- `compareWith: string` - Version ID to compare against

**Response (200):**
```typescript
{
  baseVersion: { id: string; versionNumber: number }
  compareVersion: { id: string; versionNumber: number }
  diff: Record<string, unknown>    // Structured diff of ProseMirror content
}
```

---

## POST /api/projects/:projectId/refinery/documents/:documentId/import

Import content from a file, creating a new version.

**Request:** `multipart/form-data`
- `file` - `.md` or `.docx` file

**Response (200):**
```typescript
{
  versionNumber: number
  message: string
}
```

---

## GET /api/projects/:projectId/refinery/documents/:documentId/export

Export a document.

**Query:**
- `format: 'md' | 'docx' | 'pdf'`

**Response (200):** File download with appropriate `Content-Type`.

---

## GET /api/projects/:projectId/refinery/export

Export all Refinery documents as a single concatenated file.

**Query:**
- `format: 'md' | 'docx' | 'pdf'`

**Response (200):** File download.
