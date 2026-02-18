# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Founders get instant, actionable sales and marketing strategy from AI executives
**Current focus:** Phase 25 (next)

## Current Position

Phase: 25 (security-performance-cost-controls)
Plan: 1 of 3
Status: In progress
Last activity: 2026-02-18 -- Completed 25-01-PLAN.md

Progress: ██████████░ 10/12 plans (83%)

## Performance Metrics

**Velocity:**
- Total plans completed: 31 (11 v1.2 + 10 v1.3 + 10 v1.4)
- Average duration: 5min
- Total execution time: 164min

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
| 25 | 1/3 | 11min | 11min |

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

### Completed

**v1.3 (Shipped 2026-02-18):** Phases 16-20, 10 plans -- AI Production Hardening
**v1.2 (Shipped 2026-02-11):** Phases 11-15, 11 plans -- Client Feedback Sweep
**v1.1 (Shipped 2026-02-02):** Phases 6-10, 8 plans -- Alexandria Requests
**Quick tasks:** 2 completed (chat animations, typewriter tuning)

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

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 25-01 (Zod error sanitization, CSP tightening, ajv patch)
Resume: `/gsd:execute-phase 25` (plan 25-02 next)
