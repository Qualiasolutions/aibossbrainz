# Requirements: AI Boss Brainz

**Defined:** 2026-02-16
**Core Value:** Founders get instant, actionable sales and marketing strategy from AI executives
**Source:** AI-PRODUCTION-AUDIT.md (scored 58/100, grade F — 10 critical, 24 high findings)

## v1.3 Requirements

Requirements for AI Production Hardening. Each maps to audit findings by ID.

### Model Resilience (RESIL)

- [ ] **RESIL-01**: AI chat has a fallback model chain — if primary model is unavailable, a secondary model handles requests (C-1)
- [ ] **RESIL-02**: AI model is pinned to a stable versioned identifier, not a preview/unstable model (C-4)
- [ ] **RESIL-03**: `generateTitleFromUserMessage` is wrapped in resilience (circuit breaker + retry + AbortController with 10s timeout) (C-6)
- [ ] **RESIL-04**: Main `streamText` call has explicit AbortController with timeout (H-1)
- [ ] **RESIL-05**: `generateConversationSummary` is wrapped in resilience (circuit breaker + retry + AbortController) (H-5)

### Safety Rails (SAFE)

- [ ] **SAFE-01**: AI responses pass through a streaming output validator that checks for PII patterns and system prompt leaks before delivery (C-2)
- [ ] **SAFE-02**: User messages are PII-redacted (SSN, credit card, etc.) before storage in Postgres (C-3)
- [ ] **SAFE-03**: `updateDocumentPrompt` sanitizes document content before injecting into system prompt (H-3)
- [ ] **SAFE-04**: AI suggests human support escalation when it cannot help (H-6)
- [ ] **SAFE-05**: When `maxOutputTokens` truncates a response, user sees a clear indicator (H-7)
- [ ] **SAFE-06**: AI-generated suggestions are validated for content safety and have length limits (H-19)

### Tool Hardening (TOOL)

- [ ] **TOOL-01**: Weather API validates `response.ok`, validates response structure, and wraps in try/catch with user-friendly error (C-7)
- [ ] **TOOL-02**: Weather API fetch has AbortController with 10s timeout (C-10)
- [ ] **TOOL-03**: `requestSuggestions` tool has explicit authorization check that doesn't leak document ID existence (H-8)
- [ ] **TOOL-04**: `strategyCanvas` tool has fast-fail auth check before DB write with specific error handling (H-9)

### Security Hardening (SEC)

- [ ] **SEC-01**: Root layout theme script uses `next/script` instead of `dangerouslySetInnerHTML` (C-8)
- [ ] **SEC-02**: Middleware has allowlist pattern for unauthenticated API routes instead of blanket bypass (H-2)
- [ ] **SEC-03**: Realtime routes validate user message with Zod (length limit, type check) (H-4)
- [ ] **SEC-04**: Health endpoint requires authentication or hides internal service names (H-10)

### Voice Quality (VOICE)

- [ ] **VOICE-01**: Collaborative multi-voice audio uses proper MP3 frame boundary detection for concatenation (C-9)
- [ ] **VOICE-02**: ElevenLabs API calls include `optimize_streaming_latency` parameter (H-15)
- [ ] **VOICE-03**: Collaborative segments use streaming TTS endpoint instead of non-streaming (H-16)
- [ ] **VOICE-04**: Realtime route uses same TTS model and voice settings as `voice-config.ts` (H-17)
- [ ] **VOICE-05**: Greeting audio respects browser autoplay policies (user gesture required) (H-18)
- [ ] **VOICE-06**: Realtime markdown stripping uses shared utility from `lib/voice/strip-markdown-tts.ts` (H-21)

### Observability (OBS)

- [ ] **OBS-01**: Stripe webhook uses structured `logger.*` calls with request IDs and user context instead of `console.log` (H-11)
- [ ] **OBS-02**: At least 80% of logging calls use structured `logger.*` instead of `console.log/error/warn` (H-12)
- [ ] **OBS-03**: AI response logging includes `inputTokens`, `outputTokens`, model ID, and cost data (H-13)
- [ ] **OBS-04**: Stack traces in error paths use `apiRequestLogger.error()` pattern (H-20)

### Cost Controls (COST)

- [ ] **COST-01**: Daily cost check mechanism alerts admin when spend thresholds are breached (C-5)
- [ ] **COST-02**: Monthly cost estimation tracks token-to-dollar conversion aggregated across users (H-14)

## v1.4 Requirements (Deferred)

Medium and low severity findings deferred from the audit.

### Medium (28 items)

- **M-1 to M-28**: Prompt sanitization gaps, rate limit metric mismatches, GDPR export fallback, Stripe idempotency improvements, circuit breaker persistence, memory leak fixes, demo route hardening, error detail exposure, focus mode persistence, analytics hardcoded values, stream error logging, speech recognition locale, TTS caching, concurrency limits

### Low (25 items)

- **L-1 to L-25**: Sanitizer edge cases, demo CSRF, health endpoint client, webhook maxDuration, dead-letter queue, demo rate limiting, AI provider health check, retryable error classification, circuit breaker error recording, tool/system prompt consistency, subscription-gated tools, env validation bypass, CSP unsafe-inline, env var logging, persona context transition, timeout handling, message detection threshold, brevity mode suggestions, Sentry sample rate, analytics column types, abort signal cleanup, base64 encoding overhead, TTS truncation notification

## Out of Scope

| Feature | Reason |
|---------|--------|
| RAG/embeddings system | No embeddings in codebase; Agent 7 skipped |
| Full OWASP audit | Separate engagement; auth/RLS already passing |
| Performance optimization | Separate milestone focus |
| New features | v1.3 is hardening only |
| Informational findings (Agent 12) | Code-splitting and loading states — low impact |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RESIL-01 | — | Pending |
| RESIL-02 | — | Pending |
| RESIL-03 | — | Pending |
| RESIL-04 | — | Pending |
| RESIL-05 | — | Pending |
| SAFE-01 | — | Pending |
| SAFE-02 | — | Pending |
| SAFE-03 | — | Pending |
| SAFE-04 | — | Pending |
| SAFE-05 | — | Pending |
| SAFE-06 | — | Pending |
| TOOL-01 | — | Pending |
| TOOL-02 | — | Pending |
| TOOL-03 | — | Pending |
| TOOL-04 | — | Pending |
| SEC-01 | — | Pending |
| SEC-02 | — | Pending |
| SEC-03 | — | Pending |
| SEC-04 | — | Pending |
| VOICE-01 | — | Pending |
| VOICE-02 | — | Pending |
| VOICE-03 | — | Pending |
| VOICE-04 | — | Pending |
| VOICE-05 | — | Pending |
| VOICE-06 | — | Pending |
| OBS-01 | — | Pending |
| OBS-02 | — | Pending |
| OBS-03 | — | Pending |
| OBS-04 | — | Pending |
| COST-01 | — | Pending |
| COST-02 | — | Pending |

**Coverage:**
- v1.3 requirements: 31 total
- Mapped to phases: 0
- Unmapped: 31

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-16 after initial definition*
