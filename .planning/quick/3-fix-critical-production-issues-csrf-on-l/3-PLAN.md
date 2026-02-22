---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(auth)/login/page.tsx
  - supabase/migrations/20260222000100_add_strategy_canvas_indexes.sql
  - lib/ai/knowledge-base.ts
autonomous: true

must_haves:
  truths:
    - "Login-to-checkout flow sends CSRF token with Stripe checkout request"
    - "StrategyCanvas queries by userId+deletedAt+updatedAt use a composite index"
    - "Knowledge base Supabase query is bounded to 100 rows max"
  artifacts:
    - path: "app/(auth)/login/page.tsx"
      provides: "CSRF-protected Stripe checkout fetch"
      contains: "X-CSRF-Token"
    - path: "supabase/migrations/20260222000100_add_strategy_canvas_indexes.sql"
      provides: "Composite index for StrategyCanvas listing queries"
      contains: "idx_strategy_canvas_userid_deletedat"
    - path: "lib/ai/knowledge-base.ts"
      provides: "Bounded knowledge base query"
      contains: ".limit(100)"
  key_links:
    - from: "app/(auth)/login/page.tsx"
      to: "/api/stripe/checkout"
      via: "fetch with CSRF header"
      pattern: "X-CSRF-Token.*csrfToken"
---

<objective>
Fix three production issues found during v1.4 audit review:
1. Missing CSRF token on login page's Stripe checkout fetch (security gap)
2. Missing composite index on StrategyCanvas for listing queries (performance)
3. Missing LIMIT on knowledge base Supabase query (unbounded result set)

Purpose: Close security and performance gaps before next deployment.
Output: Patched files + new migration ready for Supabase SQL Editor.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/(auth)/login/page.tsx
@app/(auth)/subscribe/page.tsx (reference pattern for CSRF)
@lib/ai/knowledge-base.ts
@lib/utils.ts (getCsrfToken, initCsrfToken exports)
@supabase/migrations/20260115000400_add_strategy_canvas.sql (existing indexes)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add CSRF token to login checkout fetch</name>
  <files>app/(auth)/login/page.tsx</files>
  <action>
    In `app/(auth)/login/page.tsx`:

    1. Add import at top: `import { getCsrfToken, initCsrfToken } from "@/lib/utils";`

    2. In the `useEffect` block where `state.status === "success"` and `plan` exists (lines 81-100), wrap the checkout fetch with CSRF initialization. Replace the current fetch block with:

    ```typescript
    if (plan) {
      setIsRedirecting(true);
      (async () => {
        try {
          await initCsrfToken();
          const csrfToken = getCsrfToken() || "";
          const res = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken,
            },
            body: JSON.stringify({ planId: plan }),
          });
          const data = await res.json();
          if (data.url) {
            window.location.href = data.url;
          } else {
            toast({ type: "error", description: "Failed to start checkout" });
            router.push(redirect || "/new");
          }
        } catch {
          toast({ type: "error", description: "Failed to start checkout" });
          router.push(redirect || "/new");
        }
      })();
    }
    ```

    This matches the exact pattern used in `subscribe/page.tsx` lines 432-455 where `initCsrfToken()` is called before the checkout fetch and the token is sent via `X-CSRF-Token` header.
  </action>
  <verify>Run `pnpm build` -- no TypeScript errors. Grep for "X-CSRF-Token" in login/page.tsx confirms the header is present.</verify>
  <done>Login page checkout fetch sends CSRF token header, matching the subscribe page pattern exactly.</done>
</task>

<task type="auto">
  <name>Task 2: Add StrategyCanvas composite index + knowledge base LIMIT</name>
  <files>
    supabase/migrations/20260222000100_add_strategy_canvas_indexes.sql
    lib/ai/knowledge-base.ts
  </files>
  <action>
    **Migration file** -- Create `supabase/migrations/20260222000100_add_strategy_canvas_indexes.sql`:

    ```sql
    -- Migration: Add optimized composite index for StrategyCanvas listing queries
    -- The existing idx_strategy_canvas_user covers (userId, deletedAt) but listing
    -- queries also ORDER BY updatedAt DESC. This index covers the full query pattern.

    CREATE INDEX IF NOT EXISTS idx_strategy_canvas_userid_deletedat_updatedat
      ON "StrategyCanvas"("userId", "deletedAt", "updatedAt" DESC);
    ```

    Note: Keep the existing `idx_strategy_canvas_user` index -- it still serves equality-only lookups. The new index covers the listing query pattern with ORDER BY.

    **Knowledge base query** -- In `lib/ai/knowledge-base.ts`, line 296, add `.limit(100)` after the `.order()` call:

    Change:
    ```typescript
    .order("created_at", { ascending: false });
    ```
    To:
    ```typescript
    .order("created_at", { ascending: false })
    .limit(100);
    ```

    This bounds the result set to prevent unbounded memory usage if the knowledge_base_content table grows large.
  </action>
  <verify>Run `pnpm build` -- no TypeScript errors. Verify migration file exists. Grep for `.limit(100)` in knowledge-base.ts confirms the bound is present.</verify>
  <done>Migration file ready for Supabase SQL Editor. Knowledge base query bounded to 100 rows.</done>
</task>

</tasks>

<verification>
1. `pnpm build` completes without errors
2. `grep -n "X-CSRF-Token" app/\(auth\)/login/page.tsx` shows CSRF header in checkout fetch
3. `grep -n ".limit(100)" lib/ai/knowledge-base.ts` shows bounded query
4. Migration file exists at `supabase/migrations/20260222000100_add_strategy_canvas_indexes.sql`
</verification>

<success_criteria>
- Login page checkout fetch includes CSRF token (security parity with subscribe page)
- StrategyCanvas has composite index covering listing query pattern (userId + deletedAt + updatedAt DESC)
- Knowledge base Supabase query limited to 100 rows (prevents unbounded result sets)
- Build passes with no new errors
</success_criteria>

<output>
After completion, create `.planning/quick/3-fix-critical-production-issues-csrf-on-l/3-SUMMARY.md`
</output>
