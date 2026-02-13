# Cleanup Report — aibossbrainz

**Generated**: 2026-02-13
**Stack**: Next.js 15.5.11, React 19, TypeScript (strict), Supabase, pnpm
**Source dirs**: app/, components/, hooks/, lib/, supabase/

---

## Summary

| Metric | Count |
|---|---|
| **Total issues** | 132 |
| **Critical** | 6 |
| **High** | 19 |
| **Medium** | 24 |
| **Low** | 12 |
| **Dead code items** | 54 |
| **Duplicate code clones** | 233 (4,915 lines / 6.7%) |
| **Estimated removable lines** | ~2,500+ |

---

## Critical Issues (Fix Immediately)

### CRIT-1: DiffView ProseMirror not dynamically imported
- **File**: `components/diffview.tsx`
- **What**: ProseMirror (~150-200KB) loaded in initial chat bundle
- **Why**: Massively inflates first-load JS for all chat users
- **Fix**: Wrap with `next/dynamic` + loading skeleton
- **Status**: PENDING

### CRIT-2: Missing optimizePackageImports for heavy editor packages
- **File**: `next.config.ts`
- **What**: `codemirror`, `@codemirror/*`, `prosemirror-example-setup` not in optimizePackageImports
- **Why**: Full libraries bundled even when only parts are used
- **Fix**: Add to `experimental.optimizePackageImports` array
- **Status**: PENDING

### CRIT-3: N+1 queries on history page
- **File**: `app/(chat)/history/page.tsx:78-105`
- **What**: Up to 100 individual DB calls in a loop to fetch chat history
- **Why**: Causes severe latency and DB load on history page
- **Fix**: Replace with single batched query using `.in()` filter
- **Status**: PENDING

### CRIT-4: RPC calls cast to `any` despite types existing
- **Files**: `lib/admin/queries.ts:33,47,428,688`, `lib/db/queries/executive.ts:52`, `lib/db/queries/message.ts:57`, `lib/ai/knowledge-base.ts:293`
- **What**: 7 RPC calls use `(supabase.rpc as any)` or `(supabase as any).rpc`
- **Why**: Bypasses type safety, hides parameter/return type mismatches
- **Fix**: Regenerate Supabase types, add missing RPC definitions to types
- **Status**: PENDING

### CRIT-5: `get_bounded_messages` RPC missing from generated types
- **File**: `lib/supabase/database.types.ts`
- **What**: RPC function used in code but not in generated types file
- **Why**: Forces `any` casts, no compile-time validation of parameters
- **Fix**: Run `pnpm gen:types` to regenerate from live schema
- **Status**: PENDING

### CRIT-6: `knowledge_base_content` table missing from generated types
- **File**: `lib/supabase/database.types.ts`
- **What**: Table exists in DB but not in TypeScript types
- **Why**: All queries to this table are untyped
- **Fix**: Run `pnpm gen:types` to regenerate from live schema
- **Status**: PENDING

---

## High Priority Issues

### HIGH-1: Server actions missing auth checks
- **File**: `app/(chat)/actions.ts:36,52`
- **What**: `deleteTrailingMessages` and `updateChatVisibility` have no auth verification
- **Why**: Any authenticated user could delete/modify another user's chat data
- **Fix**: Add `auth.uid()` check at start of each action
- **Status**: PENDING

### HIGH-2: Admin server actions missing auth checks
- **Files**: `app/(admin)/admin/users/page.tsx:14,20,26`, `support-tickets/page.tsx:14,20,29`, `support-tickets/[ticketId]/page.tsx:14,21,27`, `users/[id]/page.tsx:37`
- **What**: Admin actions use `createServiceClient()` (bypasses RLS) with no admin role verification
- **Why**: If routes are accessible, any user could perform admin operations
- **Fix**: Add admin role check before `createServiceClient()` calls
- **Status**: PENDING

### HIGH-3: Stripe actions ignoring Supabase errors
- **File**: `lib/stripe/actions.ts:40-43,263-266,313-319`
- **What**: `getOrCreateStripeCustomer`, `cancelSubscription`, `expireSubscription` ignore update/query errors
- **Why**: Silent failures could leave subscription state inconsistent
- **Fix**: Check `.error` after each Supabase call and throw/log
- **Status**: PENDING

