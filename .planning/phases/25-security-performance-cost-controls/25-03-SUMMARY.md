---
phase: 25-security-performance-cost-controls
plan: 03
subsystem: api, cost-tracking
tags: [openrouter, gemini, cost-tracking, cron, supabase, anomaly-detection]

# Dependency graph
requires:
  - phase: 20-observability-cost-controls
    provides: AICostLog table, recordAICost function, getDailyAICostTotal
provides:
  - Correct model documentation (Gemini 2.5 Flash)
  - Version tracking comments for model pinning awareness
  - Demo chat cost tracking via recordAICost
  - Per-user daily cost aggregation (getUserDailyCost, getTopUserCosts)
  - Per-user anomaly detection in cost-check cron
  - AICostLog userId index migration
affects: [26-documentation-design-decisions, cost-monitoring, admin-alerts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nullable userId in AICostLog for anonymous/demo cost tracking"
    - "Per-user cost anomaly detection via 10x average multiplier"

key-files:
  created:
    - supabase/migrations/20260219000200_add_aicostlog_userid_index.sql
  modified:
    - lib/ai/models.ts
    - lib/ai/providers.ts
    - app/api/demo/chat/route.ts
    - lib/cost/tracker.ts
    - app/api/cron/cost-check/route.ts

key-decisions:
  - "Nullable userId in AICostLog for demo/anonymous cost tracking (FK constraint relaxed)"
  - "Per-user anomaly threshold: 10x the daily per-user average"
  - "Demo cost recorded with costUSD=0 since OpenRouter calculates actual cost"

patterns-established:
  - "Anonymous cost tracking: use null userId with index filtering via .not('userId', 'is', null)"

# Metrics
duration: 28min
completed: 2026-02-18
---

# Phase 25 Plan 03: Model Documentation, Demo Cost Tracking & Per-User Spending Alerts Summary

**Corrected model docs to Gemini 2.5 Flash, added demo chat cost logging via recordAICost, and implemented per-user anomaly detection in cost-check cron with 10x threshold alerting**

## Performance

- **Duration:** 28 min
- **Started:** 2026-02-18T20:30:39Z
- **Completed:** 2026-02-18T20:58:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Model documentation corrected from nonexistent "Gemini 3 Flash Pro" to actual "Gemini 2.5 Flash" with version tracking comments
- Demo chat route now logs token usage via recordAICost in streamText onFinish callback
- Two new per-user cost functions (getUserDailyCost, getTopUserCosts) enable granular cost visibility
- Cost-check cron enhanced with per-user anomaly detection that flags users spending >10x the daily average
- AICostLog userId index migration ready for deployment

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix model documentation and add version tracking** - `89d06fe` (feat)
2. **Task 2: Add demo cost tracking and per-user spending alerts** - `2782632` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `lib/ai/models.ts` - Corrected model name from "Gemini 3 Flash Pro" to "Gemini 2.5 Flash"
- `lib/ai/providers.ts` - Added version tracking documentation block with model pinning guidance
- `app/api/demo/chat/route.ts` - Added recordAICost call in streamText onFinish for demo cost tracking
- `lib/cost/tracker.ts` - Added getUserDailyCost and getTopUserCosts functions, made userId nullable
- `app/api/cron/cost-check/route.ts` - Added per-user anomaly detection with admin alerting
- `supabase/migrations/20260219000200_add_aicostlog_userid_index.sql` - userId indexes and nullable constraint

## Decisions Made
- Made AICostLog.userId nullable to support demo/anonymous cost tracking without requiring a User record
- Per-user anomaly threshold set to 10x the daily per-user average (configurable via ANOMALY_MULTIPLIER)
- Demo cost entries recorded with costUSD=0 since actual cost is determined by OpenRouter billing
- Used streamText's onFinish callback (not createUIMessageStream's onFinish) to access usage data

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed chat.tsx loadOlderMessages variable ordering**
- **Found during:** Task 1 (build verification)
- **Issue:** loadOlderMessages useCallback referenced `messages` from useChat before it was declared, causing TypeScript error
- **Fix:** Moved loadOlderMessages callback after the useChat hook declaration
- **Files modified:** components/chat.tsx
- **Verification:** TypeScript compilation passes, build succeeds
- **Committed in:** 89d06fe (bundled with Task 1 commit)

**2. [Rule 3 - Blocking] Made AICostLog userId nullable for demo tracking**
- **Found during:** Task 2 (demo cost tracking implementation)
- **Issue:** AICostLog.userId has NOT NULL + FK constraint to User table, but demo chat has no authenticated user
- **Fix:** Added ALTER COLUMN DROP NOT NULL to migration, allowing null userId for anonymous tracking
- **Files modified:** supabase/migrations/20260219000200_add_aicostlog_userid_index.sql, lib/cost/tracker.ts
- **Verification:** TypeScript compilation passes, getTopUserCosts filters out null userIds
- **Committed in:** 2782632 (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for build success and correct functionality. No scope creep.

## Issues Encountered
- Next.js build intermittently fails with missing middleware-manifest.json due to @next/swc version mismatch (15.5.7 vs 15.5.11). Resolved by using warm cache instead of rm -rf .next. TypeScript type checking always passes.

## User Setup Required

Migration `20260219000200_add_aicostlog_userid_index.sql` needs to be applied via Supabase Dashboard SQL Editor.

## Next Phase Readiness
- Phase 25 is complete (all 3 plans done)
- Ready for Phase 26 (Documentation & Design Decisions)
- All cost tracking infrastructure in place for operational monitoring

---
*Phase: 25-security-performance-cost-controls*
*Completed: 2026-02-18*
