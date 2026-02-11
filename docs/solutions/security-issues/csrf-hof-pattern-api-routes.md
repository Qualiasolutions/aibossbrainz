---
title: "CSRF Higher-Order Function Pattern for API Routes"
category: security-issues
tags: [csrf, security, nextjs, api-routes, higher-order-function, dry, typescript]
date_solved: 2026-01-18
severity: high
component: lib/security/with-csrf.ts
related_issues: [csrf-validation-api-routes.md]
---

# CSRF Higher-Order Function Pattern for API Routes

## Problem Symptom

CSRF validation was copy-pasted across API routes with identical 5-line code blocks, violating DRY principles. Additionally, 10+ state-changing routes were still missing CSRF protection entirely.

**Observable behavior:**
- Duplicate CSRF validation code in every protected route
- Inconsistent error responses across routes
- Easy to forget adding CSRF to new routes
- Maintenance nightmare when validation logic needs updates

**Before (duplicated across 5+ routes):**

```typescript
import { validateCsrfRequest } from "@/lib/security/csrf";

export async function POST(request: Request) {
  // CSRF validation - copy-pasted everywhere
  const csrf = await validateCsrfRequest(request);
  if (!csrf.valid) {
    return new Response(JSON.stringify({ error: csrf.error }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Actual handler logic...
}
```

## Investigation Steps

1. Audited all state-changing routes for CSRF validation
2. Found 5 routes with copy-pasted validation blocks
3. Found 10+ routes missing CSRF protection entirely
4. Identified opportunity for Higher-Order Function (HOF) pattern
5. Needed to support both simple routes and dynamic routes with params

## Root Cause

No abstraction layer existed for cross-cutting security concerns. Each route handler was responsible for its own CSRF validation, leading to:
- Code duplication across handlers
- Inconsistent error handling (some used `Response`, others `ChatSDKError`)
- Forgotten protection on newer routes

## Working Solution

Created a generic Higher-Order Function that wraps route handlers with CSRF validation.

**File: `lib/security/with-csrf.ts`**

```typescript
import { validateCsrfRequest } from "@/lib/security/csrf";
import { ChatSDKError } from "@/lib/errors";

type RouteHandler<TContext = unknown> = (
  request: Request,
  context?: TContext,
) => Promise<Response>;

/**
 * Higher-order function that wraps route handlers with CSRF validation.
 * Use this for all state-changing operations (POST, PUT, PATCH, DELETE).
 *
 * @example
 * export const POST = withCsrf(async (request: Request) => {
 *   // Your handler logic here - CSRF already validated
 *   return Response.json({ success: true });
 * });
 */
export function withCsrf<TContext = unknown>(
  handler: RouteHandler<TContext>,
): RouteHandler<TContext> {
  return async (request: Request, context?: TContext): Promise<Response> => {
    const csrf = await validateCsrfRequest(request);

    if (!csrf.valid) {
      return new ChatSDKError("forbidden:api", csrf.error).toResponse();
    }

    return handler(request, context);
  };
}
```

**Usage - Simple routes:**

```typescript
import { withCsrf } from "@/lib/security/with-csrf";

export const POST = withCsrf(async (request: Request) => {
  const body = await request.json();
  // Handler logic - CSRF already validated
  return Response.json({ success: true });
});
```

**Usage - Dynamic routes with params:**

```typescript
import { withCsrf } from "@/lib/security/with-csrf";

export const PATCH = withCsrf(
  async (
    request: Request,
    context?: { params: Promise<{ ticketId: string }> },
  ) => {
    const { ticketId } = await context!.params;
    // Handler logic with route params
    return Response.json({ updated: true });
  },
);
```

**Key design decisions:**
- Generic `TContext` parameter handles Next.js dynamic route params
- Uses existing `ChatSDKError` for consistent error responses
- Arrow function export pattern works with Next.js App Router
- GET handlers don't need wrapping (read-only)

## Prevention Strategies

1. **Use `withCsrf` for all new mutation routes** - Single line addition
2. **Code review checklist** - Verify mutations use HOF wrapper
3. **Grep for unprotected routes** - `grep -r "export async function POST" --include="route.ts"`
4. **Consider middleware layer** - For even more automatic protection
5. **TypeScript strict mode** - Catch missing context params early

**Quick audit command:**

```bash
# Find POST/PATCH/DELETE handlers not using withCsrf
grep -rn "export async function \(POST\|PATCH\|DELETE\)" app/ --include="*.ts" | grep -v withCsrf
```

## Files Affected

**New file:**
- `lib/security/with-csrf.ts` - HOF implementation

**Migrated routes (14 total):**
- `app/(chat)/api/chat/route.ts` - POST, DELETE
- `app/(chat)/api/document/route.ts` - POST, PATCH, DELETE
- `app/(chat)/api/vote/route.ts` - PATCH
- `app/(chat)/api/reactions/route.ts` - POST, DELETE
- `app/(chat)/api/history/route.ts` - DELETE
- `app/(chat)/api/files/upload/route.ts` - POST
- `app/(chat)/api/delete-account/route.ts` - POST
- `app/(chat)/api/profile/route.ts` - POST
- `app/(chat)/api/accept-tos/route.ts` - POST
- `app/(chat)/api/canvas/route.ts` - POST
- `app/(chat)/api/support/route.ts` - POST
- `app/(chat)/api/support/[ticketId]/route.ts` - PATCH
- `app/(chat)/api/support/[ticketId]/messages/route.ts` - POST

## Cross-References

- **Initial CSRF Solution:** `docs/solutions/security-issues/csrf-validation-api-routes.md`
- **Production Audit:** `plans/fix-production-audit-high-priority.md`
- **Todo:** `todos/001-pending-p1-csrf-middleware-refactor.md`

## Learnings

1. **HOF pattern** is ideal for cross-cutting concerns like auth/CSRF
2. **Generic type parameters** handle varied Next.js route signatures
3. **Consistent error handling** via shared `ChatSDKError` class
4. **Arrow function exports** required for HOF pattern in Next.js App Router
5. **Context parameter** must be optional for simple routes, required access via `!` for dynamic routes
6. **DRY > repetition** - 5 lines x 14 routes = 70 lines saved, plus consistency
