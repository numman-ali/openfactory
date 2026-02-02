# API Contract: Authentication

**Base Path:** `/api/auth`

All auth endpoints are public unless noted. Authentication uses Bearer tokens (session tokens) or API keys.

---

## POST /api/auth/signup

Create a new user account and organization.

**Request:**
```typescript
{
  email: string        // valid email
  password: string     // min 8 chars
  name: string
  organizationName: string
}
```

**Response (201):**
```typescript
{
  user: {
    id: string
    email: string
    name: string
  }
  organization: {
    id: string
    name: string
    slug: string
  }
  session: {
    token: string
    expiresAt: string  // ISO 8601
  }
}
```

**Errors:**
- `409` - Email already exists
- `422` - Validation error

---

## POST /api/auth/signin

Sign in with email and password.

**Request:**
```typescript
{
  email: string
  password: string
}
```

**Response (200):**
```typescript
{
  user: {
    id: string
    email: string
    name: string
    avatarUrl: string | null
  }
  session: {
    token: string
    expiresAt: string
  }
}
```

**Errors:**
- `401` - Invalid credentials

---

## POST /api/auth/signout

Sign out the current session. **Requires auth.**

**Response (204):** No content.

---

## GET /api/auth/session

Get the current session info. **Requires auth.**

**Response (200):**
```typescript
{
  user: {
    id: string
    email: string
    name: string
    avatarUrl: string | null
  }
  organizationId: string
  role: 'member' | 'admin'
}
```

**Errors:**
- `401` - No valid session

---

## GET /api/auth/oauth/:provider

Initiate OAuth flow. Redirects to provider.

**Params:** `provider` - `github` | `google`
**Query:** `redirectTo?: string`

**Response:** `302` redirect to OAuth provider.

---

## GET /api/auth/oauth/:provider/callback

OAuth callback. Handled by Better Auth internally.

---

## POST /api/auth/forgot-password

Request a password reset email.

**Request:**
```typescript
{
  email: string
}
```

**Response (200):**
```typescript
{
  message: "If an account exists, a reset email has been sent."
}
```

---

## POST /api/auth/reset-password

Reset password with a token.

**Request:**
```typescript
{
  token: string
  newPassword: string
}
```

**Response (200):**
```typescript
{
  message: "Password reset successfully."
}
```

**Errors:**
- `400` - Invalid or expired token

---

## API Key Authentication

API keys are passed in the `Authorization` header:
```
Authorization: Bearer of-key-xxxxxxxxxxxxx
```

API keys are scoped to an organization and optionally to a project. Scopes control access:
- `mcp:read` - Read work orders, documents, context
- `mcp:write` - Update work order status
- `validator:write` - Submit feedback items

API key management endpoints are under `/api/organizations/:orgId/api-keys` (see organizations.md).
