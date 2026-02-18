# Roadmap: AI Boss Brainz

## Milestones

- v1.0 MVP - Phases 1-5 (shipped)
- v1.1 Branding & Billing - Phases 6-10 (shipped 2026-02-02)
- v1.2 Client Feedback Sweep - Phases 11-15 (shipped 2026-02-11)
- v1.3 AI Production Hardening - Phases 16-20 (shipped 2026-02-18)

## Overview

v1.3 remediates all critical and high-severity findings from the AI Production Audit (score 58/100, grade F). The milestone hardens model resilience and tool reliability first (the app breaks without these), then locks down security surfaces, adds safety rails for AI output, fixes the voice subsystem, and finishes with observability and cost controls that benefit from all other fixes being in place. 31 requirements across 5 phases.

## Phases

- [x] **Phase 16: Model Resilience & Tool Hardening** - Fallback model chain, version pinning, resilience wrappers, weather API fixes
- [x] **Phase 17: Security Hardening** - XSS removal, middleware auth allowlist, input validation, health endpoint lockdown
- [x] **Phase 18: Safety Rails** - Output filtering, PII redaction, prompt sanitization, human escalation, truncation indicators
- [x] **Phase 19: Voice Quality** - MP3 frame concatenation, streaming TTS, config alignment, autoplay policies
- [x] **Phase 20: Observability & Cost Controls** - Structured logging migration, AI metrics, cost alerting and tracking

## Phase Details

### Phase 16: Model Resilience & Tool Hardening
**Goal**: AI chat survives model outages gracefully and all tool invocations fail safely with user-friendly errors
**Depends on**: Nothing (first phase of v1.3)
**Requirements**: RESIL-01, RESIL-02, RESIL-03, RESIL-04, RESIL-05, TOOL-01, TOOL-02, TOOL-03, TOOL-04
**Success Criteria** (what must be TRUE):
  1. When the primary AI model is unavailable, chat automatically falls back to a secondary model and the user gets a response (not an error)
  2. The AI model identifier in `providers.ts` is a stable versioned ID, not a preview/unstable slug
  3. Title generation and conversation summary calls cannot hang indefinitely -- they timeout after 10s and surface a graceful fallback
  4. Weather tool errors (network failure, bad response, timeout) show a user-friendly message instead of crashing the chat
  5. Tool calls to `requestSuggestions` and `strategyCanvas` reject unauthorized users without leaking resource existence
**Plans:** 2 plans

Plans:
- [x] 16-01-PLAN.md — Model resilience: stable IDs, fallback chain, title/summary resilience wrappers, streamText timeout
- [x] 16-02-PLAN.md — Tool hardening: weather API error handling, requestSuggestions/strategyCanvas auth checks

### Phase 17: Security Hardening
**Goal**: Known XSS vectors, auth bypasses, and information leaks in middleware and endpoints are closed
**Depends on**: Phase 16
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):
  1. Root layout theme initialization uses `next/script` with no `dangerouslySetInnerHTML` anywhere in layout files
  2. Middleware uses an explicit allowlist of public API routes -- unknown routes require authentication by default
  3. Realtime endpoint rejects messages that fail Zod validation (too long, wrong type) with a 400 response
  4. Health endpoint either requires auth or returns only a status boolean with no internal service names
**Plans:** 2 plans

Plans:
- [x] 17-01-PLAN.md — XSS removal (next/script) and middleware API route allowlist
- [x] 17-02-PLAN.md — Realtime Zod validation and health endpoint two-tier response

### Phase 18: Safety Rails
**Goal**: AI responses are filtered for safety, user PII is redacted before storage, and edge cases (truncation, inability to help) are handled gracefully
**Depends on**: Phase 16 (model must be resilient before adding output filtering on top)
**Requirements**: SAFE-01, SAFE-02, SAFE-03, SAFE-04, SAFE-05, SAFE-06
**Success Criteria** (what must be TRUE):
  1. If a user pastes a credit card number or SSN into chat, it is redacted to `[REDACTED]` before being stored in Postgres
  2. Non-streaming AI output (titles, summaries) has PII redacted before delivery; streaming responses are scanned post-completion with canary leak and PII detection logged as security events
  3. When the AI cannot adequately help (repeated failures, out-of-domain queries), it suggests contacting human support with a link or email
  4. When a response hits `maxOutputTokens` and is truncated, the user sees a clear "Response was truncated" indicator with an option to continue
  5. AI-generated follow-up suggestions are validated for length limits and do not contain unsafe content
