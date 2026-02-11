---
title: "CSRF Validation for Next.js API Routes"
category: security-issues
tags: [csrf, security, nextjs, api-routes, authentication]
date_solved: 2026-01-18
severity: critical
component: app/(chat)/api/*
related_issues: []
---

# CSRF Validation for Next.js API Routes

## Problem Symptom

State-changing API routes (POST, PATCH, DELETE) were missing CSRF protection, making them vulnerable to cross-site request forgery attacks.

**Observable behavior:**
- Production audit flagged as P1 security issue
- Malicious sites could trigger actions on behalf of authenticated users
- No token validation on mutation endpoints

## Investigation Steps

1. Audited all API routes under `app/(chat)/api/`
2. Identified state-changing routes without CSRF validation
3. Found existing `validateCsrfRequest` utility in `lib/security/csrf.ts`
4. Determined pattern for adding validation to routes

## Root Cause

Routes were created without security considerations, focusing only on functionality:

```typescript
// VULNERABLE: No CSRF validation
export async function POST(request: Request) {
  const body = await request.json();
  // Process mutation...
}
```

## Working Solution

Add CSRF validation at the start of state-changing handlers:

```typescript
import { validateCsrfRequest } from "@/lib/security/csrf";

export async function POST(request: Request) {
  // CSRF validation for state-changing operation
  const csrf = await validateCsrfRequest(request);
  if (!csrf.valid) {
    return new Response(JSON.stringify({ error: csrf.error }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Now safe to process mutation
  const body = await request.json();
  // ...
}
```

**Routes that need CSRF:**
- Any POST that creates/updates data
- PATCH for updates
- DELETE for removal
- PUT for replacements

**Routes that DON'T need CSRF:**
- GET requests (read-only)
- Public API endpoints (no session)
- Webhook handlers (different auth mechanism)

## Prevention Strategies

1. **Use middleware (recommended)** - Create Next.js middleware that validates CSRF for all POST/PATCH/DELETE
2. **Code review checklist** - Verify CSRF on all new mutation routes
3. **Linting rule** - Custom ESLint rule to detect missing CSRF validation
4. **Integration tests** - Test that routes reject requests without CSRF token

**Middleware approach (future improvement):**

```typescript
// middleware.ts
import { validateCsrfRequest } from "@/lib/security/csrf";

export async function middleware(request: NextRequest) {
  if (["POST", "PATCH", "DELETE", "PUT"].includes(request.method)) {
    const csrf = await validateCsrfRequest(request);
    if (!csrf.valid) {
      return new Response(JSON.stringify({ error: csrf.error }), { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
```

## Routes Updated in This Fix

1. `app/(chat)/api/delete-account/route.ts` - POST
2. `app/(chat)/api/profile/route.ts` - POST
3. `app/(chat)/api/vote/route.ts` - PATCH
4. `app/(chat)/api/reactions/route.ts` - POST, DELETE

## Routes Still Needing CSRF (Follow-up)

- `app/(chat)/api/chat/route.ts` - POST, DELETE
- `app/(chat)/api/document/route.ts` - POST, PATCH, DELETE
- `app/(chat)/api/files/upload/route.ts` - POST
- `app/(chat)/api/history/route.ts` - DELETE
- `app/(chat)/api/suggestions/route.ts` - POST

See `todos/001-pending-p1-csrf-middleware-refactor.md` for comprehensive fix.

## Cross-References

- **OWASP CSRF Prevention:** https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- **Production Audit:** `plans/fix-production-audit-high-priority.md`
- **Todo:** `todos/001-pending-p1-csrf-middleware-refactor.md`

## Learnings

1. Always validate CSRF on state-changing routes
2. Use existing utility functions (`validateCsrfRequest`)
3. DRY principle - consider middleware for cross-cutting concerns
4. GET requests are safe (read-only), mutations need protection
5. Return 403 status with JSON error for consistent API responses
