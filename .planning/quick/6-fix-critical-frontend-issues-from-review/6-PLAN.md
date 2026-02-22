---
phase: quick-6
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(admin)/admin/page.tsx
  - app/(chat)/error.tsx
  - app/(admin)/admin/conversations/[id]/page.tsx
  - app/(admin)/admin/users/[id]/page.tsx
  - components/chat.tsx
  - components/strategy-canvas/swot-board.tsx
  - app/(chat)/api/canvas/route.ts
  - app/embed/page.tsx
autonomous: true

must_haves:
  truths:
    - "Admin dashboard shows fallback UI on load failure instead of infinite redirect"
    - "Chat route group has error boundary that preserves sidebar layout"
    - "Admin detail pages verify admin auth at page level, not just layout"
    - "Streaming throttle is set to 50ms, not 5ms"
    - "sectionToCanvasType is a module-level constant, not recreated per render"
  artifacts:
    - path: "app/(chat)/error.tsx"
      provides: "Error boundary for chat route group"
    - path: "app/(admin)/admin/page.tsx"
      provides: "Fallback UI when dashboard data fails to load"
    - path: "app/(admin)/admin/conversations/[id]/page.tsx"
      provides: "Page-level admin auth check"
    - path: "app/(admin)/admin/users/[id]/page.tsx"
      provides: "Page-level admin auth call in component"
  key_links:
    - from: "app/(admin)/admin/page.tsx"
      to: "URL search params"
      via: "searchParams prop"
      pattern: "error.*dashboard_load_failed"
---

<objective>
Fix 9 frontend issues from comprehensive review: admin redirect loop, missing chat error boundary,
admin auth defense-in-depth, streaming throttle, module-level constants, DOMPurify dynamic import,
O(n^2) array allocation, UUID validation, and dead embed page removal.

Purpose: Eliminate critical bugs (infinite redirect, missing error boundary) and harden admin auth
Output: All 9 review findings resolved
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@app/(admin)/admin/page.tsx
@app/(chat)/layout.tsx
@app/(admin)/admin/layout.tsx
@app/(admin)/admin/conversations/[id]/page.tsx
@app/(admin)/admin/users/[id]/page.tsx
@components/chat.tsx
@components/strategy-canvas/swot-board.tsx
@app/(chat)/api/canvas/route.ts
@app/embed/page.tsx
@app/error.tsx
@app/(admin)/admin/error.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix critical admin redirect loop and add chat error boundary</name>
  <files>
    app/(admin)/admin/page.tsx
    app/(chat)/error.tsx
  </files>
  <action>
**1. Fix infinite redirect loop in admin dashboard** (`app/(admin)/admin/page.tsx`):

The page at line 112 does `redirect("/admin?error=dashboard_load_failed")` when all queries fail, but `/admin` is THIS page which re-runs the same queries, fails again, and redirects again -- infinite loop.

Fix: Replace the redirect with inline fallback UI. The page component receives `searchParams` as a prop (Next.js App Router server component). Instead of redirecting:

- Remove the `redirect("/admin?error=dashboard_load_failed")` call entirely
- Replace it with a return of fallback UI showing an error state:
  ```tsx
  if (!stats && activity.length === 0 && !subscriptionStats) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-neutral-500 mt-1">Welcome back.</p>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-medium text-neutral-700">Unable to load dashboard data</p>
          <p className="text-sm text-neutral-500">There may be a temporary database issue. Please try refreshing.</p>
          <a href="/admin" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
            Refresh Dashboard
          </a>
        </div>
      </div>
    );
  }
  ```
- Remove the `redirect` import from `next/navigation` (no longer used in this file)

**2. Create error boundary for (chat) route group** (`app/(chat)/error.tsx`):

Create a new error.tsx following the pattern from `app/(admin)/admin/error.tsx` but styled to work within the chat layout (sidebar is preserved by Next.js error boundaries at route group level).

```tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-dvh gap-4 p-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-neutral-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Your conversations are safe.
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
        >
          Try again
        </button>
        <a
          href="/new"
          className="px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:bg-accent"
        >
          New conversation
        </a>
      </div>
    </div>
  );
}
```

This error boundary sits inside the `(chat)` layout, so sidebar remains visible. User can navigate away via sidebar or use the provided buttons.
  </action>
  <verify>
    - `pnpm build` succeeds (no type errors, no import errors)
    - Verify `app/(admin)/admin/page.tsx` no longer contains `redirect`
    - Verify `app/(chat)/error.tsx` exists and exports default function
  </verify>
  <done>
    - Admin dashboard renders fallback UI when all data queries fail instead of infinite redirect
    - Chat route group has error boundary that preserves sidebar layout and reports to Sentry
  </done>
</task>

<task type="auto">
  <name>Task 2: Admin auth defense-in-depth + chat performance fixes</name>
  <files>
    app/(admin)/admin/conversations/[id]/page.tsx
    app/(admin)/admin/users/[id]/page.tsx
    components/chat.tsx
  </files>
  <action>
**1. Add page-level requireAdmin to conversations detail** (`app/(admin)/admin/conversations/[id]/page.tsx`):

The layout does auth, but defense-in-depth requires page-level checks too (especially since `getChatWithMessages` uses `createServiceClient()` which bypasses RLS).

- Add imports: `import { isUserAdmin } from "@/lib/admin/queries"` and `import { createClient } from "@/lib/supabase/server"`
- Add a `requireAdmin()` function at the top of the file, same pattern as `app/(admin)/admin/users/[id]/page.tsx`:
  ```ts
  async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const admin = await isUserAdmin(user.id);
    if (!admin) throw new Error("Forbidden");
    return user;
  }
  ```
- Add `await requireAdmin();` as the FIRST line of `ConversationDetailPage` (before `const { id } = await params`)

**2. Add page-level requireAdmin call to users detail** (`app/(admin)/admin/users/[id]/page.tsx`):

The file already HAS `requireAdmin()` defined (used in the `updateUserType` server action) but does NOT call it in `UserDetailsPage`. The page function at line 62 goes straight to `getUserById(id)` without checking auth.

- Add `await requireAdmin();` as the FIRST line of `UserDetailsPage` (before `const { id } = await params`)

**3. Fix chat.tsx performance issues** (`components/chat.tsx`):

Three fixes in this file:

a) **experimental_throttle** (line 225): Change from `5` to `50`. The value 5ms causes excessive re-renders during streaming. 50ms is the standard recommended value.

b) **sectionToCanvasType** (lines 163-188): Move the entire `sectionToCanvasType` object declaration OUTSIDE the `Chat` component to module level (place it right after the `ChatProps` interface, before the `Chat` function). It's a static lookup table that never changes -- recreating it on every render is wasteful.

c) **onData O(n^2) allocation** (line 260): Replace `[...(ds || []), dataPart]` with `(ds || []).concat(dataPart)`. While `concat` is still O(n), it avoids creating an intermediate spread iterator and is measurably faster for the streaming hot path. The line should become:
  ```ts
  setDataStream((ds) => (ds || []).concat(dataPart));
  ```
  </action>
  <verify>
    - `pnpm build` succeeds
    - Grep for `requireAdmin()` in conversations/[id]/page.tsx confirms it exists
    - Grep for `experimental_throttle: 50` in chat.tsx confirms the fix
    - Grep for `sectionToCanvasType` in chat.tsx confirms it's before the `Chat` function
    - Grep for `concat(dataPart)` in chat.tsx confirms the O(n^2) fix
  </verify>
  <done>
    - Both admin detail pages call requireAdmin() at page level for defense-in-depth
    - experimental_throttle is 50ms (not 5ms)
    - sectionToCanvasType is a module-level constant
    - onData uses concat instead of spread
  </done>
