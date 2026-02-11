---
title: "Cache Invalidation After Mutations with revalidateTag"
category: performance-issues
tags: [nextjs, cache, revalidateTag, mutations, stale-data]
date_solved: 2026-01-18
severity: high
component: lib/db/queries.ts
related_issues: [nextjs-unstable-cache-pattern]
---

# Cache Invalidation After Mutations with revalidateTag

## Problem Symptom

After saving messages to the database, the cache remained stale for up to 10 seconds. Users wouldn't see their new messages immediately after sending them.

**Observable behavior:**
- User sends a message, it saves to database
- Immediate refetch returns old message list (missing the new message)
- Message only appears after cache TTL expires (10 seconds)
- Creates poor UX and confusion

## Investigation Steps

1. Found `unstable_cache` was configured with proper tags (`chat-${chatId}`)
2. Discovered no `revalidateTag` calls anywhere in the codebase
3. Confirmed `saveMessages` completed successfully but cache was never invalidated
4. Identified the missing invalidation step after mutations

## Root Cause

The cache was configured correctly but never invalidated after mutations:

```typescript
// Cache was set up with tags
const _getCachedMessages = unstable_cache(
  async (chatId: string) => { /* ... */ },
  ["messages"],
  {
    tags: [`chat-${chatId}`],  // Tag existed
    revalidate: 10,
  }
);

// But saveMessages never invalidated the cache
export async function saveMessages({ messages }) {
  // Save to database...
  // NO revalidateTag call - cache remains stale!
}
```

## Working Solution

Add `revalidateTag` calls after `saveMessages` completes:

```typescript
import { revalidateTag } from "next/cache";

export async function saveMessages({
  messages,
}: {
  messages: Array<MessageInsert>;
}) {
  const supabase = await createClient();

  // Save messages to database
  const { data, error } = await supabase
    .from("Message_v2")
    .insert(messages)
    .select();

  if (error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }

  // Invalidate cache for all affected chats
  const chatIds = [...new Set(messages.map((m) => m.chatId))];
  for (const chatId of chatIds) {
    revalidateTag(`chat-${chatId}`, { expire: 0 });
  }

  return data;
}
```

**Key pattern elements:**

1. Import `revalidateTag` from `next/cache`
2. Collect unique chat IDs from the mutated messages
3. Invalidate each affected chat's cache tag
4. Use the same tag pattern as the cache definition (`chat-${chatId}`)
5. Pass `{ expire: 0 }` for immediate invalidation (Next.js 15.6+ requirement)

## Next.js 15.6 Canary API Note

In Next.js 15.6 canary versions, `revalidateTag` requires two arguments:

```typescript
// Next.js 15.6 canary - TWO arguments required
revalidateTag(`chat-${chatId}`, { expire: 0 });

// Earlier versions - single argument
revalidateTag(`chat-${chatId}`);
```

The second argument `{ expire: 0 }` ensures immediate cache expiration. Without it, the canary version may not work as expected.

Check your `package.json` for your Next.js version:
```json
"next": "15.6.0-canary.8"  // Requires 2-arg API
```

## Prevention Strategies

1. **Always pair cache with invalidation** - When adding `unstable_cache`, immediately plan where `revalidateTag` will be called

2. **Mutation checklist:**
   - [ ] Does this function modify cached data?
   - [ ] What cache tags need invalidation?
   - [ ] Is the tag pattern consistent with cache definition?

3. **Use consistent tag naming:**
   ```typescript
   // Cache definition
   tags: [`chat-${chatId}`]

   // Invalidation (must match exactly)
   revalidateTag(`chat-${chatId}`, { expire: 0 })
   ```

4. **Group related mutations** - If multiple functions modify the same data, centralize invalidation:
   ```typescript
   function invalidateChatCache(chatId: string) {
     revalidateTag(`chat-${chatId}`, { expire: 0 });
   }
   ```

5. **Add comments at cache definition:**
   ```typescript
   const _getCachedMessages = unstable_cache(
     async (chatId: string) => { /* ... */ },
     ["messages"],
     {
       tags: [`chat-${chatId}`],
       revalidate: 10,
       // INVALIDATION: Call revalidateTag(`chat-${chatId}`) after saveMessages
     }
   );
   ```

## Test Cases

```typescript
it("invalidates cache after saving messages", async () => {
  // Setup: Fetch messages to populate cache
  const initialMessages = await getMessagesByChatId({ id: chatId });
  expect(initialMessages).toHaveLength(1);

  // Action: Save new message
  await saveMessages({
    messages: [{ chatId, role: "user", content: "New message" }],
  });

  // Verify: Immediate refetch includes new message
  const updatedMessages = await getMessagesByChatId({ id: chatId });
  expect(updatedMessages).toHaveLength(2);
  expect(updatedMessages[1].content).toBe("New message");
});

it("only invalidates affected chat caches", async () => {
  // Save message to chat A
  await saveMessages({
    messages: [{ chatId: chatA, role: "user", content: "Message A" }],
  });

  // Chat B cache should remain intact (not invalidated)
  // This is a performance consideration - don't over-invalidate
});
```

## Cross-References

- **Related Solution:** `docs/solutions/performance-issues/nextjs-unstable-cache-pattern.md`
- **Next.js revalidateTag Docs:** https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- **Next.js Caching:** https://nextjs.org/docs/app/building-your-application/caching
- **Source File:** `lib/db/queries.ts`

## Learnings

1. **Cache without invalidation is a bug waiting to happen** - Always implement both together
2. **Tag patterns must match exactly** - `chat-${chatId}` in cache must match `chat-${chatId}` in revalidate
3. **Check framework version** - API signatures change in canary/beta versions
4. **Immediate invalidation matters for UX** - Users expect to see their changes instantly
5. **Deduplicate before invalidating** - Use `Set` to avoid redundant invalidation calls
6. **Test the full cycle** - Write tests that verify cache -> mutation -> invalidation -> fresh fetch
