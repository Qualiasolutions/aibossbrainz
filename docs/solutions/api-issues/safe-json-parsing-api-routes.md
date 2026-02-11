---
title: "Safe JSON Parsing for API Routes"
category: api-issues
tags: [error-handling, json, request-parsing, api-routes, typescript]
date_solved: 2026-01-18
severity: medium
component: lib/api-utils.ts
related_issues: []
---

# Safe JSON Parsing for API Routes

## Problem Symptom

API routes calling `request.json()` directly without error handling caused unhandled exceptions when clients sent malformed JSON.

**Observable behavior:**
- Unhandled promise rejections in production logs
- 500 errors instead of descriptive 400 errors
- Inconsistent error response formats across routes
- No way for clients to understand what went wrong

**Example failing request:**
```bash
# Malformed JSON causes 500 error
curl -X POST /api/reactions \
  -H "Content-Type: application/json" \
  -d '{invalid json'
```

## Investigation Steps

1. Searched for `request.json()` calls across API routes
2. Found multiple routes without try-catch around JSON parsing
3. Identified inconsistent error handling patterns
4. Created centralized utility for safe parsing

## Root Cause

Routes called `request.json()` directly without handling parse errors:

```typescript
// VULNERABLE: Malformed JSON throws unhandled error
export async function POST(request: Request) {
  const { messageId, reactionType } = await request.json();  // Can throw!
  // ...
}
```

When `request.json()` receives invalid JSON, it throws a `SyntaxError`. Without a try-catch, this bubbles up as an unhandled error, returning a generic 500 response instead of a helpful 400 error.

## Working Solution

Created `lib/api-utils.ts` with two utility functions:

### Option 1: `safeParseJson<T>()` - Throws ChatSDKError (Recommended)

```typescript
import "server-only";
import { ChatSDKError } from "./errors";

/**
 * Safely parse JSON from a Request body.
 * Returns the parsed data or throws a ChatSDKError with proper 400 response.
 */
export async function safeParseJson<T = unknown>(
  request: Request,
): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new ChatSDKError("bad_request:api", "Invalid JSON in request body");
  }
}
```

### Option 2: `safeParseJsonResult<T>()` - Returns Result Type

```typescript
/**
 * Safely parse JSON from a Request body with result type.
 * Returns { success: true, data } or { success: false, error: Response }
 */
export async function safeParseJsonResult<T = unknown>(
  request: Request,
): Promise<
  | { success: true; data: T }
  | { success: false; error: Response }
> {
  try {
    const data = await request.json();
    return { success: true, data };
  } catch {
    return {
      success: false,
      error: new ChatSDKError(
        "bad_request:api",
        "Invalid JSON in request body",
      ).toResponse(),
    };
  }
}
```

## Usage Pattern

### With safeParseJson (within try-catch block)

Best for routes that already have error handling:

```typescript
import { safeParseJson } from "@/lib/api-utils";
import { ChatSDKError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    // Type-safe destructuring with generic parameter
    const { messageId, reactionType } = await safeParseJson<{
      messageId: string;
      reactionType: string;
    }>(request);

    if (!messageId || !reactionType) {
      return new ChatSDKError(
        "bad_request:api",
        "Missing messageId or reactionType",
      ).toResponse();
    }

    // Process request...
    return Response.json({ success: true });
  } catch (error) {
    // ChatSDKError from safeParseJson is caught here
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError("bad_request:api", "Request failed").toResponse();
  }
}
```

### With safeParseJsonResult (early return pattern)

Best for routes preferring early returns over try-catch:

```typescript
import { safeParseJsonResult } from "@/lib/api-utils";

export async function POST(request: Request) {
  const result = await safeParseJsonResult<{
    messageId: string;
  }>(request);

  if (!result.success) {
    return result.error;  // Returns 400 response
  }

  const { messageId } = result.data;
  // Process request...
}
```

## Routes Updated

1. **`app/(chat)/api/reactions/route.ts`** - POST, DELETE handlers
2. **`app/(chat)/api/vote/route.ts`** - PATCH handler
3. **`app/(chat)/api/profile/route.ts`** - POST handler

## Error Response Format

The `ChatSDKError` class provides consistent error responses:

```json
{
  "code": "bad_request:api",
  "message": "The request couldn't be processed. Please check your input and try again.",
  "cause": "Invalid JSON in request body"
}
```

HTTP Status: `400 Bad Request`

## Prevention Strategies

1. **Always use safeParseJson** - Never call `request.json()` directly in API routes

2. **Lint rule suggestion** - Add ESLint rule to warn on direct `request.json()` calls:
   ```javascript
   // .eslintrc.js (future enhancement)
   rules: {
     'no-restricted-syntax': [
       'error',
       {
         selector: 'CallExpression[callee.property.name="json"][callee.object.name="request"]',
         message: 'Use safeParseJson() instead of request.json()'
       }
     ]
   }
   ```

3. **Code review checklist** - Verify all new API routes use safe parsing utilities

4. **Integration tests** - Test routes with malformed JSON:
   ```typescript
   test('returns 400 for malformed JSON', async () => {
     const response = await fetch('/api/reactions', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: '{invalid',
     });
     expect(response.status).toBe(400);
     const data = await response.json();
     expect(data.code).toBe('bad_request:api');
   });
   ```

## Routes Still Needing Update

Run this grep to find remaining routes calling `request.json()` directly:

```bash
grep -r "request\.json()" app/ --include="*.ts" | grep -v "safeParseJson"
```

Priority routes to update:
- `app/(chat)/api/chat/route.ts`
- `app/(chat)/api/document/route.ts`
- `app/(chat)/api/suggestions/route.ts`

## Benefits of This Pattern

1. **Type safety** - Generic parameter enables typed destructuring
2. **Consistent errors** - All routes return same error format
3. **Proper HTTP status** - 400 instead of 500 for client errors
4. **Helpful messages** - Clients know JSON was invalid
5. **Centralized logic** - Easy to update error handling in one place

## Cross-References

- **Error system:** `lib/errors.ts` - ChatSDKError class
- **API utilities:** `lib/api-utils.ts` - Safe parsing functions
- **Todo:** `todos/005-pending-p2-json-parse-error-handling.md`
- **Production audit:** `plans/fix-production-audit-high-priority.md`

## Learnings

1. Always wrap `request.json()` in error handling
2. Return 400 (client error) not 500 (server error) for bad input
3. Centralize utilities for cross-cutting concerns
4. Use TypeScript generics for type-safe API parsing
5. The `ChatSDKError` class provides excellent DX for consistent error handling