</task>

<task type="auto">
  <name>Task 3: DOMPurify dynamic import, canvas UUID validation, dead embed removal</name>
  <files>
    components/strategy-canvas/swot-board.tsx
    app/(chat)/api/canvas/route.ts
    app/embed/page.tsx
  </files>
  <action>
**1. DOMPurify dynamic import** (`components/strategy-canvas/swot-board.tsx`):

Top-level `import DOMPurify from "dompurify"` (line 3) loads the entire library even when not used. DOMPurify is only needed in one function.

- Remove the top-level `import DOMPurify from "dompurify";`
- Find where `DOMPurify.sanitize()` is called in the file
- Replace each usage with a lazy pattern. Add a module-level variable and lazy loader:
  ```ts
  let _DOMPurify: typeof import("dompurify").default | null = null;
  async function getDOMPurify() {
    if (!_DOMPurify) {
      const mod = await import("dompurify");
      _DOMPurify = mod.default;
    }
    return _DOMPurify;
  }
  ```
- If DOMPurify.sanitize() is called synchronously (not in an async context), use a different approach: keep the import but use `dynamic(() => import(...))` pattern, OR if the function using it can be made async, make it async and use `const DOMPurify = await getDOMPurify()`.
- NOTE: If making this async introduces complexity that risks breaking the component, keep the static import and add a comment `// PERF: static import kept because DOMPurify is used synchronously in render path`. Correctness over optimization.

**2. UUID validation for canvasId** (`app/(chat)/api/canvas/route.ts`):

At line 124, `canvasId` is used directly without format validation. Add UUID format validation after the null check:

```ts
const canvasId = searchParams.get("id");

if (!canvasId) {
  return new ChatSDKError("bad_request:api").toResponse();
}

// Validate UUID format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_REGEX.test(canvasId)) {
  return new ChatSDKError("bad_request:api").toResponse();
}
```

Place the `UUID_REGEX` as a module-level constant at the top of the file (outside the handler) to avoid recreating it on each request.

**3. Remove dead embed page** (`app/embed/page.tsx`):

The embed page references `/api/auth/session` and `/api/auth/guest` which are NextAuth endpoints that NO LONGER EXIST in this Supabase Auth codebase. The page is completely non-functional.

- Grep confirms no references to `/embed` in the codebase
- Delete the file `app/embed/page.tsx`
- If the directory `app/embed/` has no other files, remove the directory too
  </action>
  <verify>
    - `pnpm build` succeeds
    - Verify `app/embed/page.tsx` no longer exists
    - Grep for `UUID_REGEX` in canvas/route.ts confirms validation added
    - Verify DOMPurify is either dynamically imported or has a justification comment
  </verify>
  <done>
    - DOMPurify is lazily loaded (or justified if kept static)
    - Canvas DELETE validates UUID format before database query
    - Dead embed page removed from codebase
  </done>
</task>

</tasks>

<verification>
All 9 review findings addressed:
1. CRITICAL: Admin redirect loop -> fallback UI
2. CRITICAL: Chat error boundary -> app/(chat)/error.tsx
3. HIGH: Admin detail auth -> requireAdmin() calls added
4. HIGH: Throttle -> 50ms
5. MEDIUM: sectionToCanvasType -> module level
6. MEDIUM: DOMPurify -> dynamic import
7. MEDIUM: O(n^2) onData -> concat
8. MEDIUM: canvasId validation -> UUID regex
9. LOW: Dead embed -> removed

`pnpm build` passes with zero errors.
</verification>

<success_criteria>
- Build succeeds with no type errors
- Admin dashboard never redirect-loops (renders fallback on failure)
- Chat errors caught by error boundary, sidebar preserved
- All admin detail pages have page-level auth
- No performance regressions in chat streaming
</success_criteria>

<output>
After completion, create `.planning/quick/6-fix-critical-frontend-issues-from-review/6-SUMMARY.md`
</output>