### HIGH-4: chat.tsx is 474 lines with 17 useState hooks
- **File**: `components/chat.tsx`
- **What**: Monolithic component handling chat, voice, onboarding, sidebar, and more
- **Why**: Hard to maintain, test, or reason about; performance impact from excessive re-renders
- **Fix**: Extract voice logic, sidebar logic, and message handling into custom hooks
- **Status**: PENDING

### HIGH-5: Focus traps missing in modals
- **Files**: `components/executive-switch.tsx`, `components/onboarding-modal.tsx`
- **What**: Modal dialogs don't trap keyboard focus
- **Why**: Accessibility violation — keyboard users can tab behind modals
- **Fix**: Use Radix Dialog's built-in focus trap or add `react-focus-lock`
- **Status**: PENDING

### HIGH-6: Loading state disappears prematurely in messages
- **File**: `components/message.tsx:128-143`
- **What**: Loading indicator hidden as soon as text content exists
- **Why**: User sees partial response without indication more is coming
- **Fix**: Keep loading indicator visible while streaming is active
- **Status**: PENDING

### HIGH-7: Open redirect via `redirectTo` parameter
- **Files**: `app/(auth)/login/page.tsx:87`, `app/(auth)/subscribe/page.tsx:80,91`
- **What**: User-supplied redirect URL used without validation
- **Why**: Attacker can craft login link redirecting to phishing site
- **Fix**: Validate redirect URL against allowlist of internal paths
- **Status**: PENDING

### HIGH-8: Privacy/terms pages use "use client" for static content
- **Files**: `app/(marketing)/privacy/page.tsx`, `app/(marketing)/terms/page.tsx`
- **What**: 500+ lines of static legal text marked as client components just for framer-motion animations
- **Why**: Entire page sent as JS instead of HTML; ~1000 lines of unnecessary client JS
- **Fix**: Convert to server components, use CSS animations instead
- **Status**: PENDING

### HIGH-9: date-fns not in optimizePackageImports
- **File**: `next.config.ts`
- **What**: `date-fns` imported without tree-shaking optimization
- **Why**: Pulls more of the library than needed into bundle
- **Fix**: Add `date-fns` to `experimental.optimizePackageImports`
- **Status**: PENDING

### HIGH-10: MessageFullscreen Dialog rendered per-message
- **File**: `components/message.tsx:341-348`
- **What**: Each message renders its own fullscreen Dialog component (~30 instances per page)
- **Why**: Unnecessary DOM overhead and memory usage
- **Fix**: Lift Dialog to parent, pass selected message as state
- **Status**: PENDING

### HIGH-11: Analytics page entirely client-rendered
- **File**: `app/(chat)/analytics/page.tsx`
- **What**: Uses useEffect + fetch for all data
- **Why**: No SSR, no caching, slower initial render
- **Fix**: Fetch data in server component, pass to client for charts
- **Status**: PENDING

### HIGH-12: Vote lookup O(n) per message
- **File**: `components/messages.tsx:84-86`
- **What**: Linear scan through votes array for each message
- **Why**: O(n²) overall rendering performance with many messages
- **Fix**: Convert votes to Map keyed by messageId
- **Status**: PENDING

### HIGH-13: Artifact metadata system typed as `any`
- **Files**: `components/create-artifact.tsx`, `components/artifact-actions.tsx:15-16`, `hooks/use-artifact.ts:72`
- **What**: Artifact metadata uses `any` throughout
- **Why**: No type safety for artifact creation/manipulation
- **Fix**: Define `ArtifactMetadata` interface
- **Status**: PENDING

### HIGH-14: DocumentPreview result/args typed as `any`
- **File**: `components/document-preview.tsx:59-60`
- **What**: Tool call result and args not typed
- **Why**: Runtime errors possible from incorrect property access
- **Fix**: Define types matching tool call shapes
- **Status**: PENDING

### HIGH-15: query-mappers has 44 unsafe `as` assertions
- **File**: `lib/admin/query-mappers.ts:8-68`
- **What**: All mappers cast `Record<string, unknown>` to specific types
- **Why**: Zero runtime validation; silently produces wrong data if schema changes
- **Fix**: Use Zod parsing or type guards
- **Status**: PENDING

### HIGH-16: Stripe types double-cast
- **File**: `app/api/stripe/webhook/route.ts:141-145,334,348-352`
- **What**: Stripe SDK types cast through `unknown` to custom types
- **Why**: Hides real type mismatches between Stripe versions
- **Fix**: Use Stripe SDK types directly or create proper adapters
- **Status**: PENDING

