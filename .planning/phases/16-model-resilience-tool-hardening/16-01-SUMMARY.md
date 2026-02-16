---
phase: 16-model-resilience-tool-hardening
plan: 01
subsystem: ai
tags: [openrouter, gemini, resilience, circuit-breaker, timeout, fallback]

# Dependency graph
requires: []
provides:
  - "Stable model IDs (google/gemini-2.5-flash) replacing unstable preview slugs"
  - "OpenRouter native fallback chain on all 4 model slots"
  - "Resilience-wrapped title generation with 10s timeout and fallback string"
  - "Resilience-wrapped summary generation with 10s timeout and null fallback"
  - "streamText timeout (55s total, 15s chunk) preventing Vercel 504s"
  - "Client disconnect propagation via abortSignal"
affects: [17-security-hardening, 18-safety-rails, 20-observability-cost-controls]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OpenRouter extraBody.models array for native model fallback"
    - "withAIGatewayResilience wrapper for non-streaming AI calls"
    - "AI SDK timeout parameter for hard time limits"
    - "abortSignal: request.signal for client disconnect propagation"

key-files:
  created: []
  modified:
    - "lib/ai/providers.ts"
    - "app/(chat)/actions.ts"
    - "lib/ai/conversation-summarizer.ts"
    - "app/(chat)/api/chat/route.ts"

key-decisions:
  - "Gemini 2.5 Flash (stable GA) over Gemini 3 Flash Preview -- stability over cutting edge"
  - "Gemini 2.5 Flash Lite as fallback -- same family, lighter variant, high availability"
  - "10s timeout for title/summary (background tasks), 55s for streamText (under Vercel 60s limit)"
  - "15s chunk timeout for stalled stream detection -- balances model thinking time vs hang detection"

patterns-established:
  - "Model fallback: always use extraBody.models array with primary + lite fallback"
  - "Background AI calls: always wrap in withAIGatewayResilience + timeout + try/catch with graceful fallback"
  - "Streaming AI calls: always set timeout.totalMs under maxDuration and timeout.chunkMs for stall detection"

# Metrics
duration: 4min
completed: 2026-02-16
---

# Phase 16 Plan 01: Model Resilience Summary

**Stable Gemini 2.5 Flash model IDs with OpenRouter fallback chain, resilience-wrapped title/summary generation (10s timeout), and streamText timeout preventing Vercel 504s**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-16T18:49:49Z
- **Completed:** 2026-02-16T18:53:29Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- All 4 model slots pinned to stable `google/gemini-2.5-flash` with `google/gemini-2.5-flash-lite` fallback via OpenRouter's native `extraBody.models` array
- Title generation wrapped in `withAIGatewayResilience` (circuit breaker + retry) with 10s hard timeout; returns "New conversation" on any failure
- Summary generation wrapped in `withAIGatewayResilience` with 10s timeout; returns null on failure (existing try/catch preserved)
- Main `streamText` call hardened with 55s total timeout, 15s chunk stall detection, and client disconnect propagation

## Task Commits

Each task was committed atomically:

1. **Task 1: Pin stable model IDs and add OpenRouter fallback chain** - `926b568` (feat)
2. **Task 2: Wrap title and summary generation in resilience + timeout** - `f283dbd` (feat)
3. **Task 3: Add timeout to main streamText call** - `6b7c414` (feat)

## Files Created/Modified
- `lib/ai/providers.ts` - Stable model IDs with extraBody.models fallback chain on all 4 slots
- `app/(chat)/actions.ts` - generateTitleFromUserMessage wrapped in resilience + 10s timeout
- `lib/ai/conversation-summarizer.ts` - generateConversationSummary wrapped in resilience + 10s timeout
- `app/(chat)/api/chat/route.ts` - streamText with 55s total / 15s chunk timeout + abortSignal

## Decisions Made
- Used `google/gemini-2.5-flash` (stable GA since June 2025) instead of `google/gemini-3-flash-preview` (unstable) -- reliability over bleeding edge
- Chose `google/gemini-2.5-flash-lite` as fallback since it's the same family with higher availability
- Set 10s timeout for background tasks (title/summary) -- these are non-critical and should fail fast
- Set 55s total timeout for streamText (5s safety margin under Vercel's 60s maxDuration)
- Set 15s chunk timeout for stalled stream detection -- long enough for model "thinking" pauses, short enough to catch actual stalls

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Model layer is now resilient with fallback, timeouts, and circuit breaking
- Ready for 16-02 (tool hardening: weather API, requestSuggestions, strategyCanvas auth checks)
- All resilience patterns from `lib/resilience.ts` verified working in production code paths

---
*Phase: 16-model-resilience-tool-hardening*
*Completed: 2026-02-16*
