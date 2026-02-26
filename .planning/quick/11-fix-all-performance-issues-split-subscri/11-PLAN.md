---
phase: quick-11
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(auth)/subscribe/page.tsx
  - app/(auth)/subscribe/components/payment-success.tsx
  - app/(auth)/subscribe/components/welcome-step.tsx
  - app/(chat)/account/page.tsx
  - app/(chat)/account/components/profile-section.tsx
  - app/(chat)/account/components/business-profile-section.tsx
  - app/(chat)/account/components/data-privacy-section.tsx
  - app/(chat)/new/page.tsx
  - app/(chat)/chat/[id]/page.tsx
  - app/(chat)/layout.tsx
autonomous: true

must_haves:
  truths:
    - "/subscribe page loads faster by code-splitting PaymentSuccess and WelcomeStep into separate chunks"
    - "/account page loads faster by splitting sections into lazy-loaded components"
    - "/new and /chat/[id] pages have zero duplicate render paths"
    - "All Image components in subscribe use next/image optimization (no unoptimized flag)"
    - "Subscription polling interval is 4s instead of 2s to reduce network pressure"
    - "AppSidebar is lazy-loaded in layout with a Suspense boundary"
    - "Application builds successfully with no regressions"
  artifacts:
    - path: "app/(auth)/subscribe/components/payment-success.tsx"
      provides: "Lazy-loadable PaymentSuccess component"
    - path: "app/(auth)/subscribe/components/welcome-step.tsx"
      provides: "Lazy-loadable WelcomeStep component"
    - path: "app/(chat)/account/components/profile-section.tsx"
      provides: "Lazy-loadable Profile section"
    - path: "app/(chat)/account/components/business-profile-section.tsx"
      provides: "Lazy-loadable Business Profile section"
    - path: "app/(chat)/account/components/data-privacy-section.tsx"
      provides: "Lazy-loadable Data & Privacy section"
  key_links:
    - from: "app/(auth)/subscribe/page.tsx"
      to: "subscribe/components/*.tsx"
      via: "next/dynamic imports"
      pattern: "dynamic\\(.*import"
    - from: "app/(chat)/account/page.tsx"
      to: "account/components/*.tsx"
      via: "next/dynamic imports"
      pattern: "dynamic\\(.*import"
    - from: "app/(chat)/layout.tsx"
      to: "components/app-sidebar.tsx"
      via: "next/dynamic import"
      pattern: "dynamic\\(.*import.*app-sidebar"
---

<objective>
Fix all performance issues from Vercel Speed Insights review: split monolith pages into lazy-loaded chunks, consolidate duplicate render paths, remove unoptimized image flags, slow polling intervals, and lazy-load AppSidebar.

Purpose: Reduce initial JS bundle size for /subscribe (903 lines), /account (603 lines), and layout. Eliminate unnecessary duplicate render branches in chat pages. Improve LCP and TTI metrics.
Output: Smaller, code-split page components with dynamic imports.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/(auth)/subscribe/page.tsx
@app/(chat)/account/page.tsx
@app/(chat)/new/page.tsx
@app/(chat)/chat/[id]/page.tsx
@app/(chat)/layout.tsx
@components/app-sidebar.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Split /subscribe and /account monoliths into lazy-loaded components</name>
  <files>
    app/(auth)/subscribe/page.tsx
    app/(auth)/subscribe/components/payment-success.tsx
    app/(auth)/subscribe/components/welcome-step.tsx
    app/(chat)/account/page.tsx
    app/(chat)/account/components/profile-section.tsx
    app/(chat)/account/components/business-profile-section.tsx
    app/(chat)/account/components/data-privacy-section.tsx
  </files>
  <action>
**Subscribe page (app/(auth)/subscribe/page.tsx):**

