---
phase: 22-auth-subscription-guards
plan: 01
subsystem: auth
tags: [subscription, csrf, rate-limiting, supabase, elevenlabs, voice]

# Dependency graph
requires:
  - phase: 21-prompt-security
    provides: "CSRF infrastructure (withCsrf, useCsrf), canary tokens, security patterns"
provides:
  - "Subscription enforcement on voice, realtime, and realtime/stream endpoints"
  - "UserAnalytics-based DB fallback for voice/realtime rate limiting"
  - "AuditLog-based DB fallback for export rate limiting"
  - "CSRF protection on demo chat endpoint"
  - "Public /api/csrf endpoint for unauthenticated visitors"
affects: [voice, realtime, export, demo-chat, landing-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "checkUserSubscription() before expensive resource consumption (ElevenLabs, AI)"
    - "UserAnalytics-based DB fallback for voice rate limiting when Redis unavailable"
    - "AuditLog-based DB fallback for export rate limiting when Redis unavailable"
    - "rateLimit.source === 'redis' branching pattern for DB fallback"

key-files:
  created: []
  modified:
    - "app/(chat)/api/voice/route.ts"
    - "app/(chat)/api/realtime/route.ts"
    - "app/(chat)/api/realtime/stream/route.ts"
    - "app/(chat)/api/export-user-data/route.ts"
    - "app/api/demo/chat/route.ts"
    - "components/landing/interactive-chat-demo.tsx"
    - "lib/supabase/middleware.ts"

key-decisions:
  - "Use Number() cast for UserAnalytics.voiceMinutes since DB type is Json, not number"
  - "Query UserAnalytics for voice rate limit DB fallback instead of Message_v2 (correct metric)"
  - "Query AuditLog for export rate limit DB fallback (action-based, not message-based)"

patterns-established:
  - "Subscription check pattern: checkUserSubscription() after auth, before resource consumption"
  - "DB fallback pattern: rateLimit.source === 'redis' branching with domain-specific table queries"

# Metrics
duration: 8min
completed: 2026-02-18
---

# Phase 22 Plan 01: Auth & Subscription Guards Summary

**Subscription enforcement on voice/realtime endpoints with UserAnalytics/AuditLog DB fallback rate limiting and CSRF-protected demo chat**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-18T15:16:27Z
- **Completed:** 2026-02-18T15:24:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Voice, realtime, and realtime/stream endpoints now reject expired subscriptions before consuming ElevenLabs TTS or AI resources
- Rate limit DB fallbacks corrected: voice and realtime/stream query UserAnalytics (not Message_v2), export queries AuditLog (not buggy requiresDatabaseCheck pattern)
- Demo chat endpoint protected with CSRF via withCsrf wrapper, client uses csrfFetch, and /api/csrf is publicly accessible for unauthenticated visitors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add subscription checks and fix rate limit DB fallbacks (AUTH-01, AUTH-02, AUTH-03, AUTH-05)** - `99e7df3` (feat)
2. **Task 2: Add CSRF protection to demo chat endpoint (AUTH-04)** - `4dcba92` (feat)

## Files Created/Modified
- `app/(chat)/api/voice/route.ts` - Added checkUserSubscription, replaced getMessageCountByUserId with UserAnalytics query
- `app/(chat)/api/realtime/route.ts` - Added checkUserSubscription before AI generation and TTS
- `app/(chat)/api/realtime/stream/route.ts` - Added checkUserSubscription, replaced getMessageCountByUserId with UserAnalytics query
- `app/(chat)/api/export-user-data/route.ts` - Replaced buggy requiresDatabaseCheck with AuditLog-based DB fallback
- `app/api/demo/chat/route.ts` - Wrapped with withCsrf() for cross-origin POST protection
- `components/landing/interactive-chat-demo.tsx` - Added useCsrf hook and csrfFetch for CSRF token handling
- `lib/supabase/middleware.ts` - Added /api/csrf to publicApiRoutes for unauthenticated access

## Decisions Made
- Used `Number()` cast for `voiceMinutes` field since Supabase types it as `Json | null`, not `number` -- this was a type mismatch discovered during build
- Chose UserAnalytics table for voice/realtime DB fallback because it tracks the actual voice usage metric, unlike Message_v2 which counts chat messages
- Chose AuditLog table for export DB fallback because DATA_EXPORT actions are already logged there for audit purposes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Json type mismatch for UserAnalytics.voiceMinutes**
- **Found during:** Task 1 (rate limit DB fallback implementation)
- **Issue:** Plan used `data?.voiceMinutes ?? 0` but Supabase types `voiceMinutes` as `Json | null`, not `number`, causing TypeScript error
- **Fix:** Changed to `Number(data?.voiceMinutes) || 0` to safely cast Json to number
- **Files modified:** `app/(chat)/api/voice/route.ts`, `app/(chat)/api/realtime/stream/route.ts`
- **Verification:** `pnpm build` passes with no type errors
- **Committed in:** `99e7df3` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Type cast necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All AUTH-01 through AUTH-05 requirements implemented
- Subscription enforcement pattern established for any future premium endpoints
- DB fallback rate limiting now uses correct domain-specific tables across all routes
- Ready for remaining phase 22 plans (if any) or next phase

## Self-Check: PASSED

- [x] `app/(chat)/api/voice/route.ts` exists
- [x] `app/(chat)/api/realtime/route.ts` exists
- [x] `git log --oneline --all --grep="22-01"` returns 2 commits (99e7df3, 4dcba92)

---
*Phase: 22-auth-subscription-guards*
*Completed: 2026-02-18*
