# API Contract: Artifacts

**Base Path:** `/api/projects/:projectId/artifacts`
**Auth Required:** All endpoints. User must be org member.

---

## Folders

### GET /api/projects/:projectId/artifacts/folders

List artifact folders.

**Response (200):**
```typescript
{
  folders: Array<{
    id: string
    name: string
    parentId: string | null
    sortOrder: number
    artifactCount: number
    children: Array</* recursive */>
  }>
}
```

### POST /api/projects/:projectId/artifacts/folders

Create a folder.

**Request:**
```typescript
{
  name: string
  parentId?: string
}
```

**Response (201):** Created folder.

### PATCH /api/projects/:projectId/artifacts/folders/:folderId

Rename or move a folder.

**Request:**
```typescript
{
  name?: string
  parentId?: string | null
  sortOrder?: number
}
```

**Response (200):** Updated folder.

### DELETE /api/projects/:projectId/artifacts/folders/:folderId

Delete a folder. Artifacts in the folder have their `folderId` set to null (moved to root).

**Response (204):** No content.

---

## Artifacts

### GET /api/projects/:projectId/artifacts

List artifacts.

**Query:**
- `folderId?: string` - Filter by folder (use `root` for unfiled)
- `search?: string`
- `mimeType?: string`
- `cursor?: string`
- `limit?: number` (default: 50)

**Response (200):**
```typescript
{
  artifacts: Array<{
    id: string
    name: string
    fileName: string
    mimeType: string
    fileSize: number
    folderId: string | null
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
    uploadedBy: { id: string; name: string } | null
    createdAt: string
  }>
  nextCursor: string | null
}
```

### POST /api/projects/:projectId/artifacts

Upload an artifact. **Request: `multipart/form-data`**

Fields:
- `file` - The file to upload
- `name` - Display name (optional, defaults to file name)
- `folderId` - Target folder ID (optional)

**Response (201):**
```typescript
{
  id: string
  name: string
  fileName: string
  mimeType: string
  fileSize: number
  folderId: string | null
  processingStatus: 'pending'
  createdAt: string
}
```

**Errors:**
- `413` - File too large (limit: 50 MB)
- `415` - Unsupported file type

### GET /api/projects/:projectId/artifacts/:artifactId

Get artifact metadata.

**Response (200):**
```typescript
{
  id: string
  name: string
  fileName: string
  mimeType: string
  fileSize: number
  folderId: string | null
  processingStatus: string
  extractedText: string | null  // Available after processing
  uploadedBy: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}
```

### GET /api/projects/:projectId/artifacts/:artifactId/download

Download the artifact file.

**Response (200):** File stream with appropriate `Content-Type` and `Content-Disposition`.

### PATCH /api/projects/:projectId/artifacts/:artifactId

Update artifact metadata (rename, move).

**Request:**
```typescript
{
  name?: string
  folderId?: string | null
}
```

**Response (200):** Updated artifact.

### DELETE /api/projects/:projectId/artifacts/:artifactId

Soft-delete an artifact. The file in object storage is not immediately deleted (cleanup job handles it).

**Response (204):** No content.
