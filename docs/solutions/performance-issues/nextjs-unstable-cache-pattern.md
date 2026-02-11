---
title: "Next.js unstable_cache with Fallback Pattern"
category: performance-issues
tags: [nextjs, cache, performance, database, resilience]
date_solved: 2026-01-18
severity: medium
component: lib/db/queries.ts
related_issues: []
---

# Next.js unstable_cache with Fallback Pattern

## Problem Symptom

Message fetching was slow due to disabled caching. The cache was previously disabled because of reliability concerns.

**Observable behavior:**
- Every message fetch hit the database directly
- Production audit flagged as P1 - "Message cache bypassed"
- Higher latency and database load than necessary

## Investigation Steps

1. Found `getMessagesByChatId` in `lib/db/queries.ts` was calling database directly
2. Discovered `unstable_cache` wrapper existed but wasn't being used
3. Identified need for fallback if cache fails
4. Implemented cache with graceful degradation

## Root Cause

Cache was bypassed entirely, likely disabled during debugging and never re-enabled:

```typescript
// Cache existed but wasn't used
const _getCachedMessages = unstable_cache(...);

// Direct database call instead
export async function getMessagesByChatId({ id }) {
  const { data } = await supabase.from("Message_v2").select("*")...
}
```

## Working Solution

Use cache with try-catch fallback to database:

```typescript
import { unstable_cache } from "next/cache";

// Define the cached function
const _getCachedMessages = unstable_cache(
  async (chatId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("Message_v2")
      .select("*")
      .eq("chatId", chatId)
      .is("deletedAt", null)
      .order("createdAt", { ascending: true });

    if (error) throw error;
    return data || [];
  },
  ["messages"],
  {
    tags: ["messages"], // For cache invalidation
    revalidate: 10,     // Seconds until stale
  }
);

// Main function with fallback
export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    // Use cached version for performance
    return await _getCachedMessages(id);
  } catch (error) {
    // Fallback to direct query if cache fails
    console.error("getMessagesByChatId cache error, falling back:", error);
    try {
      const supabase = await createClient();
      const { data, error: dbError } = await supabase
        .from("Message_v2")
        .select("*")
        .eq("chatId", id)
        .is("deletedAt", null)
        .order("createdAt", { ascending: true });
      if (dbError) throw dbError;
      return data || [];
    } catch (fallbackError) {
      console.error("getMessagesByChatId fallback error:", fallbackError);
      throw new ChatSDKError("bad_request:database", "Failed to get messages");
    }
  }
}
```

**Key pattern elements:**
1. Cache wrapper at module level
2. Try-catch around cached call
3. Fallback to direct database query
4. Proper error logging at each level
5. Final error throw if both fail

## Cache Invalidation (Important Follow-up)

When messages are saved, invalidate the cache:

```typescript
import { revalidateTag } from "next/cache";

export async function saveMessages({ messages }) {
  // ... save to database

  // Invalidate cache for affected chats
  const chatIds = [...new Set(messages.map(m => m.chatId))];
  for (const chatId of chatIds) {
    revalidateTag(`messages-${chatId}`);
  }
}
```

See `todos/002-pending-p1-cache-invalidation.md` for this follow-up work.

## Prevention Strategies

1. **Always pair cache with invalidation** - Plan invalidation when adding cache
2. **Use fallback patterns** - Cache failures shouldn't break functionality
3. **Log cache failures** - Monitor for degraded performance
4. **Tag-based invalidation** - Use specific tags for granular cache control

## Test Cases

```typescript
it("returns messages from cache on subsequent calls", async () => {
  const first = await getMessagesByChatId({ id: chatId });
  const second = await getMessagesByChatId({ id: chatId });
  // Both return same data
  expect(first).toEqual(second);
});

it("falls back to database if cache fails", async () => {
  // Simulate cache failure
  jest.spyOn(console, 'error').mockImplementation(() => {});
  // Force cache error...
  const result = await getMessagesByChatId({ id: chatId });
  expect(result).toBeDefined();
  expect(console.error).toHaveBeenCalled();
});
```

## Cross-References

- **Next.js Caching Docs:** https://nextjs.org/docs/app/building-your-application/caching
- **revalidateTag:** https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- **Production Audit:** `plans/fix-production-audit-high-priority.md`
- **Todo:** `todos/002-pending-p1-cache-invalidation.md`

## Learnings

1. `unstable_cache` is stable enough for production use
2. Always implement fallback for cache failures
3. Cache invalidation is as important as caching itself
4. Use tags for granular invalidation (`messages-${chatId}`)
5. Log cache failures to monitor degraded performance
6. Consider cache wrapper recreation issue (see `todos/004-pending-p2-cache-wrapper-recreation.md`)