### HIGH-17: CSP allows unsafe-eval
- **File**: `vercel.json:19`
- **What**: Content Security Policy includes `unsafe-eval`
- **Why**: Enables XSS vectors through eval-based attacks
- **Fix**: Remove `unsafe-eval`, fix any code that requires it
- **Status**: PENDING

### HIGH-18: Missing botType validation in realtime route
- **File**: `app/(chat)/api/realtime/route.ts:33`
- **What**: `botType` from request body not validated
- **Why**: Could accept arbitrary values, causing unexpected behavior
- **Fix**: Validate against enum of valid bot types
- **Status**: PENDING

### HIGH-19: N+1 queries in admin support ticket pages
- **Files**: `lib/db/support-queries.ts:274-296`, `lib/admin/queries.ts:730-747`
- **What**: Individual queries for each ticket's user data
- **Why**: Slow admin pages with many tickets
- **Fix**: Use join or `.in()` batch query
- **Status**: PENDING

---

## Medium Priority Issues

### MED-1: Unmanaged z-index stack
- **Files**: Various components
- **What**: z-index values from z-[99999] to z-10 scattered without system
- **Why**: Stacking context conflicts, hard to reason about overlay order
- **Fix**: Define z-index scale in Tailwind config or CSS variables
- **Status**: PENDING

### MED-2: Prop drilling in Chat component (3+ levels)
- **File**: `components/chat.tsx`
- **What**: Props passed through 3+ component levels
- **Why**: Tight coupling, hard to refactor
- **Fix**: Use context or composition pattern
- **Status**: PENDING

### MED-3: Missing empty states
- **Files**: Various list/page components
- **What**: No empty state UI when data is absent
- **Why**: Users see blank screens instead of helpful guidance
- **Fix**: Add empty state components
- **Status**: PENDING

### MED-4: Vote_v2 missing FK to Message_v2
- **File**: Database schema
- **What**: No foreign key constraint on Vote_v2 → Message_v2
- **Why**: Orphaned votes possible, no cascade deletes
- **Fix**: Add FK constraint via migration
- **Status**: PENDING

### MED-5: Suggestion table missing FK to Document
- **File**: Database schema
- **What**: No foreign key constraint on Suggestion → Document
- **Why**: Orphaned suggestions possible
- **Fix**: Add FK constraint via migration
- **Status**: PENDING

### MED-6: Generated Supabase types are stale
- **File**: `lib/supabase/database.types.ts`
- **What**: Missing `knowledge_base_content` table and several RPC functions
- **Why**: Forces `any` casts throughout codebase
- **Fix**: Run `pnpm gen:types`
- **Status**: PENDING

### MED-7: 39 instances of `.select("*")` across codebase
- **Files**: Various query files
- **What**: Fetching all columns instead of only needed ones
- **Why**: Over-fetching data, larger payloads, slower queries
- **Fix**: Replace with specific column selections (prioritize hot paths)
- **Status**: PENDING

### MED-8: getAdminStats fetches all messages into memory
- **File**: `lib/admin/queries.ts:382-393`
- **What**: Loads all messages to compute stats client-side
- **Why**: Memory spike, slow response with large datasets
- **Fix**: Use SQL aggregate queries (COUNT, AVG, etc.)
- **Status**: PENDING

### MED-9: No page metadata exports on any marketing page
- **Files**: `app/(marketing)/` — all 6 pages
- **What**: No `generateMetadata` or `metadata` export
- **Why**: Poor SEO — no page-specific titles, descriptions, or OG tags
- **Fix**: Add metadata exports to each page
- **Status**: PENDING

### MED-10: API route mutations never call revalidatePath/revalidateTag
- **Files**: Various API routes
- **What**: After data mutations, Next.js cache not invalidated
- **Why**: Stale data shown to users after updates
- **Fix**: Add revalidation calls after mutations
- **Status**: PENDING

### MED-11: Admin route group missing loading.tsx and error.tsx
- **File**: `app/(admin)/admin/`
- **What**: No loading or error boundary files
- **Why**: No loading UI during admin data fetches; unhandled errors crash page
- **Fix**: Add `loading.tsx` and `error.tsx`
- **Status**: PENDING

