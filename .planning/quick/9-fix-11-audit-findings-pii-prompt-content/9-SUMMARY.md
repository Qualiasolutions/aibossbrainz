---
phase: quick-9
plan: 01
subsystem: security
tags: [pii, prompt-injection, content-moderation, rate-limiting, audit-remediation]
dependency-graph:
  requires: []
  provides: [pii-prohibition, content-moderation, tool-hardening, realtime-safety-scans]
  affects: [lib/ai/prompts.ts, app/(chat)/api/chat/route.ts, lib/ai/tools/*, app/(chat)/api/realtime/*, app/api/demo/chat/route.ts, lib/ai/entitlements.ts, package.json]
tech-stack:
  added: []
  patterns: [system-prompt-security-rules, regex-content-moderation, in-process-rate-limiting, abort-signal-timeouts]
key-files:
  created: []
  modified:
    - lib/ai/prompts.ts
    - app/(chat)/api/chat/route.ts
    - lib/ai/tools/strategy-canvas.ts
    - lib/ai/tools/deep-research.ts
    - lib/ai/tools/request-suggestions.ts
    - lib/ai/entitlements.ts
    - app/(chat)/api/realtime/route.ts
    - app/(chat)/api/realtime/stream/route.ts
    - app/api/demo/chat/route.ts
    - package.json
decisions:
  - Regex-based content moderation as first-pass defense (not a replacement for AI-level guardrails)
  - In-process hourly counter for deep research rate limiting (resets on deploy, primary limiting at chat route)
  - Post-hoc PII/canary detection in realtime routes (same pattern as main chat route -- detection only)
  - AbortSignal.timeout set just under each route's maxDuration for clean shutdown
metrics:
  duration: 6min
  completed: 2026-02-25
---

# Quick Task 9: Fix 11 Audit Findings (PII, Prompt, Content) Summary

Security hardening across system prompts, content moderation, AI tool execution, and realtime routes -- closing 11 audit findings spanning Critical, High, and Medium severity.

## What Was Done

### Task 1: Prompt Hardening and Content Moderation (8fe7cf9)

**C-1 - PII prohibition in system prompt:** Added a non-negotiable security rules block to every system prompt, placed immediately after the canary token. Rules prohibit echoing PII verbatim and disclosing system prompt internals. These rules explicitly override all other instructions.

**H-2 - Collaborative smart context ordering:** Moved the collaborative mode smart context detection block to AFTER the security rules, with an explicit scope note clarifying it only applies to topic/executive selection and does not override security rules.

**M-4 - XML delimiter escaping:** Added escapes for `</authored_content>`, `</canvas_data>`, `</user_document>`, and `</document_content>` closing tags in `sanitizePromptContent()`. Prevents user content from prematurely closing XML delimiters used as prompt boundaries.

**H-1 - Content moderation:** Added regex-based abuse pattern detection in the chat route, rejecting obvious prompt injection attempts (e.g., "ignore previous instructions", "you are now DAN", "jailbreak") with a 400 response before any AI processing occurs.

### Task 2: AI Tool Hardening (bb65172)

**H-3 - Canvas item sanitization:** Strategy canvas items are now passed through `sanitizePromptContent()` before being stored, preventing injection via canvas data that later gets embedded in system prompts.

**H-4 - Deep research rate limit:** Added an in-process hourly rate limit (100 executions/hour) as a cost safety net. Resets on deploy. Primary rate limiting still happens at the chat route level.

**H-5 - Document size validation:** Request suggestions tool now rejects documents over 100,000 characters to prevent context overflow attacks.

**Entitlements preparation:** Added `maxDeepResearchPerDay` field to the Entitlements type with per-tier limits (guest: 5, pending: 0, trial: 10, monthly: 50, annual: 100, lifetime: 200). Ready for when the deep research tool gains access to user context.

### Task 3: Realtime Safety, Demo Fix, Abort Signals, Minimatch (8b30cf1)

**M-3 - Realtime PII/canary scans:** Both realtime routes (`/api/realtime` and `/api/realtime/stream`) now have post-hoc PII and canary leak detection matching the main chat route pattern.

**M-12 - Demo circuit breaker fix:** The demo chat route's `onError` callback now checks `isTransientError()` before recording circuit failures. Client errors (400-404 except 429) no longer trip the circuit breaker.

**M-13/M-14 - Abort signals:** Added `AbortSignal.timeout()` to all three non-main-chat AI routes:
- Realtime route: 25s (maxDuration=30)
- Realtime stream route: 55s (maxDuration=60)
- Demo chat route: 25s (maxDuration=30)

**M-21 - Minimatch override:** Added `minimatch: ">=10.0.0"` to pnpm overrides for CVE remediation.

## Audit Findings Addressed

| Finding | Severity | Description | Status |
|---------|----------|-------------|--------|
| C-1 | Critical | PII prohibition in system prompt | Fixed |
| H-1 | High | Content moderation pattern matching | Fixed |
| H-2 | High | Smart context after security rules | Fixed |
| H-3 | High | Canvas item sanitization | Fixed |
| H-4 | High | Deep research rate limit | Fixed |
| H-5 | High | Document size validation | Fixed |
| M-3 | Medium | Realtime PII/canary scans | Fixed |
| M-4 | Medium | XML delimiter escaping | Fixed |
| M-12 | Medium | Demo circuit breaker transient check | Fixed |
| M-13/M-14 | Medium | Abort signals on 3 routes | Fixed |
| M-21 | Medium | minimatch override | Fixed |

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | 8fe7cf9 | feat(quick-9): harden prompts and add content moderation |
| 2 | bb65172 | feat(quick-9): harden AI tools with sanitization, rate limits, and size checks |
| 3 | 8b30cf1 | feat(quick-9): realtime safety scans, demo circuit breaker fix, abort signals, minimatch patch |

## Verification

- `pnpm build` passes with zero errors
- All 11 audit findings have corresponding code changes verified via grep
- No regressions to existing functionality

## Self-Check: PASSED

All 10 modified files exist. All 3 commit hashes verified in git log.
