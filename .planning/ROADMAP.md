# Roadmap: AI Boss Brainz

## Milestones

- v1.0 MVP (Phases 1-5) - shipped
- v1.1 Alexandria Requests (Phases 6-10) - shipped
- v1.2 Client Feedback Sweep (Phases 11-15) - shipped
- v1.3 AI Production Hardening (Phases 16-20) - shipped
- **v1.4 AI Production Audit Completion** (Phases 21-26) - in progress

## Overview

v1.4 systematically remediates the remaining 50 findings from the AI Production Audit -- 17 medium-severity and 33 low/informational items. Work is organized by security domain: prompt injection hardening first (highest user-facing risk), then auth/subscription gaps, webhook reliability, model resilience with voice optimization, general security/performance tuning, and finally documentation of design decisions. Target: push audit score from 87/100 to 90+ (A-grade).

## Phases

- [x] **Phase 21: Prompt Security Hardening** - Eliminate prompt injection vectors across all AI entry points
- [ ] **Phase 22: Auth & Subscription Guards** - Close subscription enforcement gaps on voice/realtime endpoints
- [ ] **Phase 23: Webhook Reliability** - Achieve true idempotency and failure resilience for Stripe webhooks
- [ ] **Phase 24: Model Resilience & Voice Optimization** - Harden AI provider failover and optimize voice cost/latency
- [ ] **Phase 25: Security, Performance & Cost Controls** - Tighten validation, add pagination, pin model versions
- [ ] **Phase 26: Documentation & Design Decisions** - Document trade-offs and informational findings

## Phase Details

### Phase 21: Prompt Security Hardening
**Goal**: All AI prompt paths sanitize user-controlled input, preventing injection from manipulating AI behavior
**Depends on**: Nothing (first phase -- highest risk items)
**Requirements**: PROMPT-01, PROMPT-02, PROMPT-03, PROMPT-04, PROMPT-05, PROMPT-06, PROMPT-07, PROMPT-08, PROMPT-09
**Success Criteria** (what must be TRUE):
  1. User-controlled text in title generation, document creation, personalization, and conversation summarization is sanitized through `sanitizePromptContent()` before reaching any AI prompt
  2. Demo chat route applies the same safety middleware (canary tokens, PII scanning) as the main chat route
  3. Request suggestions wrap document content in XML delimiters to prevent injection
  4. Canary token generation uses SHA256 hashing instead of raw secret prefix
  5. Streaming PII bypass limitation is documented in codebase comments and CLAUDE.md
**Plans**: 2 plans

Plans:
- [x] 21-01-PLAN.md — Sanitize medium-severity prompt injection vectors (PROMPT-01 through PROMPT-05)
- [x] 21-02-PLAN.md — Low-severity prompt hardening: blocklist, suggestions, canary hash, docs (PROMPT-06 through PROMPT-09)

### Phase 22: Auth & Subscription Guards
**Goal**: Expired/unauthorized users cannot consume paid voice and realtime resources
**Depends on**: Nothing (independent of Phase 21)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. Voice TTS endpoint rejects requests from users with expired subscriptions
  2. Realtime voice chat endpoints reject requests from users with expired subscriptions
  3. Voice rate limiting tracks actual voice requests (not chat messages) in DB fallback mode
  4. Demo chat endpoint has CSRF protection preventing cross-origin abuse
  5. Export rate limiting queries AuditLog entries when Redis is unavailable
**Plans**: 1 plan

Plans:
- [ ] 22-01-PLAN.md — Subscription enforcement, rate limit DB fallback fixes, and demo CSRF protection (AUTH-01 through AUTH-05)

### Phase 23: Webhook Reliability
**Goal**: Stripe webhook processing is idempotent, race-condition-free, and failure-resilient
**Depends on**: Nothing (independent)
**Requirements**: WEBHOOK-01, WEBHOOK-02, WEBHOOK-03, WEBHOOK-04, WEBHOOK-05, WEBHOOK-06, WEBHOOK-07
**Success Criteria** (what must be TRUE):
  1. Stripe webhook route has `maxDuration` configured to prevent Vercel timeout on slow processing
  2. Duplicate Stripe events (same event ID) are detected and skipped without side effects
  3. Concurrent webhook events for the same user are serialized via database locking
  4. Failed webhook events are persisted to a dead-letter table for later inspection/replay
  5. Webhook endpoint has rate limiting to prevent DoS via high-volume signed events
