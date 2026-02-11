---
title: "N+1 Query Fix with Supabase Foreign Key JOINs"
category: performance-issues
tags: [supabase, n-plus-one, database, join, typescript]
date_solved: 2026-01-18
severity: high
component: lib/db/queries.ts
related_issues: []
---

# N+1 Query Fix with Supabase Foreign Key JOINs

## Problem Symptom

The `getUserReactionsByType` function was making N+1 database queries - one to get reactions, then individual queries for each message and chat. With 50 reactions, this meant 100+ database round trips.

**Observable behavior:**
- Slow response times on reactions page
- High database connection usage
- Detected in production audit as P1 performance issue

## Investigation Steps

1. Reviewed `getUserReactionsByType` in `lib/db/queries.ts`
2. Found pattern of fetching reactions, then looping to get messages
3. Identified Supabase supports foreign key JOINs via `select()` syntax
4. Tested JOIN query returns nested objects

## Root Cause

The original code used sequential queries:

```typescript
// ANTI-PATTERN: N+1 queries
const reactions = await supabase.from("MessageReaction").select("*");
for (const reaction of reactions) {
  const message = await supabase.from("Message_v2").select("*").eq("id", reaction.messageId);
  const chat = await supabase.from("Chat").select("*").eq("id", message.chatId);
}
```

## Working Solution

Use Supabase's foreign key JOIN syntax to fetch all data in a single query:

```typescript
const { data, error } = await supabase
  .from("MessageReaction")
  .select(`
    id, messageId, reactionType, createdAt,
    message:Message_v2!messageId (
      id, chatId, parts, role, botType, createdAt, deletedAt,
      chat:Chat!chatId (id, title, topic, topicColor, deletedAt)
    )
  `)
  .eq("userId", userId)
  .eq("reactionType", reactionType)
  .order("createdAt", { ascending: false });
```

**Key syntax:**
- `tableName!foreignKey (columns)` - specifies the relationship
- Nested objects allow multi-level JOINs
- Returns data as nested TypeScript objects

**Transform the nested result:**

```typescript
return (data || [])
  .filter((r) => r.message !== null)
  .map((reaction) => {
    const message = reaction.message;
    const chat = message?.chat;
    return {
      id: reaction.id,
      messageId: reaction.messageId,
      message: message ? {
        id: message.id,
        chatId: message.chatId,
        // ... other fields
      } : null,
      chat: chat ? {
        id: chat.id,
        title: chat.title,
        // ... other fields
      } : null,
    };
  });
```

## Prevention Strategies

1. **Always check for N+1 patterns** when fetching related data
2. **Use Supabase JOIN syntax** for parent/child relationships
3. **Add to production audit checklist** - check for loops with database calls
4. **Consider caching** for frequently accessed relationships

## Test Cases

```typescript
// Test: Single query execution
// Verify only 1 database call is made regardless of reaction count
it("fetches reactions with related data in single query", async () => {
  const result = await getUserReactionsByType({ userId, reactionType: "helpful" });
  expect(result).toHaveLength(50);
  // Verify nested data is populated
  expect(result[0].message).toBeDefined();
  expect(result[0].chat).toBeDefined();
});
```

## Cross-References

- **Supabase Docs:** https://supabase.com/docs/guides/database/joins-and-nested-tables
- **Production Audit:** `plans/fix-production-audit-high-priority.md`
- **Todo:** `todos/003-pending-p1-unsafe-type-assertions.md` (related type safety issue)

## Learnings

1. Supabase foreign key JOINs use `!foreignKeyName` syntax
2. TypeScript types don't auto-infer JOIN results - need runtime validation
3. Single complex query >> many simple queries for related data
4. Always filter `deletedAt` in JOIN conditions for soft-delete tables
