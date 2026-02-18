# Requirements: AI Boss Brainz

**Defined:** 2026-02-18
**Core Value:** Founders get instant, actionable sales and marketing strategy from AI executives who remember context and deliver frameworks-based guidance.

## v1.4 Requirements

Requirements for AI Production Audit completion. All findings from audit report systematically addressed.

### Prompt Security

- [ ] **PROMPT-01**: Fix title generation prompt injection (M-1) - sanitize user messages in title prompts
- [ ] **PROMPT-02**: Fix document title injection (M-2) - sanitize artifact generation prompts
- [ ] **PROMPT-03**: Fix personalization context injection (M-3) - sanitize user profile/canvas data
- [ ] **PROMPT-04**: Fix conversation summarizer injection (M-4) - sanitize conversation text input
- [ ] **PROMPT-05**: Add demo chat safety middleware (M-5) - canary tokens and PII scanning
- [ ] **PROMPT-06**: Sanitize request suggestions content (L-1) - XML wrapping for document content
- [ ] **PROMPT-07**: Extend sanitizePromptContent blocklist (L-2) - cover system tags and role markers
- [ ] **PROMPT-08**: Hash canary token generation (L-3) - use SHA256 instead of raw secret prefix
- [ ] **PROMPT-09**: Document streaming PII bypass limitation (L-4) - update docs on detection-only nature

### Auth & Subscription

- [ ] **AUTH-01**: Add subscription check to voice API (M-6) - prevent expired users from TTS generation
- [ ] **AUTH-02**: Add subscription check to realtime endpoints (M-7) - prevent expired voice chat access
- [ ] **AUTH-03**: Fix voice rate limit DB fallback (L-5) - track voice requests not chat messages
- [ ] **AUTH-04**: Add CSRF protection to demo chat (L-6) - prevent cross-origin abuse
- [ ] **AUTH-05**: Fix export rate limit DB fallback (L-7) - query AuditLog entries when Redis down

### Model Resilience

- [ ] **RESIL-01**: Add OpenRouter rate limit header parsing (M-12) - respect retry-after values
- [ ] **RESIL-02**: Implement provider-level fallback (M-13) - secondary provider when OpenRouter down
- [ ] **RESIL-03**: Add collaborative voice error isolation (M-14) - per-segment error handling
- [ ] **RESIL-04**: Add Zod validation to conversation summarizer (L-11) - schema validation for AI JSON
- [ ] **RESIL-05**: Add OpenRouter probe to health check (L-12) - verify AI provider reachability
- [ ] **RESIL-06**: Fix circuit breaker error classification (L-13) - only record transient failures

### Voice & Realtime

- [ ] **VOICE-01**: Implement TTS caching system (M-15) - cache repeated audio generation
- [ ] **VOICE-02**: Add rate limiting to realtime route (M-16) - prevent unbounded AI/TTS costs
- [ ] **VOICE-03**: Optimize realtime audio streaming (M-17) - avoid base64 data URLs

### Webhook Reliability

- [ ] **WEBHOOK-01**: Add maxDuration to Stripe webhook (M-8) - prevent Vercel timeout
- [ ] **WEBHOOK-02**: Implement event-ID deduplication (M-9) - true idempotency for Stripe events
- [ ] **WEBHOOK-03**: Add idempotency to subscription.updated (M-10) - prevent redundant updates
- [ ] **WEBHOOK-04**: Add idempotency to invoice.paid (M-11) - prevent date drift
- [ ] **WEBHOOK-05**: Fix webhook race conditions (L-8) - database locking for concurrent events
- [ ] **WEBHOOK-06**: Add dead-letter queue for failures (L-9) - persistent failure tracking
- [ ] **WEBHOOK-07**: Add webhook endpoint rate limiting (L-10) - prevent DoS via signed events

### Security & Validation

- [ ] **SEC-01**: Fix Zod error detail leaks (L-14) - return generic validation errors to clients
- [ ] **SEC-02**: Tighten CSP unsafe-inline policy (L-15) - consider nonces/hashes for scripts
- [ ] **SEC-03**: Update ajv dependency vulnerability (L-16) - upgrade when Sentry updates

### Performance & Cost

- [ ] **PERF-01**: Add message pagination to chat page (L-17) - limit initial message load
- [ ] **PERF-02**: Optimize conversation summary frequency (L-18) - interval-based generation
- [ ] **PERF-03**: Add message rollback on stream failure (L-19) - clean up dangling messages
- [ ] **COST-01**: Pin model versions with date suffixes (L-20) - prevent silent version drift
- [ ] **COST-02**: Align model documentation (L-21) - fix Gemini version references
- [ ] **COST-03**: Add cost tracking to demo chat (L-22) - log token usage
- [ ] **COST-04**: Implement per-user spending alerts (L-23) - daily/monthly cost aggregation

