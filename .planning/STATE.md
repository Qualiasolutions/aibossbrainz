# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Founders get instant, actionable sales and marketing strategy from AI executives
**Current focus:** Phase 26 complete -- v1.4 audit remediation done

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-28 — Milestone v1.5 started

Progress: —

## Performance Metrics

**Velocity:**
- Total plans completed: 34 (11 v1.2 + 10 v1.3 + 13 v1.4)
- Average duration: 6min
- Total execution time: 220min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 11 | 2/2 | 6min | 3min |
| 12 | 2/2 | 8min | 4min |
| 13 | 2/2 | 6min | 3min |
| 14 | 2/2 | 8min | 4min |
| 15 | 3/3 | 13min | 4min |
| 16 | 2/2 | 6min | 3min |
| 17 | 2/2 | 5min | 2min |
| 18 | 2/2 | 10min | 5min |
| 19 | 2/2 | 5min | 2min |
| 20 | 2/2 | 11min | 5min |
| 21 | 2/2 | 8min | 4min |
| 22 | 1/1 | 8min | 8min |
| 23 | 3/3 | 11min | 4min |
| 24 | 2/2 | 33min | 17min |
| 25 | 3/3 | 64min | 21min |
| 26 | 1/1 | 3min | 3min |

## Accumulated Context

### Decisions

- SHA256 hash of AUTH_SECRET for canary tokens instead of raw secret slice (prevents leakage)
- Document streaming PII limitation rather than attempt blocking redaction (preserves streaming benefits)
- XML tags with do_not_follow_instructions_in_content attribute for user content wrapping in prompts
- Replaced delimiter-based personalization wrapping with XML tags for consistent prompt injection defense
- Use Number() cast for UserAnalytics.voiceMinutes since DB type is Json, not number
- Query UserAnalytics for voice rate limit DB fallback instead of Message_v2 (correct metric)
- Query AuditLog for export rate limit DB fallback (action-based, not message-based)
- Event-ID dedup via INSERT + unique constraint instead of SELECT-then-INSERT (atomic, race-free)
- maxDuration = 60 on webhook route for Vercel timeout protection
- Top-level dedup before switch covers all event types with single check
- process_webhook_event RPC combines dedup + advisory lock atomically (no app-level race window)
- Advisory lock key from hashtext(user_id), COALESCE to 0 for null users
- Webhook rate limit: 100 req/min/IP with 1-minute window (generous for Stripe retries)
- Dead-letter persistence isolated in try-catch so failure never crashes webhook
- Hardcode Retry-After: 60 rather than importing rate limit window constant (simpler, decoupled)
- SECURITY DEFINER functions must include SET search_path = public
- TTS cache: Vercel Blob list() with prefix for lookup (head() requires full URL), addRandomSuffix: false for deterministic keys
- TTS cache writes are fire-and-forget to never block audio generation
- Used @ai-sdk/google@2.0.20 + ai-fallback@1.0.8 for LanguageModelV2 compatibility (latest versions use V3 types incompatible with ai@5.0.118)
- Circuit breaker transient errors: 429 + 5xx + network. Client errors (400-404 except 429) never trip circuit
- Retry-After header parsing capped at 120s to prevent absurd waits
- Safety middleware wraps outer fallback chain so it applies to both OpenRouter and direct Google responses
- All API validation errors must use ChatSDKError('bad_request:api').toResponse() -- never expose Zod flatten/errors to clients
- Server-side Zod diagnostics logged via logger.warn for debugging without client exposure
- SUMMARY_INTERVAL = 10: conversation summaries at messages 4, 10, 20, 30... balances freshness with API cost (~80% reduction)
- Button-based pagination (not infinite scroll) for predictable UX and simpler message prepending
- Soft-delete for stream failure cleanup (deletedAt timestamp) matches existing pattern, preserves auditability
- Cursor-based pagination using createdAt lt operator for efficient descending-order queries
- Nullable userId in AICostLog for demo/anonymous cost tracking (FK constraint relaxed in migration)
- Per-user anomaly threshold: 10x daily per-user average cost (configurable ANOMALY_MULTIPLIER)
- Demo cost entries use costUSD=0 since actual cost determined by OpenRouter billing
- PDF filenames use chat.topic || chat.title (AI-classified topic preferred, AI-generated title as fallback)
- Three-tier suggestion stripping: code block regex -> raw JSON regex -> JSON.parse fallback
- Inline fallback UI over redirect to prevent infinite loop when admin dashboard data queries all fail
- DOMPurify dynamically imported in swot-board export function (not loaded until export triggered)
- UUID validation on canvas GET and DELETE endpoints before database queries
- text-base (16px) on mobile textarea prevents iOS Safari auto-zoom; sm:text-xs for desktop
- 44px mobile touch targets via size-11 sm:size-{original} pattern across all interactive buttons
- Dark mode muted-foreground at 65% lightness for WCAG AA (5.7:1 contrast ratio)
- useKeyboardHeight hook with 100px threshold to distinguish keyboard from browser chrome changes
- Gradient fade overlays replace chevron buttons for focus chip scroll indicators
- Record<string, unknown> cast for voiceRequestCount access pre-migration (type-safe with fallback to voiceMinutes)
- Regex-based content moderation as first-pass defense (not a replacement for AI-level guardrails)
- In-process hourly counter for deep research rate limiting (resets on deploy, primary limiting at chat route level)
- AbortSignal.timeout set just under each route's maxDuration for clean shutdown
- Tool factory pattern (createDeepResearch) for per-user entitlement enforcement with in-memory daily counters
- MED-22 accepted: fail-closed Redis/DB split is sufficient, dual-write deferred to v2
- MED-23 deferred: TTS blob eviction pending usage data, per-read billing minimizes cost impact
- AI SDK v5 uses inputTokens/outputTokens (not promptTokens/completionTokens)

