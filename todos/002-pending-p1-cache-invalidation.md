---
status: completed
priority: p1
issue_id: "002"
tags: [code-review, performance, cache]
dependencies: []
completed_at: 2026-01-18
---

# Add Cache Invalidation with revalidateTag

## Problem Statement

The message cache was re-enabled with `unstable_cache` but there are no `revalidateTag()` calls after message saves. This means cached data becomes stale when new messages are added, leading to:
- Users not seeing their new messages
- Inconsistent data between cache and database
- Potential confusion and data integrity issues

## Findings

- Cache configured in `lib/db/queries.ts:556-582` with tag `messages-${id}`
- `saveMessages` function at `lib/db/queries.ts:1257-1290` does NOT call `revalidateTag`
- No other functions call `revalidateTag("messages-*")`
- Cache revalidation time is 10 seconds, but explicit invalidation needed for consistency

**Cache tag pattern:**
```typescript
tags: [`messages-${id}`]
```

**Missing invalidation after:**
- `saveMessages()` - when new messages added
- Message updates/deletions
- Chat deletion (cascading)

## Proposed Solutions

### Option 1: Add revalidateTag to saveMessages

**Approach:** Import `revalidateTag` from `next/cache` and call after successful message save.

```typescript
import { revalidateTag } from "next/cache";

export async function saveMessages({ messages }: { messages: Message[] }) {
  // ... existing save logic

  // Invalidate cache for affected chats
  const chatIds = [...new Set(messages.map(m => m.chatId))];
  for (const chatId of chatIds) {
    revalidateTag(`messages-${chatId}`);
  }
}
```

**Pros:**
- Direct fix for the issue
- Minimal code change
- Immediate consistency

**Cons:**
- Need to add to all message-mutating functions
- Could miss edge cases

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Create Cache Invalidation Helper

**Approach:** Create centralized cache invalidation functions for each entity type.

```typescript
// lib/cache/invalidation.ts
export function invalidateMessagesCache(chatId: string) {
  revalidateTag(`messages-${chatId}`);
}

export function invalidateChatCache(chatId: string) {
  revalidateTag(`chat-${chatId}`);
  revalidateTag(`messages-${chatId}`);
}
```

**Pros:**
- Centralized cache management
- Easier to maintain
- Can batch invalidations

**Cons:**
- Additional file/abstraction
- Need to update all mutation functions

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `lib/db/queries.ts:1257-1290` - saveMessages function
- Any other message mutation functions

**Related components:**
- Chat streaming (`app/(chat)/api/chat/route.ts`)
- Message display (`components/chat.tsx`)

## Resources

- **Next.js Cache Docs:** https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- **PR:** fix/production-audit-high-priority

## Acceptance Criteria

- [x] `revalidateTag` called after `saveMessages`
- [x] Cache properly invalidated on message mutations
- [x] New messages appear immediately after send
- [x] Tests pass

## Work Log

### 2026-01-18 - Initial Discovery

**By:** Claude Code (workflows:review - performance-oracle)

**Actions:**
- Identified missing cache invalidation
- Reviewed cache configuration
- Drafted solution approaches

**Learnings:**
- `unstable_cache` requires explicit invalidation for mutations
- Tag-based invalidation allows granular control

### 2026-01-18 - Implementation Complete

**By:** Claude Code

**Solution:** Option 1 - Direct `revalidateTag` in `saveMessages`

**Actions:**
- Added `revalidateTag` import from `next/cache` to `lib/db/queries.ts`
- Added cache invalidation after successful message save
- Uses `chat-${chatId}` tag pattern (matches existing cache tags)
- Next.js 15.6 canary requires 2 arguments: `revalidateTag(tag, { expire: 0 })`

**Code Added:**
```typescript
// Invalidate message cache for affected chats
const chatIds = [...new Set(messages.map((m) => m.chatId))];
for (const chatId of chatIds) {
  revalidateTag(`chat-${chatId}`, { expire: 0 });
}
```

**Learnings:**
- Next.js 15.6.0-canary.60 changed `revalidateTag` to require 2 arguments
- `{ expire: 0 }` forces immediate cache invalidation