### Documentation & Info

- [ ] **DOC-01**: Document updateDocumentPrompt code handling (I-1) - clarify intentional trade-off
- [ ] **DOC-02**: Document CSRF token design (I-2) - explain unauthenticated endpoint rationale
- [ ] **DOC-03**: Document subscription GET behavior (I-3) - clarify graceful unauthenticated return
- [ ] **DOC-04**: Consider payment failure notifications (I-4) - user visibility for failed payments
- [ ] **DOC-05**: Document stream recovery Redis requirement (I-5) - clarify resumable limitations
- [ ] **DOC-06**: Consider focus mode persistence (I-6) - evaluate localStorage vs database storage
- [ ] **DOC-07**: Update CLAUDE.md focus modes (I-7) - align with actual implementation
- [ ] **DOC-08**: Acknowledge Supabase ID exposure (I-8) - confirm by-design public nature
- [ ] **DOC-09**: Consider XSS-Protection header (I-9) - disable buggy auditor in old browsers
- [ ] **DOC-10**: Consider ElevenLabs cost tracking (I-10) - evaluate character-based logging

## v2 Requirements

Deferred to future release.

### Advanced Features
- **VOICE-04**: Real-time voice conversation streaming
- **AI-01**: Multi-model AI provider switching UI
- **ADMIN-01**: Webhook event replay dashboard
- **PERF-05**: Advanced conversation virtualization

## Out of Scope

Explicitly excluded for this milestone.

| Feature | Reason |
|---------|--------|
| New audit categories | Focus on completing existing findings |
| UI/UX improvements | Pure remediation milestone, no user-facing changes |
| Performance benchmarking | Fix implementation first, measure after |
| Additional safety rules | Current safety rails already comprehensive |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROMPT-01 | Phase 21 | Pending |
| PROMPT-02 | Phase 21 | Pending |
| PROMPT-03 | Phase 21 | Pending |
| PROMPT-04 | Phase 21 | Pending |
| PROMPT-05 | Phase 21 | Pending |
| PROMPT-06 | Phase 21 | Pending |
| PROMPT-07 | Phase 21 | Pending |
| PROMPT-08 | Phase 21 | Pending |
| PROMPT-09 | Phase 21 | Pending |
| AUTH-01 | Phase 22 | Pending |
| AUTH-02 | Phase 22 | Pending |
| AUTH-03 | Phase 22 | Pending |
| AUTH-04 | Phase 22 | Pending |
| AUTH-05 | Phase 22 | Pending |
| WEBHOOK-01 | Phase 23 | Pending |
| WEBHOOK-02 | Phase 23 | Pending |
| WEBHOOK-03 | Phase 23 | Pending |
| WEBHOOK-04 | Phase 23 | Pending |
| WEBHOOK-05 | Phase 23 | Pending |
| WEBHOOK-06 | Phase 23 | Pending |
| WEBHOOK-07 | Phase 23 | Pending |
| RESIL-01 | Phase 24 | Pending |
| RESIL-02 | Phase 24 | Pending |
| RESIL-03 | Phase 24 | Pending |
| RESIL-04 | Phase 24 | Pending |
| RESIL-05 | Phase 24 | Pending |
| RESIL-06 | Phase 24 | Pending |
| VOICE-01 | Phase 24 | Pending |
| VOICE-02 | Phase 24 | Pending |
| VOICE-03 | Phase 24 | Pending |
| SEC-01 | Phase 25 | Pending |
| SEC-02 | Phase 25 | Pending |
| SEC-03 | Phase 25 | Pending |
| PERF-01 | Phase 25 | Pending |
| PERF-02 | Phase 25 | Pending |
| PERF-03 | Phase 25 | Pending |
| COST-01 | Phase 25 | Pending |
| COST-02 | Phase 25 | Pending |
| COST-03 | Phase 25 | Pending |
| COST-04 | Phase 25 | Pending |
| DOC-01 | Phase 26 | Pending |
| DOC-02 | Phase 26 | Pending |
| DOC-03 | Phase 26 | Pending |
| DOC-04 | Phase 26 | Pending |
| DOC-05 | Phase 26 | Pending |
| DOC-06 | Phase 26 | Pending |
| DOC-07 | Phase 26 | Pending |
| DOC-08 | Phase 26 | Pending |
| DOC-09 | Phase 26 | Pending |
| DOC-10 | Phase 26 | Pending |

**Coverage:**
- v1.4 requirements: 50 total
- Mapped to phases: 50
- Unmapped: 0

---
*Requirements defined: 2026-02-18*
*Last updated: 2026-02-18 after roadmap creation*
