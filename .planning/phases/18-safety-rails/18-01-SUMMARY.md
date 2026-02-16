---
phase: 18-safety-rails
plan: 01
subsystem: safety
tags: [pii, redaction, canary, middleware, security, luhn]

requires:
  - phase: 16-model-resilience
    provides: "Stable AI model configuration with wrapLanguageModel support"
provides:
  - "PII redaction module (credit card Luhn, SSN, email, phone)"
  - "Canary token for system prompt leak detection"
  - "AI SDK safety middleware for non-streaming output"
  - "Message storage PII redaction before Postgres insert"
  - "Post-hoc streaming output scan with security event logging"
  - "Document prompt content sanitization"
affects: [18-02-safety-rails, voice-quality, observability]

tech-stack:
  added: []
  patterns: [safety-middleware, pii-redaction, canary-leak-detection, prompt-sanitization]

key-files:
  created: [lib/safety/pii-redactor.ts, lib/safety/canary.ts, lib/safety/output-guard.ts]
  modified: [lib/db/queries/message.ts, lib/ai/providers.ts, lib/ai/prompts.ts, app/(chat)/api/chat/route.ts]

key-decisions:
  - "Used LanguageModelV2Middleware (AI SDK v5 type) instead of plan's LanguageModelV3Middleware which does not exist in installed SDK version"
  - "Canary detection uses ALECCI_CANARY_ prefix match rather than full token match for partial leak detection"
  - "Post-hoc scan is detection/logging only -- streamed content cannot be recalled from client"
  - "Credit card redaction requires Luhn validation OR explicit card formatting to reduce false positives on long digit sequences"

patterns-established:
  - "Safety middleware pattern: wrapLanguageModel with safetyMiddleware on all production model slots"
  - "PII redaction before storage: redactPII applied to user message text parts in saveMessages"
  - "Post-hoc output scanning: assistant messages scanned for PII and canary leaks in onFinish callback"
  - "Document prompt sanitization: XML delimiters with do_not_follow_instructions framing"

duration: 6min
completed: 2026-02-16
---

# Phase 18 Plan 01: Safety Rails - PII Redaction & Output Guard Summary

**PII redaction with Luhn-validated credit card detection, canary token leak detection in system prompts, AI SDK safety middleware for non-streaming output, and post-hoc streaming scan with security event logging**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-16T20:06:17Z
- **Completed:** 2026-02-16T20:12:49Z
- **Tasks:** 2
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments

- PII redactor with credit card (Luhn-validated), SSN, email, and phone detection -- replaces matches with `[REDACTED]`
- All 4 production AI model slots wrapped with safety middleware that intercepts non-streaming output (titles, summaries)
- Canary token embedded in every system prompt (including brevity mode) for leak detection
- User messages have PII scrubbed before Postgres insert; assistant streaming output scanned post-hoc with security event logging
- Document prompt content sanitized with XML delimiters to prevent prompt injection

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PII redactor, canary token, and safety middleware modules** - `73e408d` (feat)
2. **Task 2: Wire safety modules into message storage, model providers, system prompt, and chat route** - `b69f500` (feat)

## Files Created/Modified

- `lib/safety/pii-redactor.ts` - PII regex detection and redaction with Luhn credit card validation
- `lib/safety/canary.ts` - Deployment-specific canary token generation and detection
- `lib/safety/output-guard.ts` - AI SDK LanguageModelMiddleware for non-streaming output redaction
- `lib/db/queries/message.ts` - PII redaction integrated before Supabase insert for user messages
- `lib/ai/providers.ts` - All 4 model slots wrapped with wrapLanguageModel + safetyMiddleware
- `lib/ai/prompts.ts` - Canary token in system prompt, sanitizePromptContent exported, updateDocumentPrompt sanitized
- `app/(chat)/api/chat/route.ts` - Post-hoc PII + canary scan in onFinish callback

## Decisions Made

- **LanguageModelV2Middleware over V3:** Plan referenced `LanguageModelV3Middleware` which doesn't exist in AI SDK v5. Used `LanguageModelMiddleware` (alias for `LanguageModelV2Middleware`) with `middlewareVersion: "v2"`.
- **Prefix-based canary detection:** `containsCanary` checks for the `ALECCI_CANARY_` prefix rather than the full token, catching partial leaks where the model might truncate or paraphrase.
- **Credit card Luhn + format check:** Redact digit sequences only if they pass Luhn OR have explicit card formatting (dashes/spaces between groups), preventing false positives on invoice numbers or similar long digit sequences.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used LanguageModelV2Middleware instead of LanguageModelV3Middleware**
- **Found during:** Task 1 (output-guard.ts creation)
- **Issue:** Plan specified `LanguageModelV3Middleware` type from `"ai"` but this type does not exist in AI SDK v5. The SDK exports `LanguageModelMiddleware` (alias for `LanguageModelV2Middleware`).
- **Fix:** Used `LanguageModelMiddleware` from `"ai"` with `middlewareVersion: "v2"` and `wrapGenerate` matching the V2 signature (`doGenerate`/`doStream`/`params`/`model`).
- **Files modified:** `lib/safety/output-guard.ts`
- **Verification:** TypeScript compilation passes, lint clean.
- **Committed in:** `73e408d` (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed import ordering in chat route**
- **Found during:** Task 2 (chat route modification)
- **Issue:** Lint `assist/source/organizeImports` error because `@/lib/safety/*` imports were placed before `@/lib/analytics/*` (not alphabetical).
- **Fix:** Moved safety imports to correct alphabetical position (after `@/lib/resilience/`, before `@/lib/security/`).
- **Files modified:** `app/(chat)/api/chat/route.ts`
- **Verification:** Lint passes, same 4 pre-existing errors as baseline.
- **Committed in:** `b69f500` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

None - execution was straightforward.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Safety infrastructure complete: `lib/safety/` module ready for 18-02 (input validation, rate limiting enhancements)
- All production models have safety middleware applied
- System prompt has canary token for leak detection
- Post-hoc scanning provides alerting foundation for future observability integration

## Self-Check: PASSED

- All 3 created files exist
- Both task commits (73e408d, b69f500) verified in git log
- All key integrations confirmed (redactPII in message.ts, wrapLanguageModel in providers.ts, getCanaryToken in prompts.ts, containsCanary in route.ts, sanitizePromptContent exported)

---
*Phase: 18-safety-rails*
*Completed: 2026-02-16*
