# API Contract: Organizations

**Base Path:** `/api/organizations`
**Auth Required:** All endpoints require authentication.

---

## GET /api/organizations

List organizations the current user belongs to.

**Response (200):**
```typescript
{
  organizations: Array<{
    id: string
    name: string
    slug: string
    logoUrl: string | null
    role: 'member' | 'admin'
    memberCount: number
    projectCount: number
  }>
}
```

---

## GET /api/organizations/:orgId

Get organization details. User must be a member.

**Response (200):**
```typescript
{
  id: string
  name: string
  slug: string
  logoUrl: string | null
  settings: Record<string, unknown>
  createdAt: string
}
```

**Errors:**
- `403` - Not a member
- `404` - Not found

---

## PATCH /api/organizations/:orgId

Update organization settings. **Admin only.**

**Request:**
```typescript
{
  name?: string
  logoUrl?: string
  settings?: Record<string, unknown>
}
```

**Response (200):** Updated organization object.

---

## GET /api/organizations/:orgId/members

List organization members. **Admin only.**

**Response (200):**
```typescript
{
  members: Array<{
    id: string
    userId: string
    email: string
    name: string
    avatarUrl: string | null
    role: 'member' | 'admin'
    joinedAt: string
  }>
}
```

---

## POST /api/organizations/:orgId/members

Invite a member. **Admin only.**

**Request:**
```typescript
{
  email: string
  role: 'member' | 'admin'
}
```

**Response (201):**
```typescript
{
  id: string
  email: string
  role: string
  invitedAt: string
}
```

**Errors:**
- `409` - Already a member
- `402` - Seat limit reached

---

## PATCH /api/organizations/:orgId/members/:memberId

Update member role. **Admin only.**

**Request:**
```typescript
{
  role: 'member' | 'admin'
}
```

**Response (200):** Updated member object.

---

## DELETE /api/organizations/:orgId/members/:memberId

Remove a member. **Admin only.**

**Response (204):** No content.

---

## GET /api/organizations/:orgId/api-keys

List API keys. Shows prefix and metadata, never the full key.

**Response (200):**
```typescript
{
  apiKeys: Array<{
    id: string
    name: string
    keyPrefix: string
    scopes: string[]
    projectId: string | null
    lastUsedAt: string | null
    expiresAt: string | null
    createdAt: string
  }>
}
```

---

## POST /api/organizations/:orgId/api-keys

Create a new API key. **The full key is returned only once.**

**Request:**
```typescript
{
  name: string
  scopes: string[]
  projectId?: string        // null = org-wide
  expiresAt?: string        // ISO 8601, null = never
}
```

**Response (201):**
```typescript
{
  id: string
  name: string
  key: string               // Full key, shown once: "of-key-xxxxxxxxxxxxxxxx"
  keyPrefix: string
  scopes: string[]
  projectId: string | null
  expiresAt: string | null
  createdAt: string
}
```

---

## DELETE /api/organizations/:orgId/api-keys/:keyId

Revoke an API key. **Admin only.**

**Response (204):** No content.

---

## GET /api/organizations/:orgId/templates

List organization-level templates.

**Query:**
- `type?: string` - Filter by template type

**Response (200):**
```typescript
{
  templates: Array<{
    id: string
    type: string
    name: string
    description: string | null
    isDefault: boolean
    createdAt: string
  }>
}
```

---

## POST /api/organizations/:orgId/templates

Create an organization template from a project template. **Admin only.**

**Request:**
```typescript
{
  name: string
  type: string
  description?: string
  content: Record<string, unknown>
}
```

**Response (201):** Created template object.
