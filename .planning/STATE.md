# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-16)

**Core value:** Founders get instant, actionable sales and marketing strategy from AI executives
**Current focus:** Phase 20 complete -- v1.3 AI Production Hardening milestone complete.

## Current Position

Phase: 20 of 20 (Observability & Cost Controls)
Plan: 2 of 2
Status: Phase complete
Last activity: 2026-02-18 -- Completed 20-02-PLAN.md (structured logging migration)

Progress: ██████████ 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 21 (11 v1.2 + 10 v1.3)
- Average duration: 4min
- Total execution time: 78min

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

## Accumulated Context

### Decisions

- AI Production Audit before v1.3: systematic issue discovery (score 58/100, grade F)
- Critical+High scope for v1.3: 31 items from 34 findings (3 merged)
- Phase 16 first: model resilience is foundation -- app breaks without it
- Phases 17 and 19 can run in parallel after 16 (no cross-dependency)
- Phase 20 last: logging migration touches files from all prior phases
- Uniform error message for doc not-found and not-yours to prevent existence leak
- Separate AbortController timeouts: 5s geocoding, 10s weather fetch
- ChatSDKError differentiation in strategyCanvas for better log triage
- Gemini 2.5 Flash (stable GA) over Gemini 3 Flash Preview for production reliability
- OpenRouter extraBody.models for native fallback (no app-level retry needed for model outages)
- 10s timeout for background AI (title/summary); 55s for streaming (under Vercel 60s limit)
- beforeInteractive strategy for theme-color script to prevent chrome color flash
- Allowlist approach for API routes -- new routes default to requiring auth (defense-in-depth)
- /api/admin/landing-page kept public (GET serves public content, POST has own isUserAdmin check)
- Reuse ChatSDKError("bad_request:api") for all realtime validation failures (consistent pattern)
- Health endpoint auth check falls through silently on failure -- never crashes health endpoint
- LanguageModelV2Middleware (AI SDK v5 type) for safety middleware -- V3 type does not exist
- Canary prefix match (ALECCI_CANARY_) for partial leak detection rather than full token match
- Credit card Luhn + card format check to reduce false positives on long digit sequences
- Post-hoc streaming scan is detection/logging only -- cannot recall already-streamed content
- Truncation banner placed after Messages component (not inside) to avoid prop drilling into memoized component
- isTruncated state stays visible until user clicks Continue or sends new message (intentional UX)
- HUMAN_ESCALATION_INSTRUCTIONS appended after KNOWLEDGE BASE OWNERSHIP in each executive prompt
- optimize_streaming_latency level 2 (not 3/4) to avoid text normalization issues with numbers/dates/currency
- Realtime route switched to streaming endpoint for lower TTFB, consistent with voice route
- Sequential generation over parallel for collaborative segments -- request stitching requires ordered request IDs
- User gesture gate (click/keydown) for greeting audio instead of setTimeout auto-play
- AICostLog as separate table (not UserAnalytics JSONB) for per-request cost granularity and per-model breakdown
- Non-blocking cost recording via after() to avoid chat response latency
- AI_DAILY_COST_THRESHOLD_USD env var with $10 default for configurable alerting
- createRequestLogger(event.id) for Stripe webhook request-scoped log correlation
- Client-side files (lib/utils.ts, lib/audio-manager.ts) intentionally left with console.* -- pino is server-only
- Error objects always logged as { err: error } key for pino serializer compatibility

### Completed

**v1.3 (Shipped 2026-02-18):** Phases 16-20, 10 plans
**v1.2 (Shipped 2026-02-11):** Phases 11-15, 11 plans
**v1.1 (Shipped 2026-02-02):** Phases 6-10, 8 plans
**Quick tasks:** 2 completed (chat animations, typewriter tuning)

### Blockers

(None)

### Notes

- Source: AI-PRODUCTION-AUDIT.md (87 findings, 31 selected for v1.3)
- v1.4 deferred: 28 medium + 25 low severity findings
- pnpm build fails locally due to missing env vars (not a code issue)
- All v1.2 migrations applied; run `pnpm gen:types` after deployment for latest types
- New API routes must be added to publicApiRoutes in lib/supabase/middleware.ts if they need unauthenticated access
- AICostLog migration needs to be applied via Supabase Dashboard SQL Editor

## Session Continuity

Last session: 2026-02-18
Stopped at: Phase 20 complete -- all v1.3 phases done
Resume: v1.3 is complete. Next milestone would be v1.4 (medium/low severity findings)
