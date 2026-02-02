# API Contract: Validator

**Base Path:** `/api/projects/:projectId/validator`

---

## Feedback Ingestion (Public API)

### POST /api/projects/:projectId/validator/feedback

Submit user feedback. **Auth: API key with `validator:write` scope.**

The API key is passed in the `Authorization` header:
```
Authorization: Bearer of-key-xxxxxxxxxxxxx
```

**Request:**
```typescript
{
  title?: string
  description: string
  category?: 'bug' | 'feature_request' | 'performance' | 'other'
  // Optional enrichment data from client
  browserInfo?: {
    name: string
    version: string
    os: string
  }
  deviceInfo?: {
    type: string
    screenWidth: number
    screenHeight: number
  }
  sessionData?: Record<string, unknown>
  // Client-side user identifier
  externalUserId?: string
  tags?: string[]
}
```

**Response (201):**
```typescript
{
  id: string
  status: 'new'
  createdAt: string
}
```

**Errors:**
- `401` - Invalid API key
- `403` - API key does not have `validator:write` scope
- `429` - Rate limited

---

## Validator Inbox (Authenticated)

**Auth Required:** All endpoints below require user authentication.

### GET /api/projects/:projectId/validator/feedback

List feedback items (inbox view).

**Query:**
- `status?: string` - Comma-separated statuses
- `category?: string`
- `tags?: string` - Comma-separated tags
- `minPriority?: number` - Minimum priority score (0-1)
- `search?: string`
- `sortBy?: string` - `createdAt` (default), `priorityScore`
- `sortOrder?: 'asc' | 'desc'` (default: `desc`)
- `cursor?: string`
- `limit?: number` (default: 30, max: 100)

**Response (200):**
```typescript
{
  feedbackItems: Array<{
    id: string
    title: string | null
    description: string
    category: string | null
    priorityScore: number | null
    status: string
    tags: string[]
    browserInfo: Record<string, unknown> | null
    externalUserId: string | null
    generatedIssueUrl: string | null
    createdAt: string
  }>
  nextCursor: string | null
  totalCount: number
}
```

### GET /api/projects/:projectId/validator/feedback/:feedbackId

Get full feedback item details.

**Response (200):**
```typescript
{
  id: string
  title: string | null
  description: string
  category: string | null
  priorityScore: number | null
  status: string
  tags: string[]
  browserInfo: Record<string, unknown> | null
  deviceInfo: Record<string, unknown> | null
  sessionData: Record<string, unknown> | null
  externalUserId: string | null
  generatedIssueUrl: string | null
  generatedIssueId: string | null
  sourceAppKey: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}
```

### PATCH /api/projects/:projectId/validator/feedback/:feedbackId

Update feedback item (triage).

**Request:**
```typescript
{
  status?: 'triaged' | 'in_progress' | 'resolved' | 'dismissed'
  category?: string
  priorityScore?: number
  tags?: string[]
}
```

**Response (200):** Updated feedback item.

---

## Issue Generation

### POST /api/projects/:projectId/validator/feedback/:feedbackId/generate-issue

Generate a GitHub/Jira issue from feedback.

**Request:**
```typescript
{
  integration: 'github_issues' | 'jira'
  // Optional overrides for the generated issue
  title?: string
  body?: string
  labels?: string[]
}
```

**Response (201):**
```typescript
{
  issueUrl: string
  issueId: string
  integration: string
}
```

**Errors:**
- `400` - Integration not configured for this project
- `502` - External service error

---

## Feedback Stats

### GET /api/projects/:projectId/validator/stats

Get aggregated feedback statistics.

**Query:**
- `since?: string` - ISO 8601 date (default: 30 days ago)

**Response (200):**
```typescript
{
  totalCount: number
  byCategory: Record<string, number>
  byStatus: Record<string, number>
  averagePriorityScore: number
  topTags: Array<{ tag: string; count: number }>
  timeline: Array<{ date: string; count: number }>
}
```
