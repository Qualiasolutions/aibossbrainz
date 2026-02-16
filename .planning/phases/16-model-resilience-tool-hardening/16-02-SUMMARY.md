---
phase: 16-model-resilience-tool-hardening
plan: 02
subsystem: ai
tags: [fetch, abort-controller, timeout, auth, error-handling, tools]

# Dependency graph
requires:
  - phase: 16-model-resilience-tool-hardening
    provides: "Plan 01 provides model resilience; this plan hardens tool invocations"
provides:
  - "Weather tool with response validation, 10s timeout, and user-friendly errors"
  - "requestSuggestions with auth + ownership check (no existence leak)"
  - "strategyCanvas with ChatSDKError-specific error handling"
affects: [18-safety-rails, 20-observability-cost-controls]

# Tech tracking
tech-stack:
  added: []
  patterns: [AbortController-timeout-pattern, uniform-auth-error-pattern, ChatSDKError-differentiation]

key-files:
  created: []
  modified:
    - lib/ai/tools/get-weather.ts
    - lib/ai/tools/request-suggestions.ts
    - lib/ai/tools/strategy-canvas.ts

key-decisions:
  - "Uniform error message for document not-found and not-yours to prevent existence leak"
  - "5s timeout for geocoding, 10s timeout for weather fetch (separate AbortControllers)"
  - "ChatSDKError vs generic error differentiation in strategyCanvas for better log triage"

patterns-established:
  - "AbortController timeout: create controller, setTimeout to abort, pass signal to fetch, clearTimeout after resolve"
  - "Uniform auth error: return same error message whether resource missing or unauthorized"
  - "Error differentiation: catch ChatSDKError for DB errors, log unexpected errors separately"

# Metrics
duration: 2min
completed: 2026-02-16
---

# Phase 16 Plan 02: Tool Hardening Summary

**Weather tool with AbortController timeouts and response validation; requestSuggestions with ownership check preventing existence leaks; strategyCanvas with ChatSDKError-specific error handling**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-16T18:50:47Z
- **Completed:** 2026-02-16T18:53:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Weather tool now has 10s timeout on weather fetch and 5s on geocoding, `response.ok` validation, response structure validation, and user-friendly error messages for all failure modes (timeout, bad response, unexpected data, network error)
- requestSuggestions checks auth before any DB call and returns uniform "Document not found or access denied" for both missing and unauthorized documents (prevents existence leaks)
- strategyCanvas differentiates ChatSDKError (known DB errors) from unexpected errors in catch block for better log triage

## Task Commits

Each task was committed atomically:

1. **Task 1: Add timeout, response validation, and error handling to weather tool** - `056d231` (feat)
2. **Task 2: Add authorization checks to requestSuggestions and strategyCanvas tools** - `722bc49` (feat)

## Files Created/Modified

- `lib/ai/tools/get-weather.ts` - Added AbortController timeouts (5s geocode, 10s weather), response.ok check, response structure validation, AbortError-specific handling
- `lib/ai/tools/request-suggestions.ts` - Added auth check at top, ownership check with uniform error, removed redundant late auth check
- `lib/ai/tools/strategy-canvas.ts` - Imported ChatSDKError, differentiated DB errors from unexpected errors in catch

## Decisions Made

- Uniform error message ("Document not found or access denied") for both missing and unauthorized documents to prevent leaking document existence via differing error messages
- Separate AbortController instances for geocoding (5s) and weather (10s) rather than a single shared timeout
- ChatSDKError instanceof check in strategyCanvas to differentiate known DB errors from unexpected failures in logs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three AI tool invocations now fail safely with user-friendly errors
- Phase 16 complete (both plans done) -- Phase 17 (Security Hardening) can proceed
- Patterns established (AbortController timeout, uniform auth errors) can be reused in future tool additions

---
*Phase: 16-model-resilience-tool-hardening*
*Completed: 2026-02-16*
