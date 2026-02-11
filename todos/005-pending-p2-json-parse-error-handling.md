---
status: completed
priority: p2
issue_id: "005"
tags: [code-review, reliability, error-handling]
dependencies: []
completed_at: 2026-01-18
---

# Add JSON Parse Error Handling in API Routes

## Problem Statement

Several API routes call `await request.json()` without try-catch, which can throw if the request body is malformed JSON.

## Findings

- Routes affected:
  - `app/(chat)/api/reactions/route.ts:96`
  - `app/(chat)/api/reactions/route.ts:155`
  - `app/(chat)/api/vote/route.ts:52-57`
  - `app/(chat)/api/profile/route.ts:82`

**Current pattern:**
```typescript
const { messageId, reactionType } = await request.json();
// No error handling - throws on malformed JSON
```

## Proposed Solutions

### Option 1: Wrap in Try-Catch

**Approach:** Add try-catch around JSON parsing with proper error response.

```typescript
let body;
try {
  body = await request.json();
} catch {
  return new Response("Invalid JSON", { status: 400 });
}
```

**Pros:**
- Simple fix
- Clear error messages

**Cons:**
- Repetitive across routes

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Create Safe JSON Parser Utility

**Approach:** Create reusable utility function.

```typescript
async function safeParseJson<T>(request: Request): Promise<{ data: T } | { error: Response }> {
  try {
    return { data: await request.json() };
  } catch {
    return { error: new Response("Invalid JSON", { status: 400 }) };
  }
}
```

**Pros:**
- DRY
- Consistent error handling
- Type-safe

**Cons:**
- Additional abstraction

**Effort:** 1 hour

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- All API routes that parse JSON body

## Acceptance Criteria

- [x] All `request.json()` calls have error handling
- [x] Malformed JSON returns 400 status
- [x] Clear error messages

## Work Log

### 2026-01-18 - Initial Discovery

**By:** Claude Code (workflows:review - kieran-typescript-reviewer)

**Actions:**
- Identified missing JSON parse error handling
- Catalogued affected routes

### 2026-01-18 - Implementation Complete

**By:** Claude Code

**Solution:** Option 2 - Safe JSON Parser Utility

**Actions:**
- Created `lib/api-utils.ts` with `safeParseJson<T>()` utility
- Updated `app/(chat)/api/reactions/route.ts` (POST, DELETE)
- Updated `app/(chat)/api/vote/route.ts` (PATCH)
- Updated `app/(chat)/api/profile/route.ts` (POST)
- All handlers now properly catch and return `ChatSDKError` for invalid JSON

**Code Added:**
```typescript
// lib/api-utils.ts
export async function safeParseJson<T = unknown>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new ChatSDKError("bad_request:api", "Invalid JSON in request body");
  }
}
```

**Usage Pattern:**
```typescript
try {
  const { messageId } = await safeParseJson<{ messageId: string }>(request);
  // ... handler logic
} catch (error) {
  if (error instanceof ChatSDKError) {
    return error.toResponse();
  }
  // ... other error handling
}
```

**Learnings:**
- Throwing `ChatSDKError` allows consistent error handling across routes
- Generic type parameter provides type-safe destructuring
