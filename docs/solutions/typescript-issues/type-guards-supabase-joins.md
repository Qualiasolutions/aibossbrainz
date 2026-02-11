---
category: typescript-issues
tags: [type-safety, runtime-validation, supabase]
created: 2026-01-18
applies_to: lib/db/queries.ts
---

# Type Guards for Supabase JOIN Queries

## Problem

Supabase JOIN queries return nested objects that TypeScript cannot fully infer. Using `as` type assertions to cast these results bypasses compile-time checking and can cause runtime crashes if the data shape doesn't match expectations.

### Unsafe Pattern (Before)

```typescript
const { data } = await supabase
  .from("MessageReaction")
  .select(`
    id,
    messageId,
    message:Message_v2!messageId (
      id,
      chatId,
      parts,
      chat:Chat!chatId (
        id,
        title
      )
    )
  `);

// DANGEROUS: Assumes data shape without validation
data.map((r) => {
  const message = r.message as MessageRow | null;  // No runtime check
  const chat = message?.chat as ChatRow | null;    // Could crash
  return { message, chat };
});
```

**Why this fails:**
- Supabase TypeScript types don't fully support nested JOIN inference
- If database returns unexpected structure, runtime crash occurs
- TypeScript's `as` assertion silently accepts any shape

## Solution

Create type guard functions that validate data shape at runtime while providing TypeScript type narrowing.

### Step 1: Define Interfaces for JOIN Results

```typescript
// lib/db/queries.ts

interface JoinedChat {
  id: string;
  title: string;
  topic: string | null;
  topicColor: string | null;
  deletedAt: string | null;
}

interface JoinedMessage {
  id: string;
  chatId: string;
  parts: Json;
  role: string;
  botType: string | null;
  createdAt: string;
  deletedAt: string | null;
  chat: JoinedChat | null;
}
```

### Step 2: Create Type Guard Functions

```typescript
function isJoinedChat(obj: unknown): obj is JoinedChat {
  if (obj === null || typeof obj !== "object") return false;
  const chat = obj as Record<string, unknown>;
  return (
    typeof chat.id === "string" &&
    typeof chat.title === "string" &&
    (chat.topic === null || typeof chat.topic === "string") &&
    (chat.topicColor === null || typeof chat.topicColor === "string")
  );
}

function isJoinedMessage(obj: unknown): obj is JoinedMessage {
  if (obj === null || typeof obj !== "object") return false;
  const msg = obj as Record<string, unknown>;
  return (
    typeof msg.id === "string" &&
    typeof msg.chatId === "string" &&
    msg.parts !== undefined &&
    typeof msg.role === "string" &&
    (msg.botType === null || typeof msg.botType === "string") &&
    typeof msg.createdAt === "string" &&
    (msg.chat === null || isJoinedChat(msg.chat))
  );
}
```

### Step 3: Use Type Guards Instead of Assertions

```typescript
// Safe pattern - filter invalid data instead of crashing
return data
  .filter((r) => {
    // Validate message structure at runtime
    if (!isJoinedMessage(r.message)) return false;
    const msg = r.message;
    // Exclude soft-deleted records
    if (msg.deletedAt) return false;
    if (msg.chat?.deletedAt) return false;
    return true;
  })
  .map((r) => {
    // TypeScript knows r.message passes isJoinedMessage after filter
    const msg = isJoinedMessage(r.message) ? r.message : null;

    return {
      id: r.id,
      message: msg ? {
        id: msg.id,
        chatId: msg.chatId,
        parts: msg.parts,
      } : null,
      chat: msg?.chat ? {
        id: msg.chat.id,
        title: msg.chat.title,
      } : null,
    };
  });
```

## Prevention Strategies

1. **Never use `as` on external data** - Database results, API responses, and user input are external
2. **Type guards for JOIN queries** - Supabase JOINs always need runtime validation
3. **Filter instead of crash** - Invalid records should be excluded, not cause errors
4. **Validate nullable fields** - Check both `null` and type for optional fields

## When to Use Type Guards vs Zod

| Scenario | Use Type Guards | Use Zod |
|----------|-----------------|---------|
| Simple object validation | Yes | Overkill |
| Complex nested structures | Possible | Better |
| Form/API input validation | No | Yes |
| Validation with transforms | No | Yes |
| Error messages needed | Basic | Rich |
| Performance critical path | Yes | Slower |
| Already using Zod | Consider | Yes |

**Type Guards Best For:**
- Database JOIN results with known shapes
- Performance-critical code paths
- Simple boolean checks (is this a valid X?)
- Internal data transformations

**Zod Best For:**
- User input validation
- API request/response parsing
- Complex validation with transforms
- When detailed error messages matter

## Reference Implementation

See `lib/db/queries.ts:74-97` for the complete type guard implementation used in `getUserReactionsByType`.
