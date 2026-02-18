---
phase: 24-model-resilience-voice-optimization
plan: 01
subsystem: api, infra
tags: [circuit-breaker, retry, fallback, ai-fallback, google-ai, zod, health-check, openrouter]

# Dependency graph
requires:
  - phase: 20-structured-logging
    provides: structured logger used in resilience and health modules
provides:
  - isTransientError() for circuit breaker error classification
  - getRetryAfterMs() for provider rate limit header parsing
  - Provider-level fallback chain (OpenRouter -> direct Google Gemini)
  - Zod-validated conversation summarizer output
  - OpenRouter health probe with latency reporting
  - Secondary AI provider status in health endpoint
affects: [24-02-voice-optimization, monitoring, observability]

# Tech tracking
tech-stack:
  added: ["@ai-sdk/google@2.0.20", "ai-fallback@1.0.8"]
  patterns: [provider-fallback-chain, transient-error-classification, retry-after-parsing, zod-validated-ai-output]

key-files:
  created: []
  modified:
    - lib/resilience.ts
    - lib/ai/providers.ts
    - lib/ai/conversation-summarizer.ts
    - app/(chat)/api/chat/route.ts
    - app/api/health/route.ts

key-decisions:
  - "Used @ai-sdk/google@2.0.20 and ai-fallback@1.0.8 for LanguageModelV2 compatibility (v3 latest incompatible with ai@5.0.118)"
  - "Transient errors: 429 + 5xx + network patterns. Client errors (400/401/403/404) never trip circuit breaker"
  - "Retry-After capped at 120s to prevent absurd waits from misbehaving providers"
  - "Safety middleware wraps outer model (fallback chain) so it applies regardless of which provider responds"
  - "Health probe uses OpenRouter /api/v1/key endpoint with 5s timeout"
  - "secondary-ai down status is informational only, does not set overall health to degraded"

patterns-established:
  - "isTransientError guard before recordCircuitFailure: prevents client errors from opening circuit"
  - "createModelWithFallback pattern: wraps OpenRouter model with optional direct Google Gemini fallback"
  - "Zod safeParse for AI-generated JSON: reject malformed output with logged issues instead of silent acceptance"

# Metrics
duration: 18min
completed: 2026-02-18
---

# Phase 24 Plan 01: AI Provider Resilience Summary

**Circuit breaker transient-error classification, Retry-After header parsing, ai-fallback provider chain (OpenRouter -> Google Gemini), Zod-validated summarizer, and OpenRouter health probe**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-18T18:04:09Z
- **Completed:** 2026-02-18T18:22:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Circuit breaker now only trips on transient errors (429, 5xx, network), ignoring client errors (400/401/403/404) that previously caused false positives
- Retry logic respects Retry-After headers from OpenRouter rate limit responses instead of blind exponential backoff
- Provider fallback chain degrades gracefully: OpenRouter model fallback -> direct Google Gemini (when GOOGLE_AI_API_KEY configured) -> error
- Conversation summarizer validates AI JSON output with Zod schema, returning null on malformed data instead of silently accepting garbage
- Health endpoint actively probes OpenRouter reachability with latency metrics and reports secondary AI configuration status

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix circuit breaker error classification, retry-after parsing, Zod-validate summarizer** - `9384289` (feat)
2. **Task 2: Add provider-level fallback and OpenRouter health probe** - `96ffaa8` (feat)

## Files Created/Modified

- `lib/resilience.ts` - Added isTransientError(), getRetryAfterMs(), respectRetryAfter option in withRetry
- `lib/ai/providers.ts` - Added createModelWithFallback() using ai-fallback with optional Google Gemini direct fallback
- `lib/ai/conversation-summarizer.ts` - Replaced manual JSON parsing with Zod safeParse validation
- `app/(chat)/api/chat/route.ts` - Guarded circuit breaker recording with isTransientError in onError callback
- `app/api/health/route.ts` - Added probeOpenRouter() with 5s timeout, secondary-ai config status, parallel health checks

## Decisions Made

- Used `@ai-sdk/google@2.0.20` (not latest 3.x) because AI SDK v5.0.118 uses LanguageModelV2 types, and `@ai-sdk/google@3.x` returns LanguageModelV3 which is incompatible with `wrapLanguageModel`
- Used `ai-fallback@1.0.8` (not latest 2.x) for same LanguageModelV2 compatibility reason
- Capped Retry-After at 120 seconds to prevent provider bugs from stalling requests indefinitely
- Safety middleware wraps the outer fallback chain model, ensuring safety checks apply to both OpenRouter and direct Google responses
- Health probe targets `/api/v1/key` (lightweight key validation endpoint) rather than model inference endpoint

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] LanguageModelV2/V3 version incompatibility**
- **Found during:** Task 2 (ai-fallback + @ai-sdk/google installation)
- **Issue:** `ai-fallback@2.0.0` and `@ai-sdk/google@3.0.29` use LanguageModelV3, but `ai@5.0.118` and `wrapLanguageModel` require LanguageModelV2
- **Fix:** Downgraded to `ai-fallback@1.0.8` and `@ai-sdk/google@2.0.20` which implement LanguageModelV2
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** `pnpm build` passes with no type errors
- **Committed in:** Prior session commit (packages pre-installed)

**2. [Rule 1 - Bug] createUIMessageStream onError signature mismatch**
- **Found during:** Task 1 (onError callback update)
- **Issue:** Plan suggested `({ error }) => {}` destructuring, but `createUIMessageStream.onError` signature is `(error: unknown) => string`, not `({ error }) => string`
- **Fix:** Used `(error) => {}` parameter directly instead of destructuring
- **Files modified:** app/(chat)/api/chat/route.ts
- **Verification:** `pnpm build` passes
- **Committed in:** 9384289

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for type safety and build correctness. No scope creep.

## Issues Encountered

- Prior session (24-02) had already committed providers.ts changes and package installations, so this plan's Task 2 had less delta than expected. The final state is correct.

## User Setup Required

**External services require manual configuration:**
- **GOOGLE_AI_API_KEY**: Optional. Get from [Google AI Studio](https://aistudio.google.com/apikey). Add to Vercel environment variables for production. When not set, app works fine with only OpenRouter (no crash, just no fallback).

## Next Phase Readiness

- AI provider resilience hardened with proper error classification and fallback chain
- Health endpoint provides active monitoring of OpenRouter and secondary AI status
- Ready for Phase 24 Plan 02 (voice optimization) which builds on this resilience foundation

## Self-Check: PASSED

- All 6 files exist
- Both commits verified (9384289, 96ffaa8)
- All key content patterns found (isTransientError, safeParse, createFallback, probeOpenRouter, getRetryAfterMs)
- Build passes with no type errors

---
*Phase: 24-model-resilience-voice-optimization*
*Completed: 2026-02-18*
