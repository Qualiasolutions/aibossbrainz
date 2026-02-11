---
status: completed
priority: p1
issue_id: "003"
tags: [code-review, typescript, type-safety]
dependencies: []
completed_at: 2026-01-18
---

# Fix Unsafe Type Assertions in getUserReactionsByType

## Problem Statement

The `getUserReactionsByType` function uses multiple `as` type assertions when transforming JOIN query results. This bypasses TypeScript's type checking and could cause runtime errors if the data shape doesn't match expectations.

**Risk:** Runtime crashes if Supabase returns unexpected data structure

## Findings

- Location: `lib/db/queries.ts:1400-1439`
- Unsafe assertions found:
  ```typescript
  const message = reaction.message as MessageRow | null;
  const chat = message?.chat as ChatRow | null;
  ```

- No runtime validation of JOIN results
- Supabase JOIN syntax returns nested objects that TypeScript can't infer

**Current code pattern:**
```typescript
// Dangerous - assumes data shape without validation
const message = reaction.message as MessageRow | null;
```

## Proposed Solutions

### Option 1: Add Runtime Type Guards

**Approach:** Create type guard functions to validate data at runtime.

```typescript
function isMessageRow(obj: unknown): obj is MessageRow {
  return obj !== null &&
         typeof obj === 'object' &&
         'id' in obj &&
         'chatId' in obj;
}

// Usage
const message = isMessageRow(reaction.message) ? reaction.message : null;
```

**Pros:**
- Runtime safety
- TypeScript narrows types correctly
- Clear error handling

**Cons:**
- More verbose code
- Performance overhead (minimal)

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Use Zod for Runtime Validation

**Approach:** Define Zod schemas for JOIN results and parse at runtime.

```typescript
const JoinResultSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  message: z.object({
    id: z.string(),
    chatId: z.string(),
    // ...
  }).nullable(),
});

const parsed = JoinResultSchema.safeParse(reaction);
```

**Pros:**
- Comprehensive validation
- Already using Zod in project
- Better error messages

**Cons:**
- Schema maintenance overhead
- Slightly more complex

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 3: Separate Queries Instead of JOIN

**Approach:** Revert to separate queries with proper typing.

**Pros:**
- Simpler TypeScript types
- No type assertions needed

**Cons:**
- Brings back N+1 issue (defeats purpose)
- More database calls

**Effort:** 30 minutes

**Risk:** High (reintroduces performance issue)

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `lib/db/queries.ts:1400-1439` - getUserReactionsByType

**Related components:**
- Reactions API route
- Any component displaying reaction lists with message context

## Resources

- **Zod docs:** https://zod.dev
- **TypeScript type guards:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html

## Acceptance Criteria

- [x] No `as` type assertions on external data
- [x] Runtime validation of JOIN results
- [x] Graceful handling of malformed data
- [x] TypeScript strict mode passes
- [ ] Tests cover edge cases

## Work Log

### 2026-01-18 - Initial Discovery

**By:** Claude Code (workflows:review - kieran-typescript-reviewer)

**Actions:**
- Identified unsafe type assertions
- Reviewed Supabase JOIN return types
- Drafted validation approaches

**Learnings:**
- Supabase TypeScript types don't fully support JOIN inference
- Runtime validation essential for external data

### 2026-01-18 - Implementation Complete

**By:** Claude Code

**Solution:** Option 1 - Runtime Type Guards

**Actions:**
- Created `JoinedChat` and `JoinedMessage` interfaces for JOIN result shapes
- Created `isJoinedChat()` and `isJoinedMessage()` type guard functions
- Replaced `as` assertions with type guard validation in `getUserReactionsByType`
- Invalid data now filtered out instead of potentially causing runtime errors

**Code Added:**
```typescript
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

**Learnings:**
- Type guards provide runtime safety while maintaining TypeScript type narrowing
- Filtering invalid data is safer than assertions that could cause runtime crashes
