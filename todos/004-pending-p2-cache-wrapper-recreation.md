---
status: completed
priority: p2
issue_id: "004"
tags: [code-review, performance]
dependencies: []
completed_at: 2026-01-18
resolution: wont_fix
---

# Optimize Cache Wrapper to Avoid Recreation

## Problem Statement

The `_getCachedMessages` function wrapper is recreated on every call to `getMessagesByChatId`. This is inefficient and could cause unnecessary overhead.

## Findings

- Location: `lib/db/queries.ts` around the cache implementation
- Current pattern creates new `unstable_cache` wrapper each invocation
- Should be created once at module level

**Current (inefficient):**
```typescript
export async function getMessagesByChatId({ id }) {
  const cached = unstable_cache(
    async () => { /* query */ },
    [`messages-${id}`],
    { tags: [`messages-${id}`], revalidate: 10 }
  );
  return cached();
}
```

**Optimal:**
```typescript
const _getCachedMessages = unstable_cache(
  async (id: string) => { /* query */ },
  ["messages"],
  { tags: ["messages"], revalidate: 10 }
);

export async function getMessagesByChatId({ id }) {
  return _getCachedMessages(id);
}
```

## Proposed Solutions

### Option 1: Module-Level Cache Wrapper

**Approach:** Move cache wrapper creation to module level.

**Pros:**
- Single wrapper instance
- More efficient
- Proper cache key handling

**Cons:**
- Need to handle dynamic tags differently
- Minor refactor

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `lib/db/queries.ts` - cache wrapper location

## Acceptance Criteria

- [x] Cache wrapper analyzed
- [x] Dynamic cache keys still work correctly
- [ ] Performance improvement measurable (N/A - see resolution)

## Work Log

### 2026-01-18 - Initial Discovery

**By:** Claude Code (workflows:review - performance-oracle)

**Actions:**
- Identified cache wrapper recreation issue
- Drafted optimization approach

### 2026-01-18 - Analysis Complete (Won't Fix)

**By:** Claude Code

**Resolution:** Won't Fix - By Design

**Analysis:**
The current pattern creates a new `unstable_cache` wrapper per call, but this is intentional:

1. **Dynamic tags required**: `tags: [\`chat-${chatId}\`]` enables per-chat invalidation via `revalidateTag()`. Module-level wrappers can't have dynamic tags.

2. **Minimal overhead**: The wrapper creation is lightweight - just object allocation. Next.js caches actual data based on the key `chat-messages-${chatId}`.

3. **Proper invalidation**: When we call `revalidateTag(\`chat-${chatId}\`, { expire: 0 })` after `saveMessages`, only that chat's cache is invalidated.

**Trade-off:**
- Module-level wrapper = single instance, but static tags only (invalidates ALL messages)
- Function-level wrapper = new instance per call, but allows per-chat invalidation

**Alternative considered:**
Memoizing wrappers in a Map would avoid recreation but:
- Adds complexity
- Potential memory leak as chats accumulate
- Minimal benefit for minimal overhead

**Conclusion:** Current pattern is acceptable. The per-call overhead is negligible compared to database/network latency.
