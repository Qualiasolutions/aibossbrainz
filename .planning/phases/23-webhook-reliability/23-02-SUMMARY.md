---
phase: 23-webhook-reliability
plan: 02
subsystem: payments
tags: [stripe, webhook, postgres, advisory-lock, dead-letter, rate-limiting]

requires:
  - phase: 23-webhook-reliability-01
    provides: StripeWebhookEvent table and markEventProcessed dedup function
provides:
  - Advisory lock serialization for concurrent per-user webhook events
  - WebhookDeadLetter table for failed event persistence
  - IP-based rate limiting on webhook endpoint
  - process_webhook_event RPC combining dedup + advisory lock atomically
affects: [stripe, webhook, database-migrations]

tech-stack:
  added: []
  patterns: [advisory-lock-via-rpc, dead-letter-queue, webhook-rate-limiting]

key-files:
  created: []
  modified:
    - supabase/migrations/20260218000200_webhook_reliability.sql
    - lib/stripe/webhook-dedup.ts
    - lib/security/rate-limiter.ts
    - app/api/stripe/webhook/route.ts

key-decisions:
  - "process_webhook_event RPC combines dedup + advisory lock in single DB call (atomic, no app-level races)"
  - "Advisory lock key derived from hashtext(user_id) for per-user serialization"
  - "Webhook rate limit: 100 req/min/IP with 1-minute window (generous for Stripe retries)"
  - "Dead-letter persistence isolated in try-catch so its failure never crashes webhook processing"

patterns-established:
  - "RPC-based advisory locking: combine check + lock + write in single DB function"
  - "Dead-letter pattern: persist failures for inspection without affecting main flow"
  - "checkWebhookRateLimit: dedicated webhook rate limiter with in-memory fallback"

duration: 4min
completed: 2026-02-18
---

# Phase 23 Plan 02: Webhook Reliability Summary

**Advisory locking via process_webhook_event RPC, WebhookDeadLetter table for failure persistence, and IP-based rate limiting on Stripe webhook endpoint**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-18T16:13:31Z
- **Completed:** 2026-02-18T16:17:43Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Concurrent webhook events for the same user are now serialized via pg_advisory_xact_lock
- Failed webhook processing is captured in WebhookDeadLetter table with full payload for debugging
- Webhook endpoint rejects excessive requests via IP-based rate limiting (100/min/IP)
- Dead-letter persistence is isolated so its own failure cannot crash webhook processing

## Task Commits

Each task was committed atomically:

1. **Task 1: Update migration with WebhookDeadLetter + RPC** - `2946477` (feat)
2. **Task 2: Replace markEventProcessed with RPC-based shouldProcessEvent** - `676354a` (feat)
3. **Task 3: Add rate limiting and dead-letter persistence to webhook route** - `cd31c2d` (feat)

## Files Created/Modified
- `supabase/migrations/20260218000200_webhook_reliability.sql` - Added WebhookDeadLetter table and process_webhook_event RPC function
- `lib/stripe/webhook-dedup.ts` - Replaced markEventProcessed with shouldProcessEvent (RPC) and persistFailedEvent
- `lib/security/rate-limiter.ts` - Added checkWebhookRateLimit function with Redis + in-memory fallback
- `app/api/stripe/webhook/route.ts` - Integrated rate limiting, RPC-based dedup, and dead-letter persistence

## Decisions Made
- Used RPC function for atomic dedup + advisory lock instead of separate app-level calls (eliminates race window between check and lock)
- Advisory lock key uses hashtext(user_id) with COALESCE to 0 for null users (events without userId share a single lock)
- Webhook rate limit window is 1 minute with 100 requests max (generous enough for Stripe burst retries, protective against DoS)
- persistFailedEvent wraps its own errors so dead-letter DB failures never escalate

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added checkWebhookRateLimit to rate-limiter.ts**
- **Found during:** Task 3
- **Issue:** Plan suggested using checkAuthRateLimit but its action parameter is typed as `"login" | "signup" | "reset"` and doesn't accept webhook keys
- **Fix:** Added dedicated checkWebhookRateLimit function with webhook-appropriate window (1 min) and limit (100 req)
- **Files modified:** lib/security/rate-limiter.ts
- **Verification:** Build compiles, function exported and used in webhook route
- **Committed in:** cd31c2d (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary deviation -- existing rate limiter API couldn't serve webhook use case. No scope creep.

## Issues Encountered
None

## User Setup Required

**External services require manual configuration.** Apply the updated migration via Supabase Dashboard SQL Editor:
- File: `supabase/migrations/20260218000200_webhook_reliability.sql`
- Contains: WebhookDeadLetter table + process_webhook_event RPC function (additive to existing StripeWebhookEvent table)
- Location: Supabase Dashboard -> SQL Editor -> paste migration content

## Next Phase Readiness
- Webhook reliability complete: dedup, advisory locks, dead-letter queue, rate limiting
- Phase 23 fully complete (both plans shipped)
- Ready for phase 24

---
## Self-Check: PASSED

All 5 files verified present. All 3 task commits verified in git log.

---
*Phase: 23-webhook-reliability*
*Completed: 2026-02-18*