**Plans**: TBD

Plans:
- [ ] 23-01: Webhook idempotency and timeout fixes (M-8 through M-11)
- [ ] 23-02: Webhook race conditions, dead-letter queue, and rate limiting (L-8 through L-10)

### Phase 24: Model Resilience & Voice Optimization
**Goal**: AI responses survive provider outages gracefully and voice features are cost-optimized
**Depends on**: Phase 22 (subscription checks should exist before optimizing voice paths)
**Requirements**: RESIL-01, RESIL-02, RESIL-03, RESIL-04, RESIL-05, RESIL-06, VOICE-01, VOICE-02, VOICE-03
**Success Criteria** (what must be TRUE):
  1. Application respects OpenRouter `retry-after` headers instead of hammering a rate-limited provider
  2. When OpenRouter is completely down, a secondary AI provider serves requests (degraded but functional)
  3. Collaborative voice generation isolates errors per-segment so one failure does not kill the entire response
  4. Repeated TTS requests for identical text return cached audio instead of regenerating
  5. Health check endpoint probes OpenRouter reachability and reports AI provider status
**Plans**: TBD

Plans:
- [ ] 24-01: OpenRouter resilience and provider fallback
- [ ] 24-02: Voice caching, rate limiting, and streaming optimization

### Phase 25: Security, Performance & Cost Controls
**Goal**: Validation is tight, chat loads fast, and model versions are pinned for cost predictability
**Depends on**: Nothing (independent low-severity improvements)
**Requirements**: SEC-01, SEC-02, SEC-03, PERF-01, PERF-02, PERF-03, COST-01, COST-02, COST-03, COST-04
**Success Criteria** (what must be TRUE):
  1. API validation errors return generic messages without leaking Zod schema details to clients
  2. Chat page loads initial messages via pagination (not full history), with older messages loaded on demand
  3. Model versions are pinned with date suffixes in provider configuration, preventing silent drift
  4. Demo chat logs token usage for cost tracking
  5. Per-user spending alerts aggregate daily/monthly costs and flag anomalies
**Plans**: TBD

Plans:
- [ ] 25-01: Security validation and CSP tightening
- [ ] 25-02: Chat pagination, summary optimization, and stream failure cleanup
- [ ] 25-03: Model pinning, documentation alignment, and cost tracking

### Phase 26: Documentation & Design Decisions
**Goal**: All informational audit findings are documented as intentional design decisions or considered enhancements
**Depends on**: Phases 21-25 (documents decisions made during implementation)
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06, DOC-07, DOC-08, DOC-09, DOC-10
**Success Criteria** (what must be TRUE):
  1. Code comments or CLAUDE.md explain intentional trade-offs for updateDocumentPrompt, CSRF token design, subscription GET behavior, and Supabase ID exposure
  2. Stream recovery Redis requirement and resumable stream limitations are documented
  3. Focus mode persistence options (localStorage vs database) are evaluated and decision recorded
  4. CLAUDE.md focus modes list matches actual implementation
  5. ElevenLabs cost tracking and payment failure notification considerations are documented with accept/defer decisions
**Plans**: TBD

Plans:
- [ ] 26-01: Code and architecture documentation updates

## Progress

**Execution Order:** 21 -> 22 -> 23 -> 24 -> 25 -> 26

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 21. Prompt Security Hardening | 2/2 | Complete | 2026-02-18 |
| 22. Auth & Subscription Guards | 0/1 | Not started | - |
| 23. Webhook Reliability | 0/2 | Not started | - |
| 24. Model Resilience & Voice | 0/2 | Not started | - |
| 25. Security, Performance & Cost | 0/3 | Not started | - |
| 26. Documentation & Decisions | 0/1 | Not started | - |
