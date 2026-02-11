# fix: Production Audit High-Priority Issues

**Type:** Bug Fix / Performance
**Priority:** High
**Estimated Complexity:** Low-Medium
**Date:** 2026-01-18

---

## Overview

Fix 4 high-priority issues identified in the production readiness audit:
1. Re-enable message cache (bypassed for debugging)
2. Add useEffect cleanup to prevent memory leaks
3. Add CSRF validation to state-changing API routes
4. Fix N+1 query in `getUserReactionsByType`

---

## Problem Statement

The production audit identified these issues that could impact:
- **Performance**: Bypassed cache causes unnecessary DB queries
- **Reliability**: Memory leaks in long chat sessions
- **Security**: CSRF tokens generated but not validated
- **Scalability**: N+1 query pattern will bottleneck at scale

---

## Acceptance Criteria

- [ ] Message cache re-enabled in `lib/db/queries.ts:558`
- [ ] All useEffect hooks in `components/chat.tsx` have cleanup functions
- [ ] CSRF validation added to `/api/delete-account`, `/api/profile`, `/api/vote`, `/api/reactions`
- [ ] `getUserReactionsByType` uses single JOIN query instead of 3 sequential queries
- [ ] All tests pass
- [ ] No TypeScript errors

---

## Implementation Plan

### Task 1: Re-enable Message Cache

**File:** `lib/db/queries.ts:556-579`

**Current (bypassed):**
```typescript
export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    // Temporarily bypass cache to debug the issue
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("Message_v2")
      // ...
```

**Target:**
```typescript
export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await _getCachedMessages(id);
  } catch (error) {
    // Fallback to direct query if cache fails
    const supabase = await createClient();
    // ...
```

---

### Task 2: Add useEffect Cleanup to chat.tsx

**File:** `components/chat.tsx`

**Effects needing cleanup (lines 113, 130, 134, 220, 238):**

```typescript
// Example pattern to apply:
useEffect(() => {
  // ... existing logic

  return () => {
    // Cleanup: reset refs, cancel subscriptions
  };
}, [deps]);
```

**Specific cleanups needed:**
- Line 113: `setArtifact` effect - add cleanup to reset artifact state
- Line 130-136: Ref sync effects - no cleanup needed (just ref assignments)
- Line 220-231: Message sync - add `isMounted` flag pattern
- Line 238+: Any event listeners - use AbortController

---

### Task 3: Add CSRF Validation to API Routes

**Files to modify:**
- `app/(chat)/api/delete-account/route.ts` - POST (CRITICAL)
- `app/(chat)/api/profile/route.ts` - POST
- `app/(chat)/api/vote/route.ts` - PATCH
- `app/(chat)/api/reactions/route.ts` - POST, DELETE

**Pattern to add at start of each handler:**
```typescript
import { validateCsrfRequest } from "@/lib/security/csrf";

export async function POST(request: Request) {
  // CSRF validation
  const csrf = await validateCsrfRequest(request);
  if (!csrf.valid) {
    return new Response(JSON.stringify({ error: csrf.error }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  // ... existing logic
}
```

---

### Task 4: Fix N+1 Query in getUserReactionsByType

**File:** `lib/db/queries.ts:1311-1393`

**Current (3 sequential queries):**
```typescript
// Query 1: Get reactions
const { data: reactions } = await supabase
  .from("MessageReaction")
  .select("*")
  .eq("userId", userId);

// Query 2: Get messages (N+1 risk)
const { data: messages } = await supabase
  .from("Message_v2")
  .select("...")
  .in("id", messageIds);

// Query 3: Get chats (N+1 risk)
const { data: chats } = await supabase
  .from("Chat")
  .select("...")
  .in("id", chatIds);
```

**Target (single JOIN query):**
```typescript
const { data, error } = await supabase
  .from("MessageReaction")
  .select(`
    *,
    message:Message_v2!messageId (
      id,
      chatId,
      parts,
      role,
      botType,
      createdAt,
      chat:Chat!chatId (
        id,
        title,
        topic,
        topicColor
      )
    )
  `)
  .eq("userId", userId)
  .eq("reactionType", reactionType)
  .is("message.deletedAt", null)
  .is("message.chat.deletedAt", null);
```

---

## Test Plan

1. **Cache Test**: Verify messages load from cache (check network tab, should see cached response)
2. **Memory Test**: Open chat, send messages, navigate away - verify no console warnings about memory leaks
3. **CSRF Test**:
   - Try POST to `/api/delete-account` without CSRF header → should get 403
   - Try with valid CSRF header → should succeed
4. **N+1 Test**: Load reactions page, verify only 1 query in Supabase logs instead of 3

---

## Rollback Plan

Each fix is independent and can be reverted individually:
1. Cache: Re-add bypass comment
2. Cleanup: Remove cleanup functions (won't break functionality)
3. CSRF: Remove validation calls (reduces security but won't break)
4. N+1: Revert to sequential queries

---

## References

- Production Audit Report: 2026-01-17
- CSRF Module: `lib/security/csrf.ts`
- Cache Implementation: `lib/db/queries.ts:530-554`
- React Cleanup Docs: https://react.dev/reference/react/useEffect#my-cleanup-logic-runs-even-though-my-component-didnt-unmount
- Supabase Joins: https://supabase.com/docs/guides/database/joins-and-nesting
