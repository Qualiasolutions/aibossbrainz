---
phase: 23-webhook-reliability
plan: 01
subsystem: payments
tags: [stripe, webhook, idempotency, supabase, vercel]

# Dependency graph
requires:
  - phase: 22-auth-subscription-guards
    provides: Stripe webhook route with subscription handling
provides:
  - StripeWebhookEvent dedup table with unique eventId constraint
  - markEventProcessed function for event-ID-based idempotency
  - maxDuration = 60 export for Vercel timeout protection
  - Top-level event-ID dedup covering all 6 webhook event types
affects: [stripe, webhooks, subscription-activation]

# Tech tracking
tech-stack:
  added: []
  patterns: [event-ID dedup via INSERT + unique constraint violation (23505)]

key-files:
  created:
    - supabase/migrations/20260218000200_webhook_reliability.sql
    - lib/stripe/webhook-dedup.ts
  modified:
    - app/api/stripe/webhook/route.ts
    - lib/supabase/types.ts

key-decisions:
  - "Event-ID dedup via INSERT + unique constraint instead of SELECT-then-INSERT (atomic, race-condition-free)"
  - "maxDuration = 60 (not 30) to give headroom for Stripe SDK 30s timeout + retries"
  - "Top-level dedup before switch statement instead of per-handler checks (DRY, all events covered)"
  - "Type cast for StripeWebhookEvent table access until database types are regenerated"

patterns-established:
  - "Stripe webhook idempotency: INSERT into StripeWebhookEvent, check for 23505 unique violation"
  - "maxDuration export on long-running API routes for Vercel timeout protection"

# Metrics
duration: 5min
completed: 2026-02-18
---

# Phase 23 Plan 01: Webhook Reliability Summary

**Event-ID-based Stripe webhook dedup with StripeWebhookEvent table and maxDuration = 60 timeout protection**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-18T16:04:25Z
- **Completed:** 2026-02-18T16:09:37Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created StripeWebhookEvent table with unique eventId constraint for atomic dedup
- Replaced status-based isAlreadyProcessed with event-ID-based markEventProcessed
- Added maxDuration = 60 export to prevent Vercel serverless timeout
- All 6 webhook event types now covered by idempotency (fixes audit M-8 through M-11)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create StripeWebhookEvent table migration and dedup module** - `87e6993` (feat)
2. **Task 2: Add maxDuration and replace isAlreadyProcessed with event-ID dedup** - `3358044` (feat)

## Files Created/Modified
- `supabase/migrations/20260218000200_webhook_reliability.sql` - StripeWebhookEvent table with unique constraint, RLS, index
- `lib/stripe/webhook-dedup.ts` - markEventProcessed using INSERT + unique violation detection
- `app/api/stripe/webhook/route.ts` - maxDuration export, top-level dedup, removed isAlreadyProcessed
- `lib/supabase/types.ts` - TODO comment for StripeWebhookEvent type alias (pending type regeneration)

## Decisions Made
- Event-ID dedup via INSERT + unique constraint (23505) instead of SELECT-then-INSERT -- atomic and race-condition-free
- maxDuration = 60 seconds to allow headroom beyond Stripe SDK's 30s timeout + retry behavior
- Top-level dedup before the switch statement covers all event types with a single check instead of per-handler
- Used type cast (`as any`) for StripeWebhookEvent table access since database.types.ts hasn't been regenerated yet

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Type cast needed for ungenerated table types**
- **Found during:** Task 1 (webhook-dedup.ts creation)
- **Issue:** database.types.ts doesn't include StripeWebhookEvent since migration hasn't been applied yet. Build failed with type error on `supabase.from("StripeWebhookEvent")`
- **Fix:** Added `as any` cast with biome-ignore comment and clear TODO for removal after `pnpm gen:types`
- **Files modified:** lib/stripe/webhook-dedup.ts
- **Verification:** `pnpm build` succeeds
- **Committed in:** 87e6993 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary workaround for type safety gap. Will self-resolve when migration is applied and types regenerated. No scope creep.

## Issues Encountered
None beyond the type cast deviation above.

## User Setup Required

**External services require manual configuration:**
- Run migration `20260218000200_webhook_reliability.sql` in Supabase Dashboard SQL Editor
- After migration, run `pnpm gen:types` to regenerate database.types.ts, then remove the `as any` cast in lib/stripe/webhook-dedup.ts

## Next Phase Readiness
- Webhook dedup infrastructure ready for plan 23-02 (retry logic / error handling improvements)
- Migration must be applied before dedup is functional in production

---
*Phase: 23-webhook-reliability*
*Completed: 2026-02-18*