**Plans:** 2 plans

Plans:
- [x] 18-01-PLAN.md — PII redaction infrastructure, canary leak detection, safety middleware, message storage redaction, document prompt sanitization
- [x] 18-02-PLAN.md — Truncation detection with UI indicator, human escalation in system prompt, suggestion content validation

### Phase 19: Voice Quality
**Goal**: Voice playback produces clean audio with correct personas, optimized latency, and proper browser compatibility
**Depends on**: Nothing (self-contained voice subsystem, can run after Phase 16)
**Requirements**: VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05, VOICE-06
**Success Criteria** (what must be TRUE):
  1. Collaborative mode multi-voice audio plays without glitches at segment boundaries (proper MP3 frame detection, no pops/clicks)
  2. ElevenLabs API calls use `optimize_streaming_latency` and collaborative segments use the streaming TTS endpoint for faster first-byte
  3. Realtime route produces audio with the same voice model and settings as defined in `voice-config.ts` (no config drift)
  4. Greeting audio does not auto-play on page load -- it requires a user gesture (click/tap) to comply with browser autoplay policies
  5. All TTS text preprocessing uses the shared `lib/voice/strip-markdown-tts.ts` utility (no duplicate stripping logic)
**Plans:** 2 plans

Plans:
- [x] 19-01-PLAN.md — Config drift fix, shared markdown stripping, optimize_streaming_latency across all routes
- [x] 19-02-PLAN.md — Request stitching for collaborative audio quality, streaming endpoint for collab segments, user gesture gate for greeting

### Phase 20: Observability & Cost Controls
**Goal**: Application has structured logging throughout, AI usage is tracked with cost data, and spend alerts prevent bill shock
**Depends on**: Phases 16-19 (logging migration touches files modified by all prior phases; cost tracking benefits from stable AI layer)
**Requirements**: OBS-01, OBS-02, OBS-03, OBS-04, COST-01, COST-02
**Success Criteria** (what must be TRUE):
  1. Stripe webhook handler uses structured `logger.*` calls with request IDs and user context -- no `console.log` remaining
  2. At least 80% of all logging calls across the codebase use structured `logger.*` instead of `console.log/error/warn`
  3. Every AI response log entry includes `inputTokens`, `outputTokens`, model ID, and estimated cost in USD
  4. When daily AI spend crosses a configurable threshold, an admin notification is sent (email or structured log alert)
  5. A monthly cost dashboard or API endpoint aggregates token-to-dollar conversion across all users
**Plans:** 2 plans

Plans:
- [x] 20-01-PLAN.md — Cost infrastructure (AICostLog table, cost tracker, chat route cost recording, Stripe webhook logging migration, cost cron, cost dashboard API)
- [x] 20-02-PLAN.md — Broad structured logging migration across all remaining server-side files (98% achieved)

## Progress

**Execution Order:**
Phase 16 first (critical infrastructure), then 17, 18, 19, 20. Phases 17 and 19 have no cross-dependency and could run in parallel after 16.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 16. Model Resilience & Tool Hardening | v1.3 | 2/2 | Complete | 2026-02-16 |
| 17. Security Hardening | v1.3 | 2/2 | Complete | 2026-02-16 |
| 18. Safety Rails | v1.3 | 2/2 | Complete | 2026-02-16 |
| 19. Voice Quality | v1.3 | 2/2 | Complete | 2026-02-17 |
| 20. Observability & Cost Controls | v1.3 | 2/2 | Complete | 2026-02-18 |

---
*Roadmap created: 2026-02-16*
*Last updated: 2026-02-18 (Phase 20 complete -- v1.3 milestone shipped)*