### MED-12: Middleware runs on all marketing pages unnecessarily
- **File**: `middleware.ts`
- **What**: Supabase auth check runs for unauthenticated marketing routes
- **Why**: Unnecessary latency and DB calls for public pages
- **Fix**: Narrow middleware matcher to exclude marketing routes
- **Status**: PENDING

### MED-13: `app/(chat)/new/page.tsx` forced dynamic by cookies()
- **File**: `app/(chat)/new/page.tsx:21`
- **What**: `await cookies()` makes page dynamic for just a model preference cookie
- **Why**: Prevents static generation of what could be a static shell
- **Fix**: Read cookie client-side or use searchParams
- **Status**: PENDING

### MED-14: No Suspense boundaries in layout files
- **Files**: All layout.tsx files
- **What**: No `<Suspense>` wrapping async content
- **Why**: Entire page blocked during server data fetching
- **Fix**: Add Suspense boundaries around data-dependent sections
- **Status**: PENDING

### MED-15: Analytics API has no response caching
- **File**: Analytics API route
- **What**: No cache headers or Next.js cache configuration
- **Why**: Redundant DB queries on every request
- **Fix**: Add `revalidate` config or cache headers
- **Status**: PENDING

### MED-16: Health endpoint exposes system information
- **File**: `app/api/health/route.ts`
- **What**: Returns internal system details
- **Why**: Information disclosure to attackers
- **Fix**: Return only status: ok, or remove entirely (it's dead)
- **Status**: PENDING

### MED-17: 31 explicit `any` usages across codebase
- **Files**: Various
- **What**: Explicit `any` types scattered throughout
- **Why**: Bypasses TypeScript's type safety
- **Fix**: Replace with proper types (prioritize exported functions)
- **Status**: PENDING

### MED-18: 3 `@ts-expect-error` directives
- **Files**: Various
- **What**: Type errors suppressed with comments
- **Why**: Hides real type issues
- **Fix**: Fix underlying type errors
- **Status**: PENDING

### MED-19: Inconsistent type patterns across similar files
- **Files**: Various
- **What**: Some files use interfaces, others use types for identical patterns
- **Why**: Inconsistent codebase, harder for contributors
- **Fix**: Standardize on one approach per pattern
- **Status**: PENDING

### MED-20: react-data-grid fully loaded for limited use
- **File**: Components using react-data-grid
- **What**: Heavy grid library loaded for potentially simple tables
- **Why**: Bundle bloat
- **Fix**: Dynamic import or evaluate if native table suffices
- **Status**: PENDING

### MED-21: Missing validation on several API route inputs
- **Files**: Various API routes
- **What**: Request bodies not validated with Zod in some routes
- **Why**: Potential for unexpected data causing errors
- **Fix**: Add Zod schemas
- **Status**: PENDING

### MED-22: dangerouslySetInnerHTML usage (static content)
- **Files**: Marketing components
- **What**: Used for rendering HTML content
- **Why**: Low risk since content is static, but pattern is risky
- **Fix**: Replace with React components where possible
- **Status**: PENDING

### MED-23: chat.lastContext typed as `any`
- **File**: Various files accessing chat.lastContext
- **What**: lastContext field has no type definition
- **Why**: No type safety when reading/writing context
- **Fix**: Define `ChatContext` interface
- **Status**: PENDING

### MED-24: Unnecessary `msg as any` casts
- **Files**: Various message handling code
- **What**: Message objects cast to any unnecessarily
- **Why**: Loses type information
- **Fix**: Use proper Message types
- **Status**: PENDING

---

## Low Priority / Tech Debt

### LOW-1: Biome lint warnings (noArrayIndexKey)
- **File**: `components/landing-page-client.tsx`
- **What**: Array index used as React key
- **Why**: Can cause rendering issues on reorder
- **Fix**: Use stable unique IDs
- **Status**: PENDING

### LOW-2: qs DoS vulnerability (CVE-2026-2391)
- **Package**: `qs` via `@mailchimp/mailchimp_marketing`
- **What**: Low severity DoS in query string parsing
- **Why**: Only affects server-side Mailchimp integration
- **Fix**: Await upstream fix or override dependency
- **Status**: PENDING

### LOW-3: @next/swc version mismatch
- **What**: @next/swc 15.5.7 detected vs Next.js 15.5.11
- **Why**: Build warnings, potential subtle compilation differences
- **Fix**: `pnpm install` to sync versions
- **Status**: PENDING

### LOW-4: Scroll accessibility in chat
- **Files**: Chat scroll containers
- **What**: Custom scroll areas may not announce to screen readers
- **Why**: Accessibility gap for assistive technology users
- **Fix**: Add appropriate ARIA attributes
- **Status**: PENDING

### LOW-5: Missing status announcements for live regions
- **Files**: Chat components
- **What**: No `aria-live` regions for dynamic content updates
- **Why**: Screen reader users miss new messages
- **Fix**: Add `aria-live="polite"` to message container
- **Status**: PENDING

### LOW-6: Unused env vars in env.ts
- **File**: `lib/env.ts`
- **What**: `RESEND_API_KEY` and `RESEND_FROM_EMAIL` defined but never used
- **Why**: Dead configuration, confusing for developers
- **Fix**: Remove from env.ts
- **Status**: PENDING

### LOW-7: 9 console.log statements in production code
- **Files**: `components/artifact.tsx`, `app/(chat)/api/subscription/route.ts`, `app/(chat)/api/stripe/checkout/route.ts`, `lib/artifacts/server.ts`, `lib/mailchimp/tags.ts`, `lib/ai/knowledge-base.ts`, `lib/db/queries/user.ts`
- **What**: Debug logging left in production
- **Why**: Noise in browser/server console, potential info leak
- **Fix**: Remove or replace with structured logger
- **Status**: PENDING

### LOW-8: 2 commented-out code blocks (3+ lines)
- **Files**: Various
- **What**: Dead commented code
- **Why**: Noise, version control handles history
- **Fix**: Delete
- **Status**: PENDING

### LOW-9: Feature flag / config dead code
- **File**: `lib/ai/suggestions-config.ts`
- **What**: Suggestions config exists but suggestions API route is dead
- **Why**: Orphaned configuration
- **Fix**: Remove with dead API route
- **Status**: PENDING

### LOW-10: Duplicate code in voice hooks
- **Files**: `hooks/use-auto-speak.ts`, `hooks/use-voice-player.ts`, `hooks/use-greeting-speech.ts`
- **What**: 6 duplicate clones across voice hooks
- **Why**: Maintenance burden, divergent bug fixes
- **Fix**: Extract shared voice utilities
- **Status**: PENDING

### LOW-11: Duplicate code in strategy canvas components
- **Files**: `components/strategy-canvas/` (business-model-canvas, swot-board, customer-journey, brainstorm-board)
- **What**: 92+ line identical blocks across canvas components
- **Why**: High maintenance burden
- **Fix**: Extract shared canvas base component
- **Status**: PENDING

### LOW-12: Duplicate auth form boilerplate
- **Files**: `app/(auth)/` pages
- **What**: Repeated auth form patterns
- **Why**: Inconsistency risk across auth pages
- **Fix**: Extract shared auth form component
- **Status**: PENDING

---

## Dead Code Inventory

### Unused Files (11)
| File | Reason |
|---|---|
| `app/test/page.tsx` | Test page, no references |
| `vercel-template.json` | Template artifact, unused |
| `fix-limits.sh` | One-time script |
| `fix-limits.conf` | One-time config |
| `build_log.txt` | Build artifact |
| `conversion_log.txt` | Build artifact |
| `deploy_log.txt` | Build artifact |
| `output.txt` | Temp file |
| `pdf_parse_head.txt` | Temp file |
| `pdf_parse_pkg.json` | Temp file |
| `temp_read.txt` | Temp file |

### Dead API Routes (4)
| Route | Reason |
|---|---|
| `app/(chat)/api/suggestions/route.ts` | No callers found |
| `app/api/delete-account/route.ts` | No callers found |
| `app/api/export-user-data/route.ts` | No callers found |
| `app/api/health/route.ts` | No callers found (may be external) |

### Unused Exports (36)
| File | Exports |
|---|---|
| `lib/sentry.ts` | `clearUserContext`, `setUserContext`, `addBreadcrumb`, `authBreadcrumb`, `documentBreadcrumb`, `userActionBreadcrumb` |
| `lib/api-logging.ts` | `getApiLogger`, `withApiLogging`, `logExternalCall`, `logDbQuery` |
| `lib/security/rate-limiter.ts` | `resetRateLimit`, `resetAuthRateLimit`, `getRateLimitCount` |
| `lib/resilience.ts` | `withCircuitBreaker`, `withResilience`, `resetCircuit` |
| `lib/utils.ts` | `setCsrfToken`, `getLocalStorage`, `getTrailingMessageId` |
| `lib/bot-personalities.ts` | Unused personality helper |
| `lib/constants.ts` | Unused constant(s) |
| `lib/admin/queries.ts` | Unused admin query function(s) |
| `lib/errors.ts` | Unused error class(es) |
| `lib/logger.ts` | Unused logger export(s) |
| `lib/supabase/middleware.ts` | Unused middleware export |
| `lib/ai/suggestions-config.ts` | Entire file (dead route) |
| `lib/ai/voice-config.ts` | Unused voice config export(s) |
| `lib/ai/parse-suggestions.ts` | Entire file (dead route) |
| `lib/conversation-export.ts` | Unused export function(s) |
| `lib/cms/landing-page-types.ts` | Unused type export(s) |
| `lib/types.ts` | Unused type(s) |
| `lib/api-utils.ts` | Unused utility function(s) |
| `lib/db/queries/executive.ts` | Unused query export(s) |
| `lib/db/queries/canvas.ts` | Unused query export(s) |

### Unused Dependencies (env vars)
| Item | Location |
|---|---|
| `RESEND_API_KEY` | `lib/env.ts` |
| `RESEND_FROM_EMAIL` | `lib/env.ts` |

### Duplicate Code Hotspots
| Clone Group | Files | Lines |
|---|---|---|
| Privacy ↔ Terms | `app/(marketing)/privacy/page.tsx` ↔ `terms/page.tsx` | 509 |
| Voice hooks | `hooks/use-auto-speak.ts` ↔ `use-voice-player.ts` ↔ `use-greeting-speech.ts` | ~180 |
| Strategy canvas | `components/strategy-canvas/` (4 files) | ~370 |
| Auth forms | `app/(auth)/` (multiple) | ~200 |
| List pages | `clarifications/page.tsx` ↔ `saved/page.tsx` ↔ `actionable/page.tsx` | ~150 |

---

## Fix Plan

### Batch 1: Safe Fixes (one commit)
Low risk, high confidence, no behavior change.

1. Delete 11 unused files (test page, temp files, log files)
2. Delete 4 dead API routes (suggestions, delete-account, export-user-data, health)
3. Delete dead config files: `lib/ai/suggestions-config.ts`, `lib/ai/parse-suggestions.ts`
4. Remove 36 unused exports from their respective files
5. Remove 2 unused env vars from `lib/env.ts`
6. Remove 9 console.log/warn/error statements
7. Remove 2 commented-out code blocks
8. Fix Biome lint warning (noArrayIndexKey)

### Batch 2: Moderate Fixes (one commit)
Moderate risk, requires testing but straightforward.

1. Regenerate Supabase types (`pnpm gen:types`) — fixes CRIT-4,5,6
2. Add auth checks to server actions (HIGH-1, HIGH-2)
3. Add error handling to Stripe Supabase calls (HIGH-3)
4. Add `optimizePackageImports` for codemirror, prosemirror, date-fns (CRIT-2, HIGH-9)
5. Dynamic import DiffView/ProseMirror (CRIT-1)
6. Validate redirect URLs against internal paths (HIGH-7)
7. Validate botType in realtime route (HIGH-18)
8. Add metadata exports to marketing pages (MED-9)
9. Add loading.tsx and error.tsx to admin route group (MED-11)
10. Convert votes array to Map for O(1) lookup (HIGH-12)
11. Remove `unsafe-eval` from CSP if possible (HIGH-17)

### Batch 3: Risky Fixes (ask before each)
Higher risk, requires careful review and testing.

1. Refactor chat.tsx (474 lines → extract hooks) — HIGH-4
2. Fix N+1 history page queries (CRIT-3)
3. Fix N+1 admin support ticket queries (HIGH-19)
4. Convert privacy/terms to server components (HIGH-8)
5. Lift MessageFullscreen Dialog to parent (HIGH-10)
6. Convert analytics page to server-side data fetching (HIGH-11)
7. Add focus traps to modals (HIGH-5)
8. Fix loading state in messages (HIGH-6)
9. Replace query-mappers `as` assertions with Zod (HIGH-15)
10. Narrow middleware matcher (MED-12)
11. Add Suspense boundaries (MED-14)
12. Consolidate duplicate voice hooks (LOW-10)
13. Consolidate strategy canvas components (LOW-11)
