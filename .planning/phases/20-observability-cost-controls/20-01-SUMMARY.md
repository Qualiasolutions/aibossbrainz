---
phase: 20-observability-cost-controls
plan: 01
subsystem: infra, api, observability
tags: [pino, structured-logging, cost-tracking, cron, supabase, tokenlens]

# Dependency graph
requires:
  - phase: 16-model-resilience-tool-hardening
    provides: stable AI model IDs and tokenlens integration
  - phase: 18-safety-rails
    provides: logger usage patterns in chat route
provides:
  - AICostLog table for per-request AI cost tracking
  - lib/cost/tracker.ts with recordAICost, getDailyAICostTotal, getMonthlyCostSummary
  - Daily cost alerting cron at /api/cron/cost-check
  - Monthly cost dashboard API at /api/admin-costs
  - Stripe webhook fully migrated to structured logging
affects: [20-02-PLAN (broad logging migration uses same patterns)]

# Tech tracking
tech-stack:
  added: []
  patterns: [createRequestLogger for request-scoped logging, after() for non-blocking cost recording, CRON_SECRET bearer auth for cron routes]

key-files:
  created:
    - lib/cost/tracker.ts
    - supabase/migrations/20260218000100_add_ai_cost_log.sql
    - app/api/cron/cost-check/route.ts
    - app/(chat)/api/admin-costs/route.ts
  modified:
    - app/(chat)/api/chat/route.ts
    - app/api/stripe/webhook/route.ts
    - vercel.json

key-decisions:
  - "AICostLog as separate table (not UserAnalytics extension) for per-request granularity and per-model breakdown"
  - "Non-blocking cost recording via after() to avoid latency impact on chat responses"
  - "AI_DAILY_COST_THRESHOLD_USD env var with $10 default for configurable alerting"
  - "23:00 UTC cron schedule to capture most of day's spend before aggregation"

patterns-established:
  - "createRequestLogger(event.id) pattern for Stripe webhook request-scoped logging"
  - "Service role only RLS policy for admin-only tables"
  - "Admin endpoint auth: supabase.auth.getUser() + isUserAdmin() check"

# Metrics
duration: 5min
completed: 2026-02-18
---

# Phase 20 Plan 01: Cost Infrastructure Summary

**AICostLog table with per-request cost tracking, Stripe webhook fully migrated to pino structured logging, daily cost alerting cron, and monthly cost dashboard API**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-18T07:31:15Z
- **Completed:** 2026-02-18T07:36:21Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- AICostLog table with RLS and date indexes for cost aggregation queries
- Cost tracker module with recordAICost, getDailyAICostTotal, getMonthlyCostSummary (per-model breakdown)
- Chat route logs every AI response with inputTokens, outputTokens, modelId, costUSD and records to AICostLog
- Stripe webhook: all 33 console.* calls replaced with structured pino logging using createRequestLogger(event.id)
- Chat route: all 5 console.warn calls replaced with logger.warn
- Daily cost cron at 23:00 UTC sends admin email when spend exceeds configurable threshold
- Monthly cost dashboard API with admin-only auth and per-model breakdown

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AICostLog table and cost tracker module** - `9d576b4` (feat)
2. **Task 2: Wire cost recording into chat route and migrate Stripe webhook logging** - `c046c62` (feat)
3. **Task 3: Create cost alerting cron and monthly cost dashboard API** - `ec13537` (feat)

## Files Created/Modified
- `lib/cost/tracker.ts` - Cost recording and aggregation functions (recordAICost, getDailyAICostTotal, getMonthlyCostSummary)
- `supabase/migrations/20260218000100_add_ai_cost_log.sql` - AICostLog table with RLS and indexes
- `app/(chat)/api/chat/route.ts` - Added cost recording via after(), structured AI response logging, migrated 5 console.warn to logger.warn
- `app/api/stripe/webhook/route.ts` - Complete structured logging migration (33 console.* -> pino logger/reqLog)
- `app/api/cron/cost-check/route.ts` - Daily cost aggregation cron with threshold alerting via admin email
- `app/(chat)/api/admin-costs/route.ts` - Monthly cost dashboard API (admin-only, per-model breakdown)
- `vercel.json` - Added cost-check cron at 23:00 UTC daily

## Decisions Made
- AICostLog as separate table for per-request granularity (not extending UserAnalytics JSONB)
- costUSD extracted from tokenlens finalMergedUsage.costUSD.totalUSD (live pricing catalog)
- Non-blocking cost recording in after() callback to avoid chat response latency
- $10 default daily threshold via AI_DAILY_COST_THRESHOLD_USD env var
- createRequestLogger(event.id) for Stripe webhook to correlate all log entries per event

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

- Apply migration `supabase/migrations/20260218000100_add_ai_cost_log.sql` via Supabase Dashboard SQL Editor
- Optionally set `AI_DAILY_COST_THRESHOLD_USD` env var in Vercel (defaults to $10)

## Next Phase Readiness
- Cost infrastructure complete, ready for 20-02 (broad structured logging migration)
- Patterns established: createRequestLogger, logger.warn/error/info with structured context
- 20-02 will migrate remaining ~179 server-side console.* calls using same patterns

## Self-Check: PASSED

All 4 created files verified. All 3 task commits verified (9d576b4, c046c62, ec13537).

---
*Phase: 20-observability-cost-controls*
*Completed: 2026-02-18*