1. Extract `PaymentSuccess` component (lines 82-200) into `app/(auth)/subscribe/components/payment-success.tsx`. Export it as default. It needs props: `{ redirectPath: string }`. Move the `ALECCI_LOGO_URL` constant into a shared location or duplicate it (it's just a string constant).

2. Extract `WelcomeStep` component (lines 208-319) into `app/(auth)/subscribe/components/welcome-step.tsx`. Export it as default. It needs props: `{ onContinue: () => void }`. Also move the `valueProps` array (lines 202-206) with it since it's only used there.

3. In subscribe/page.tsx, use `next/dynamic` to lazy-load both:
```tsx
import dynamic from "next/dynamic";
const PaymentSuccess = dynamic(() => import("./components/payment-success"), {
  loading: () => <div className="flex min-h-screen items-center justify-center bg-stone-50"><div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" /></div>,
});
const WelcomeStep = dynamic(() => import("./components/welcome-step"), {
  loading: () => <div className="flex min-h-screen items-center justify-center bg-stone-50"><div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" /></div>,
});
```

4. Remove ALL `unoptimized` props from every `<Image>` in subscribe page and its extracted components (3 occurrences at lines 126, 230, 683). The logo is a .webp file served from /public — next/image can optimize it fine.

5. Slow the subscription polling interval from 2000ms to 4000ms. In `SubscribeContent`, change the `setInterval` on line 412 from `2000` to `4000`. Also update `maxPolls` from 30 to 15 (keeps the same 60s total timeout: 15 * 4s = 60s). Also in `handleRetryCheck` (line 569-591), change the retry interval from `2000` to `4000` and reduce loop from 10 to 5 iterations (same 20s total).

**Account page (app/(chat)/account/page.tsx):**

6. Extract three sections into separate component files in `app/(chat)/account/components/`:

  a. `profile-section.tsx` — The "Profile" card (lines 225-313 of account page). Props: `{ profile: ProfileData | null; displayName: string; setDisplayName: (v: string) => void; companyName: string; setCompanyName: (v: string) => void; industry: string; setIndustry: (v: string) => void }`. Move the `ProfileData` interface to a shared types file or export from page.

  b. `business-profile-section.tsx` — The "Business Profile" card (lines 315-482). Props: `{ productsServices, setProductsServices, websiteUrl, setWebsiteUrl, targetMarket, setTargetMarket, competitors, setCompetitors, businessGoals, setBusinessGoals, annualRevenue, setAnnualRevenue, yearsInBusiness, setYearsInBusiness, employeeCount, setEmployeeCount }` (all string + setter pairs).

  c. `data-privacy-section.tsx` — The "Data & Privacy" card (lines 497-599). Props: `{ exporting: boolean; deleting: boolean; deleteConfirmText: string; setDeleteConfirmText: (v: string) => void; handleExport: () => void; handleDeleteAccount: () => void }`.

7. In account/page.tsx, use `next/dynamic` to lazy-load all three sections:
```tsx
import dynamic from "next/dynamic";
const ProfileSection = dynamic(() => import("./components/profile-section"));
const BusinessProfileSection = dynamic(() => import("./components/business-profile-section"));
const DataPrivacySection = dynamic(() => import("./components/data-privacy-section"));
```
No loading fallbacks needed here — the page already shows a full-page Loader2 spinner during initial load. The sections render after data is fetched anyway.

Keep the form state, handlers (handleSave, handleExport, handleDeleteAccount, loadData), and the loading/saving state in the parent page.tsx. Only the JSX rendering of each section is extracted.
  </action>
  <verify>
Run `pnpm build` — must succeed with no errors. Check that subscribe and account routes show reduced First Load JS in the build output compared to current values (subscribe: 340kB, account check in build output). Verify no TypeScript errors.
  </verify>
  <done>
Subscribe page is split into 3 files (main + 2 dynamic components). Account page is split into 4 files (main + 3 dynamic components). All `unoptimized` flags removed from Image components. Polling interval is 4s. Build passes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Consolidate duplicate render paths and lazy-load AppSidebar</name>
  <files>
    app/(chat)/new/page.tsx
    app/(chat)/chat/[id]/page.tsx
    app/(chat)/layout.tsx
  </files>
  <action>
**Consolidate /new page (app/(chat)/new/page.tsx):**

The current page has two identical render branches differing only in `initialChatModel`. Consolidate to a single return:

```tsx
export default async function Page() {
  const supabase = await createClient();
  const { data: { user: sessionUser } } = await supabase.auth.getUser();

  if (!sessionUser) {
    redirect("/login");
  }

  const id = generateUUID();
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");

  return (
    <>
      <ChatWithErrorBoundary
        autoResume={false}
        id={id}
        initialChatModel={modelIdFromCookie?.value ?? DEFAULT_CHAT_MODEL}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
      />
      <DataStreamHandler />
    </>
  );
}
```

**Consolidate /chat/[id] page (app/(chat)/chat/[id]/page.tsx):**

Same pattern — two identical render branches differing only in `initialChatModel`. Consolidate to single return:

```tsx
// After all the data loading code...
const chatModelFromCookie = cookieStore.get("chat-model");

return (
  <>
    <ChatWithErrorBoundary
      autoResume={true}
      chatTopic={chat.topic || chat.title}
      hasMoreMessages={hasMoreMessages}
      id={chat.id}
      initialBotType={initialBotType}
      initialChatModel={chatModelFromCookie?.value ?? DEFAULT_CHAT_MODEL}
      initialLastContext={(chat.lastContext as any) ?? undefined}
      initialMessages={uiMessages}
      initialVisibilityType={chat.visibility as VisibilityType}
      isReadonly={sessionUser?.id !== chat.userId}
    />
    <DataStreamHandler />
  </>
);
```

**Lazy-load AppSidebar (app/(chat)/layout.tsx):**

1. Change the static import of AppSidebar to a dynamic import:
```tsx
import dynamic from "next/dynamic";

const AppSidebar = dynamic(() =>
  import("@/components/app-sidebar").then((mod) => ({ default: mod.AppSidebar })),
  { ssr: false }
);
```

Use `ssr: false` because AppSidebar is a "use client" component that uses hooks (useRouter, useState, useSidebar) and doesn't need server rendering. The sidebar is inside SidebarProvider which already handles the layout space.

2. Keep the existing `<Suspense>` around children — no additional Suspense needed for the sidebar since `ssr: false` with dynamic already handles loading.
  </action>
  <verify>
Run `pnpm build` — must succeed. Run `pnpm lint` — must pass. Verify /new page went from 55 lines to ~30 lines. Verify /chat/[id] page went from 111 lines to ~80 lines. Check build output that layout chunk is smaller.
  </verify>
  <done>
/new page has a single render path (was duplicated). /chat/[id] page has a single render path (was duplicated). AppSidebar is lazy-loaded with next/dynamic (ssr: false). Build and lint pass.
  </done>
</task>

<task type="auto">
  <name>Task 3: Supabase DB — add missing FK index, drop unused indexes, switch auth connection</name>
  <files>
    supabase/migrations/20260227000100_performance_index_cleanup.sql
  </files>
  <action>
Create a new migration file `supabase/migrations/20260227000100_performance_index_cleanup.sql` that:

1. **Add missing FK index on AICostLog.chatId:**
```sql
CREATE INDEX IF NOT EXISTS idx_aicostlog_chatid ON "AICostLog" ("chatId");
```

2. **Drop 8 unused indexes** (these were identified from Supabase's unused index analysis — they consume write overhead without query benefit):
```sql
DROP INDEX IF EXISTS idx_aicostlog_createdat;
DROP INDEX IF EXISTS idx_aicostlog_userid;
DROP INDEX IF EXISTS idx_stripe_webhook_event_processed;
DROP INDEX IF EXISTS idx_webhook_dead_letter_resolved;
DROP INDEX IF EXISTS idx_webhook_dead_letter_created;
DROP INDEX IF EXISTS idx_stream_chatid_createdat;
DROP INDEX IF EXISTS idx_support_ticket_message_sender_id;
DROP INDEX IF EXISTS "Chat_userCategory_idx";
```

3. Add a comment at the top of the migration explaining the rationale:
```sql
-- Performance cleanup: add FK index for AICostLog.chatId (JOIN performance),
-- drop 8 unused indexes identified via pg_stat_user_indexes (zero scans, write overhead only).
-- Auth connection strategy change is applied via Supabase Dashboard, not SQL.
```

**Apply via Supabase MCP or CLI:**
After creating the migration file, apply it to the Supabase project (ID: esymbjpzjjkffpfqukxw) using the SQL editor or CLI. If MCP is not available, document that the migration needs manual application via Supabase Dashboard SQL Editor.

**Supabase auth connection strategy:** The percentage-based connection pooling strategy is a Supabase Dashboard setting under Project Settings > Database > Connection Pooling, NOT a SQL migration. Document this in the migration comment but do NOT attempt to set it via SQL. The executor should note this needs manual toggle in the dashboard.
  </action>
  <verify>
Verify the migration file exists and has valid SQL syntax (no syntax errors). If applied, verify via Supabase that:
- `idx_aicostlog_chatid` exists
- The 8 dropped indexes no longer exist
- Run `pnpm build` to confirm no app-level regressions from index changes
  </verify>
  <done>
Migration file created with FK index addition and 8 unused index drops. Migration applied to Supabase (or documented for manual application). Auth connection strategy noted as dashboard setting.
  </done>
</task>

</tasks>

<verification>
1. `pnpm build` passes with no errors
2. `pnpm lint` passes
3. Subscribe page has dynamic imports for PaymentSuccess and WelcomeStep
4. Account page has dynamic imports for all 3 sections
5. No `unoptimized` prop on any Image in subscribe flow
6. Polling interval is 4000ms (not 2000ms)
7. /new page has single render return (no cookie branching)
8. /chat/[id] page has single render return (no cookie branching)
9. AppSidebar loaded via next/dynamic in layout
10. Supabase migration file exists with correct SQL
</verification>

<success_criteria>
- Build output shows reduced First Load JS for /subscribe route (below 340kB)
- Zero duplicate JSX render paths in /new and /chat/[id]
- All 5 new component files created (2 subscribe + 3 account)
- AppSidebar chunk separated from main layout bundle
- Supabase migration ready with 1 new index + 8 dropped indexes
</success_criteria>

<output>
After completion, create `.planning/quick/11-fix-all-performance-issues-split-subscri/11-SUMMARY.md`
</output>