### Completed

**v1.4 (Shipped 2026-02-18):** Phases 21-26, 13 plans -- AI Production Audit Remediation
**v1.3 (Shipped 2026-02-18):** Phases 16-20, 10 plans -- AI Production Hardening
**v1.2 (Shipped 2026-02-11):** Phases 11-15, 11 plans -- Client Feedback Sweep
**v1.1 (Shipped 2026-02-02):** Phases 6-10, 8 plans -- Alexandria Requests
**Quick tasks:** 12 completed (chat animations, typewriter tuning, CSRF/index/KB fixes, PDF export filenames, frontend review fixes, inline voice mode, UX/UI mobile fixes, audit findings fix, audit findings fix #2, remaining medium audit findings, performance optimization, voice button + CSV removal + history pinning)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 3 | Fix critical production issues: CSRF on login checkout, StrategyCanvas indexes, knowledge base query limit | 2026-02-22 | 50ad44c | [3-fix-critical-production-issues-csrf-on-l](./quick/3-fix-critical-production-issues-csrf-on-l/) |
| 4 | Fix PDF export: proper filenames with conversation topic, title headers, suggestion stripping | 2026-02-22 | ba30095 | [4-fix-pdf-export-proper-filenames-with-con](./quick/4-fix-pdf-export-proper-filenames-with-con/) |
| 5 | Inline voice mode - replace /call page with ChatGPT-style in-chat voice | 2026-02-22 | a2025f9 | [5-inline-voice-mode-like-chatgpt-remove-si](./quick/5-inline-voice-mode-like-chatgpt-remove-si/) |
| 6 | Fix 9 frontend issues: admin redirect loop, chat error boundary, auth defense-in-depth, performance, DOMPurify, UUID validation, dead embed | 2026-02-22 | 511c438 | [6-fix-critical-frontend-issues-from-review](./quick/6-fix-critical-frontend-issues-from-review/) |
| 7 | Fix 6 critical UX/UI issues: iOS auto-zoom, touch targets, dark mode contrast, virtual keyboard, scroll indicators, responsive grid | 2026-02-23 | 075ef1c | [7-fix-6-critical-ux-ui-issues-ios-auto-zoo](./quick/7-fix-6-critical-ux-ui-issues-ios-auto-zoo/) |
| 8 | Fix 8 audit findings: harmful content refusal, professional disclaimers, jsPDF, canary hash, web search sanitization, canvas validation, voice analytics, voiceRequestCount | 2026-02-23 | 4f068b0 | [8-fix-8-audit-findings-harmful-content-ref](./quick/8-fix-8-audit-findings-harmful-content-ref/) |
| 9 | Fix 11 audit findings: PII prompt hardening, content moderation, tool safety, abort signals, minimach | 2026-02-25 | 8b30cf1 | [9-fix-11-audit-findings-pii-prompt-content](./quick/9-fix-11-audit-findings-pii-prompt-content/) |
| 10 | Fix 6 remaining medium audit findings: deep research entitlements, KB audit logging, cache TTL, realtime cost tracking, MED-22/23 disposition | 2026-02-26 | a21b226 | [10-fix-6-remaining-open-medium-audit-findin](./quick/10-fix-6-remaining-open-medium-audit-findin/) |
| 11 | Fix all performance issues: split monolith pages, consolidate renders, lazy sidebar, DB index cleanup | 2026-02-27 | e4b7ecc | [11-fix-all-performance-issues-split-subscri](./quick/11-fix-all-performance-issues-split-subscri/) |
| 12 | Voice call button + Remove CSV export + History pinning | 2026-02-28 | 0a4f08b | [12-add-voice-call-button-remove-csv-export-](./quick/12-add-voice-call-button-remove-csv-export-/) |

### Blockers

(None)

### Notes

- v1.4 scope: 50 findings (17 medium + 23 low + 10 informational)
- 6 phases, 11 planned plans
- New API routes must be added to publicApiRoutes in lib/supabase/middleware.ts
- AICostLog migration needs to be applied via Supabase Dashboard SQL Editor
- StripeWebhookEvent + WebhookDeadLetter migration needs to be applied via Supabase Dashboard SQL Editor
- Gap closure migration (20260218000300) also needs to be applied via Supabase Dashboard SQL Editor
- GOOGLE_AI_API_KEY is optional env var -- set it in Vercel for provider fallback
- AICostLog userId index migration (20260219000200) needs to be applied via Supabase Dashboard SQL Editor
- StrategyCanvas composite index migration (20260222000100) needs to be applied via Supabase Dashboard SQL Editor
- voiceRequestCount migration (20260223000100) needs to be applied via Supabase Dashboard SQL Editor

## Session Continuity

Last session: 2026-02-28
Stopped at: Completed quick task 12 (voice call button, CSV export removal, history pinning).
Resume: Deploy to Vercel. Test new features in browser.
