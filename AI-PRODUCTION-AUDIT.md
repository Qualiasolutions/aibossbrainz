# AI Production Audit Report

**Project**: Alecci Media AI Chatbot (BossBrainz)
**Type**: HYBRID (Chat + Voice via ElevenLabs TTS)
**Date**: 2026-02-23
**Overall Score**: 88/100 **B (Minor Issues)**

Grade scale: 90+ = A (Production Ready), 80-89 = B (Minor Issues), 70-79 = C (Significant Issues), 60-69 = D (Major Issues), <60 = F (Not Production Ready)

---

## Stack Detected

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15.6+ (App Router, React 19, TypeScript) |
| AI SDK | Vercel AI SDK 5.x with OpenRouter (Gemini 2.5 Flash) |
| AI Fallback | Direct Google Gemini via `ai-fallback` package |
| Database | Supabase (PostgreSQL with RLS) |
| Auth | Supabase Auth |
| Payments | Stripe (checkout, portal, webhooks) |
| Voice TTS | ElevenLabs (Turbo v2.5) |
| Voice STT | Browser Web Speech API |
| Storage | Vercel Blob |
| Monitoring | Sentry, OpenTelemetry, Vercel Analytics |
| Logging | Pino (structured JSON) |
| Cost Tracking | TokenLens + AICostLog table |
| Knowledge Base | File-based markdown + Supabase table (not vector RAG) |
| AI Tools | 6 tools (createDocument, updateDocument, requestSuggestions, webSearch, weather, strategyCanvas) |
| Package Manager | pnpm |

---

## Summary

- **Total findings**: 56
- **Critical: 2** | **High: 2** | **Medium: 8** | **Low: 29** | **Info: 15**
- **Agents run**: 10/11 (Agent 7 RAG skipped -- project uses file-based knowledge base, not vector RAG)

---

## Category Scores

| # | Category | Score | Weight | Findings (C/H/M/L/I) | Weighted |
|---|----------|-------|--------|-----------------------|----------|
| 1 | Prompt Quality & Injection | 96/100 | 15.79% | 0/0/0/4/2 | 15.16 |
| 2 | Identity & Safety Rails | 55/100 | 15.79% | 2/1/2/1/0 | 8.68 |
| 3 | Auth & Subscription Integrity | 98/100 | 15.79% | 0/0/0/2/2 | 15.47 |
| 4 | Multi-Channel Reliability | 96/100 | 10.53% | 0/0/0/4/2 | 10.11 |
| 5 | AI Model Resilience | 97/100 | 10.53% | 0/0/0/3/1 | 10.21 |
| 6 | Tool & Function Design | 94/100 | 5.26% | 0/0/1/3/0 | 4.94 |
| 7 | RAG Quality | SKIPPED | 0% | -- | -- |
| 8 | Deployment & Web Security | 80/100 | 10.53% | 0/1/3/3/1 | 8.42 |
| 9 | Conversation Flow | 97/100 | 5.26% | 0/0/0/3/3 | 5.10 |
| 10 | Observability & Cost | 97/100 | 5.26% | 0/0/0/3/2 | 5.10 |
| 11 | Voice-Specific | 91/100 | 5.26% | 0/0/2/3/2 | 4.79 |
| | **TOTAL** | **88/100** | **100%** | **2/2/8/29/15** | **87.98** |

---

## CRITICAL -- Fix Before Deploy

### CRIT-1: Streaming PII Cannot Be Redacted After Detection
- **Agent**: 2 (Safety Rails)
- **File**: `app/(chat)/api/chat/route.ts:468-508`
- **Severity**: CRITICAL (-15)
- **Issue**: Post-hoc PII scan runs AFTER content has been streamed to the client. Detection logs SSNs, credit cards, emails, and phone numbers but cannot recall or redact already-streamed text. A single AI hallucination containing PII reaches the end user in real-time.
- **Current mitigation**: PII is redacted from user messages before storage. AI responses are scanned post-stream for logging/alerting only. This is a documented and acknowledged limitation of the streaming architecture.
- **Fix options**:
  1. **Accept and document**: Add explicit user-facing privacy disclosure that AI responses are not pre-screened for PII. Add PII detection alerts to admin dashboard for investigation.
  2. **Buffered streaming** (adds ~200ms latency): Buffer chunks in a sliding window, scan before forwarding to client. Requires AI SDK transport layer modification.
  3. **Hybrid approach**: Keep streaming for most content but add a pre-generation instruction in the system prompt explicitly forbidding PII generation (already partially covered by persona instructions, but could be strengthened with a dedicated `NEVER GENERATE PII` rule).

### CRIT-2: No Explicit Harmful Content Refusal Instructions
- **Agent**: 2 (Safety Rails)
- **File**: `lib/bot-personalities.ts:272-456`
- **Severity**: CRITICAL (-15)
- **Issue**: System prompts contain robust identity protection and jailbreak defenses (185 lines of IDENTITY_RULES) but NO explicit instructions to refuse harmful, illegal, or dangerous content generation. This includes: malware code, self-harm content, drug manufacturing, weapons instructions, harassment templates, etc. The system relies entirely on the base model's (Gemini Flash) built-in safety filters.
- **Risk**: Base model safety filters can vary between model versions and providers. If the fallback chain switches to a model with weaker filters (or a future OpenRouter model routing change), the application has no application-level defense against harmful content generation.
- **Fix**: Add a `CONTENT SAFETY RULES` section to `IDENTITY_RULES` in `lib/bot-personalities.ts`:
  ```
  ## CONTENT SAFETY RULES
  You MUST refuse to generate content involving:
  - Malware, hacking tools, or exploitation code
  - Self-harm, suicide methods, or eating disorder promotion
  - Drug manufacturing or illegal substance procurement
  - Weapons construction or violent attack planning
  - Harassment, doxxing, or targeted abuse content
  - Child exploitation or CSAM in any form
  - Fraud schemes, phishing templates, or social engineering scripts

  When refusing, respond: "I can't help with that. Let me know if there's
  something else I can assist with regarding your business needs."
  ```

---

## HIGH -- Fix Soon

### HIGH-1: jsPDF Vulnerable to PDF Injection (CVE-2026-25940)
- **Agent**: 8 (Deployment)
- **File**: `package.json:62` -- dependency `jspdf@4.1.0`
- **Severity**: HIGH (-8)
- **Issue**: jsPDF < 4.2.0 has a high-severity AcroForm injection vulnerability (GHSA-p5xg-68wr-hm3m) allowing arbitrary JavaScript execution in generated PDFs via the `appearanceState` property. The project uses jsPDF in `lib/pdf-export.ts`, `lib/pdf/pdf-renderer.ts`, `lib/conversation-export.ts`, and `components/strategy-canvas/swot-board.tsx`. While no AcroForm features are directly used, the vulnerable code path exists in the bundled library.
- **Fix**: `pnpm update jspdf` or set `"jspdf": "^4.2.0"` in `package.json` and run `pnpm install`.

### HIGH-2: No Medical/Legal/Financial Advice Disclaimers
- **Agent**: 2 (Safety Rails)
- **File**: `lib/bot-personalities.ts:325-328`
- **Severity**: HIGH (-8)
- **Issue**: The system prompts include a pricing disclaimer ("Always recommend speaking with a pricing consultant") but have NO disclaimers for medical, legal, or financial advice. As a business consultancy chatbot, users may ask about investment strategies, legal structures, tax implications, or employment law. Unqualified advice in these domains creates liability exposure for Alecci Media.
- **Fix**: Add a `PROFESSIONAL ADVICE DISCLAIMERS` section to the system prompts:
  ```
  ## PROFESSIONAL ADVICE DISCLAIMERS
  For any questions involving legal, financial, tax, medical, or regulatory advice:
  1. Provide general educational information only
  2. Include the disclaimer: "This is general information only, not professional
     [legal/financial/medical] advice. Please consult a qualified professional
     for your specific situation."
  3. Never recommend specific legal actions, investment decisions, or medical treatments
  ```

---

## MEDIUM -- Plan to Fix

### MED-1: Canary Token Uses Truncated Hash (2^32 keyspace)
- **Agent**: 2 | **File**: `lib/safety/canary.ts:26`
- **Issue**: Canary token uses first 8 hex chars of SHA256 hash (only 4.3 billion possible values). An attacker attempting to detect canary tokens could brute-force common patterns.
- **Fix**: Use full 64-char hash or at minimum 16 hex chars (2^64 keyspace). Change `.slice(0, 8)` to `.slice(0, 16)` or remove the slice entirely.

### MED-2: Web Search Sanitization Only Strips XML Tags
- **Agent**: 2 | **File**: `lib/ai/tools/web-search.ts:274-281`
- **Issue**: `sanitizeSnippet()` strips `<system>`, `<user>`, `<assistant>`, `<instruction>` XML tags from web search results but does not handle Markdown injection, instruction smuggling via backticks, or delimiter breaking with `---`. Malicious website content could attempt to override the persona.
- **Fix**: Replace `sanitizeSnippet()` with the full `sanitizePromptContent()` from `lib/ai/prompts.ts`, which covers 15+ injection patterns including role markers, special tokens, and instruction overrides.

### MED-3: Strategy Canvas Missing Input Length Validation
- **Agent**: 6 | **File**: `lib/ai/tools/strategy-canvas.ts:86-90`
- **Issue**: `items: z.array(z.string())` has no `.max()` on array length or individual string size. Unbounded input could cause database bloat and memory exhaustion via a malicious tool call.
- **Fix**: Add `items: z.array(z.string().max(500)).max(10)` to enforce reasonable size limits.

### MED-4: CSP Uses `unsafe-inline` for `script-src`
- **Agent**: 8 | **File**: `vercel.json:27`
- **Issue**: Content-Security-Policy `script-src` includes `'unsafe-inline'`, weakening XSS protection. This is a known trade-off: nonce-based CSP requires dynamic rendering in Next.js, defeating static optimization and CDN caching.
- **Fix**: Defer to dedicated security phase. Document as accepted trade-off. All scripts are first-party or from trusted CDNs in the CSP allowlist.

### MED-5: CSP Uses `unsafe-inline` for `style-src`
- **Agent**: 8 | **File**: `vercel.json:27`
- **Issue**: `style-src` includes `'unsafe-inline'`, which is required by Tailwind CSS / CSS-in-JS frameworks but reduces CSS injection protection.
- **Fix**: Accept as trade-off. Tailwind and shadcn/ui require inline styles. Document the decision.

### MED-6: Supabase User Email Sent to Sentry as PII
- **Agent**: 8 | **File**: `lib/supabase/middleware.ts:104`, `components/sentry-user.tsx:14`
- **Issue**: `Sentry.setUser({ id: user.id, email: user.email })` sends user email to Sentry event metadata on both server and client. While Sentry replay masks text/inputs, the user context email persists in event metadata stored on Sentry's servers.
- **Fix**: Send only user ID: `Sentry.setUser({ id: user.id })`. Look up emails separately when investigating issues. Alternatively, document as accepted PII trade-off for debugging.

### MED-7: Realtime Routes Do Not Record Voice Analytics
- **Agent**: 11 | **File**: `app/(chat)/api/realtime/route.ts`, `app/(chat)/api/realtime/stream/route.ts`
- **Issue**: Neither realtime voice route calls `recordAnalytics(userId, "voice", estimatedMinutes)`. Only `/api/voice` tracks cost. Realtime voice calls consume ElevenLabs characters but are invisible to the analytics dashboard and the DB-fallback rate limiter (which checks `UserAnalytics.voiceMinutes`).
- **Fix**: Add `after(() => recordAnalytics(user.id, "voice", estimatedMinutes))` in both realtime routes after successful TTS generation, mirroring the pattern in `/api/voice`.

### MED-8: Voice Rate Limit DB Fallback Compares Minutes vs Request Count
- **Agent**: 11 (also flagged by Agent 3) | **File**: `app/(chat)/api/voice/route.ts:95`, `app/(chat)/api/realtime/route.ts:94`, `app/(chat)/api/realtime/stream/route.ts:169`
- **Issue**: When Redis is unavailable, the fallback checks `voiceMinutes >= MAX_VOICE_REQUESTS_PER_DAY` (500 or 200). But `voiceMinutes` is estimated minutes (chars/750), not a request count. Many short requests could far exceed the intended limit; a few long requests could hit it unfairly early.
- **Fix**: Add a `voiceRequestCount` column to `UserAnalytics` and use it in the DB fallback comparison instead of `voiceMinutes`.

---

## LOW -- Nice to Have

### L-01: Geo hints injected into system prompt without sanitization
- **Agent**: 1 | **File**: `lib/ai/prompts.ts:120-126`
- Vercel geolocation headers interpolated directly. Low risk (not user-controlled) but should pass through `sanitizePromptContent()` for defense-in-depth.

### L-02: Supabase knowledge base content titles not individually sanitized
- **Agent**: 1 | **File**: `lib/ai/knowledge-base.ts:308-316`
- `row.title` in `--- title ---` delimiter pattern could be weaponized if table becomes writable. Apply `sanitizePromptContent()` individually.

### L-03: Code content in updateDocumentPrompt uses XML attribute-only protection
- **Agent**: 1 | **File**: `lib/ai/prompts.ts:306-313`
- `</user_document>` breakout not prevented. Escape the literal closing tag in code content before wrapping.

### L-04: Update-document description passed unsanitized as prompt
- **Agent**: 1 | **File**: `lib/ai/tools/update-document.ts:54`
- AI-generated `description` parameter passed directly as `prompt` to artifact handlers without `sanitizePromptContent()`.

### L-05: Voice route accepts content without PII redaction before TTS
- **Agent**: 2 | **File**: `app/(chat)/api/voice/route.ts:106-112`
- Text sent to ElevenLabs TTS without PII check. If message contains PII, it gets spoken aloud.

### L-06: Reactions API lacks message-ownership verification
- **Agent**: 3 | **File**: `app/(chat)/api/reactions/route.ts:83-157`
- No check that `messageId` belongs to user's own chat before inserting reaction. RLS enforces `userId` matching on INSERT but public chat messages could receive reactions from non-owners.

### L-07: `knowledge_base_content` RLS is service-role-only (no authenticated policy)
- **Agent**: 3 | **File**: `supabase/migrations/20260211000100_create_knowledge_base_content.sql:25-30`
- Regular client queries silently return empty. Correct by design but should be documented.

### L-08: StripeWebhookEvent table has no TTL/cleanup mechanism
- **Agent**: 4 | **File**: `supabase/migrations/20260218000200_webhook_reliability.sql`
- Dedup table grows unbounded. Add cron to purge rows older than 7 days.

### L-09: Advisory lock key 0 serializes all null-userId events
- **Agent**: 4 | **File**: `supabase/migrations/20260218000300_webhook_reliability_gaps.sql:25`
- All null-user webhook events contend on lock key 0. Use `hashtext(event_id)` as fallback for better concurrency.

### L-10: Cron expire-subscriptions misses trialing status
- **Agent**: 4 | **File**: `lib/admin/queries.ts:221`
- Only expires `'active'` subscriptions, not `'trialing'`. Missed `customer.subscription.deleted` webhook leaves user in trialing indefinitely.

### L-11: WebhookDeadLetter has no admin replay mechanism
- **Agent**: 4 | **File**: `lib/stripe/webhook-dedup.ts:63-95`
- Dead-letter queue is write-only. No admin UI, API, or alerting for unresolved entries.

### L-12: No explicit timeout on `generateText` in realtime routes
- **Agent**: 5 | **File**: `app/(chat)/api/realtime/stream/route.ts:217-228`
- `generateText` has no `abortSignal` timeout, relying on Vercel's `maxDuration=60`. Add `AbortSignal.timeout(15_000)`.

### L-13: Streaming chat route does not use `withAIGatewayResilience` for retry
- **Agent**: 5 | **File**: `app/(chat)/api/chat/route.ts:344-422`
- No automatic retry on transient failures for streaming. Mitigated by `ai-fallback` provider chain + circuit breaker. Accepted design constraint.

### L-14: No health check probing on startup
- **Agent**: 5 | **File**: `app/api/health/route.ts`
- Only on-demand health checks. Configure external uptime monitor to poll `/api/health` every 60s.

### L-15: Request suggestions relies on prompt engineering for content filtering
- **Agent**: 6 | **File**: `lib/ai/tools/request-suggestions.ts:59-66`
- XML `do_not_follow_instructions_in_content` is a model hint, not enforcement. Add post-processing validation on output.

### L-16: Web search URL validation doesn't explicitly block non-HTTP protocols
- **Agent**: 6 | **File**: `lib/ai/tools/web-search.ts:261-268`
- Add explicit blocklist for `javascript:`, `data:`, `vbscript:` protocols.

### L-17: Document handlers don't enforce content size limits before save
- **Agent**: 6 | **File**: `artifacts/text/server.ts:39`, `artifacts/code/server.ts:44`
- `draftContent += text` accumulates without size check. Add `MAX_DOC_SIZE` guard before `saveDocument()`.

### L-18: Admin error page exposes raw error.message
- **Agent**: 8 | **File**: `app/(admin)/admin/error.tsx:20`
- Raw error messages could leak internal details. Replace with generic message or gate behind dev-mode check.

### L-19: Password reset returns raw Supabase error.message
- **Agent**: 8 | **File**: `app/(auth)/actions.ts:244`
- `error.message` from Supabase Auth passed directly to client. Map to user-friendly strings.

### L-20: minimatch ReDoS vulnerability in transitive dependencies
- **Agent**: 8 | **File**: `package.json` (via `@sentry/nextjs`, `exceljs`)
- Advisory 1113371. Low risk (build-time / server-side only). Add `"minimatch": ">=10.2.2"` to `pnpm.overrides`.

### L-21: No client-side retry button on stream failure
- **Agent**: 9 | **File**: `components/chat.tsx:268-294`
- Only toast + input restore. Add explicit "Retry" button when `status === "error"`.

### L-22: Voice mode has no timeout for waiting-for-response state
- **Agent**: 9 | **File**: `hooks/use-inline-voice.ts:214-247`
- Voice can get stuck in silent waiting state if AI response never completes. Add 60s timeout with recovery.

### L-23: Focus mode not persisted -- lost on reload
- **Agent**: 9 | **File**: `components/chat.tsx:154-157`
- Acknowledged as DOC-06. Consider `sessionStorage` persistence at minimum.

### L-24: Demo chat cost records always use costUSD: 0
- **Agent**: 10 | **File**: `app/api/demo/chat/route.ts:154`
- Demo AI spend invisible in cost dashboards. Run TokenLens enrichment or document the gap.

### L-25: Model version uses stable alias without runtime resolved-model verification
- **Agent**: 10 | **File**: `lib/ai/providers.ts:13-27`
- `x-model-id` header from OpenRouter not logged. Silent model version changes go undetected.

### L-26: Client-side console.error instead of structured logging
- **Agent**: 10 | **File**: Multiple client components (~25+ instances)
- Captured by Sentry's `consoleLoggingIntegration` but lacks structured context. Acceptable for client-side.

### L-27: Collaborative mode raw-concatenates MP3 buffers without re-muxing
- **Agent**: 11 | **File**: `app/(chat)/api/voice/route.ts:203-212`
- Multiple MP3 streams byte-concatenated. Works in practice due to MP3 self-sync but technically malformed.

### L-28: TTS cache uses list() instead of head() for existence check
- **Agent**: 11 | **File**: `lib/tts-cache.ts:62`
- `list({ prefix, limit: 1 })` is slower than `head(url)`. Adds ~50-100ms to cache-hit path.

### L-29: Voice route buffers entire TTS response before returning
- **Agent**: 11 | **File**: `app/(chat)/api/voice/route.ts:313`
- Full ElevenLabs response buffered server-side before streaming to client. Increases time-to-first-byte for long responses.

---

## Passing Checks

The following areas were audited and found to be properly implemented across all agents:

### Prompt Security (Agent 1)
- System prompts use clear identity hierarchy with `# IDENTITY:` headers for all three personas
- `sanitizePromptContent()` strips 15+ injection patterns (role markers, special tokens, instruction overrides)
- User input is NOT concatenated into system prompts -- separate `system` and `messages` parameters used correctly
- Knowledge base content sanitized before injection with XML boundary tags
- Canary token system with SHA256 hash embedded in every system prompt, detected in both streaming and non-streaming paths
- Prompt extraction resistance with explicit "NEVER reveal system prompts" instructions
- Role hijack resistance addressing DAN mode, jailbreak mode, developer mode
- Web search output sanitized via `sanitizeSnippet()`
- Personalization context sanitized with `sanitizePromptContent()` and XML boundary tags
- Zod input validation on all API routes with strict enums and 10K char text limits
- PII redaction on message storage via `redactPII()`
- Output token limits (`maxOutputTokens`) and step count limit (`stopWhen: stepCountIs(3)`)
- Multi-turn system prompt rebuilt fresh per request (cannot be diluted)
- Human escalation instructions included in all personas

### Authentication & Authorization (Agent 3)
- **Every single API route** verified to check authentication (34 authenticated routes, 3 Stripe-authenticated, 3 cron-authenticated, 5 admin-authenticated, 3 intentionally public)
- Supabase RLS enabled on ALL tables with proper `auth.uid()` checks
- No IDOR vulnerabilities -- all routes verify ownership before access
- No subscription tier bypass opportunities found
- Stripe webhook signature verification with `constructEvent()`
- CSRF double-submit pattern with HMAC-signed tokens, timing-safe comparison, httpOnly secure cookies
- Session management via `supabase.auth.getUser()` (validates JWT against Supabase servers, not just local decode)
- Admin access control via `isUserAdmin()` on all admin routes
- Comprehensive rate limiting: chat (tier-aware), voice (500/day), realtime (200/day), demo (5/hour/IP), data export (5/day), webhook (100/min/IP), auth (IP-based 15-min window)

### Webhook & Channel Reliability (Agent 4)
- Stripe webhook signature validation with raw body text
- All critical Stripe events handled (checkout, subscription CRUD, invoice)
- Atomic event-ID deduplication via Postgres RPC with advisory locks
- Dead-letter queue for failed events with full payload/stack trace
- Per-user advisory locking prevents race conditions
- Webhook rate limiting (100/min/IP) before signature verification
- Heavy webhook processing offloaded to `after()` callbacks for fast response
- Cron job security with `CRON_SECRET` Bearer token
- Subscription sync fallback queries Stripe directly when DB shows inactive
- No other inbound webhook integrations present (ElevenLabs is outbound-only)

### AI Model Resilience (Agent 5)
- Full circuit breaker pattern: closed/open/half-open with configurable thresholds (5 failures for AI, 3 for ElevenLabs)
- Three-level fallback chain: in-provider model fallback, cross-provider `ai-fallback`, circuit breaker offline error
- Appropriate timeouts on all AI calls (55s streaming, 10s title/summary, 45s TTS, 10s web search, 5s weather)
- Streaming error recovery with user message restoration and retry capability
- Resumable streams via Redis with graceful degradation
- Exponential backoff retry with jitter, Retry-After header respect, non-retryable error pass-through
- Rate limit headers returned to clients
- Safety middleware wraps all model outputs for PII and canary detection
- Model response validation via Zod schemas on structured outputs

### Tool Security (Agent 6)
- All tools check `session?.user?.id` before database operations
- Document ownership verified before updates
- All tools use Zod schemas for input validation
- External HTTP requests have AbortController timeouts
- Web search snippets sanitized for injection markers
- PII redaction applied on suggestion outputs
- Tools return structured error objects (no throws leaking to client)
- No file system access, code execution, or external webhook triggers

### Deployment & Web Security (Agent 8)
- No hardcoded secrets in source code; all from environment variables
- `.env` files properly gitignored; none tracked in git
- `NEXT_PUBLIC_` prefix used correctly for only appropriate client-side values
- Server-side secrets validated via `@t3-oss/env-nextjs` with Zod
- Comprehensive HTTP security headers: HSTS (with preload), X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy
- No production source maps exposed to browsers (Sentry-only upload)
- Error stack traces only in development logs
- `ChatSDKError.toResponse()` returns curated user-friendly messages
- Sentry `beforeSend` redacts sensitive headers and extras
- Sentry Session Replay with full text/input masking and media blocking
- Stripe URL construction uses domain allowlist to prevent open redirects
- `pnpm.overrides` actively patches known vulnerable transitive dependencies

### Conversation Flow (Agent 9)
- Triple-layered empty input prevention (client guard, submit button disable, Zod validation)
- Error message restoration to input field on stream failure
- Context window management: `MAX_CONTEXT_MESSAGES = 60` with bounded DB fetch
- Conversation pagination with cursor-based loading
- Simple message optimization (skip knowledge base for greetings)
- Truncation detection with "Continue" button
- Prompt-level human escalation instructions in all personas
- Full support ticketing system integrated into chat UI
- Resumable streams with auto-resume on page reload
- Local storage input backup survives page refreshes
- Network status banner for offline detection
- Typed error system with user-friendly messages across all surfaces
- Bot type tracked per message for correct executive display on switches

### Observability & Cost (Agent 10)
- Pino structured logging (JSON in prod, pretty in dev) with request-scoped child loggers
- Consistent server-side logger adoption -- no `console.log` on server
- Full Sentry integration with PII redaction, error boundaries, breadcrumbs, and Session Replay
- OpenTelemetry via `@vercel/otel` with AI SDK telemetry in production
- TokenLens cost enrichment with 24-hour catalog caching
- `AICostLog` table with per-request granularity (RLS, service-role-only)
- Daily cost alerting cron with configurable threshold and admin email notification
- Per-user anomaly detection (>10x daily average triggers alert)
- Admin cost dashboard with monthly per-model breakdowns
- `UserAnalytics` tracking via atomic Supabase RPC upsert
- API latency tracking in structured logs
- Health endpoint probing OpenRouter, Supabase, and circuit breaker states
- Vercel Analytics and Speed Insights integrated
- Environment validation at build time via `@t3-oss/env-nextjs`

### Voice (Agent 11)
- AbortController timeouts on all ElevenLabs calls (45s) with proper cleanup
- CSRF protection on all three voice endpoints
- Auth + subscription checks before consuming ElevenLabs resources
- Separate rate limits for voice (500/day) and realtime (200/day)
- Circuit breaker + retry for ElevenLabs (3 failures, 60s open, 2 retries)
- Graceful degradation: 503 with user-friendly messages, per-segment isolation in collaborative mode
- Input validation with `MAX_TTS_TEXT_LENGTH` (5000 chars) and bot type enum
- Markdown stripping with precompiled regex patterns
- Collaborative segment parsing with speaker identification and deduplication
- Content-addressable TTS cache via SHA-256 in Vercel Blob
- Audio manager ensuring single playback with proper cleanup
- Auto-speak waits for streaming completion, prevents double-speaking
- Inline voice mode with continuous listen-transcribe-send cycle
- Sentry breadcrumbs for all voice operations
- ElevenLabs request stitching for prosody-aligned multi-segment audio

---

## Dependency Audit Summary

From `dep-audit.txt`:

| Package | Vulnerability | Severity | Status |
|---------|--------------|----------|--------|
| jspdf@4.1.0 | CVE-2026-25940 (AcroForm injection) | High | **Update to ^4.2.0** |
| minimatch (transitive) | Advisory 1113371 (ReDoS) | Moderate | **Add pnpm.overrides** |

---

## Recommended Fix Priority

### Immediate (before next deploy)
1. **CRIT-2**: Add explicit harmful content refusal instructions to system prompts
2. **HIGH-1**: Update jsPDF to ^4.2.0
3. **HIGH-2**: Add professional advice disclaimers to system prompts

### This Sprint
4. **MED-2**: Replace `sanitizeSnippet()` with `sanitizePromptContent()` in web search
5. **MED-3**: Add input length validation to strategy canvas tool
6. **MED-7**: Add voice analytics tracking to realtime routes
7. **MED-8**: Fix voice rate limit DB fallback (voiceMinutes vs request count)
8. **MED-1**: Extend canary token hash length

### Next Sprint
9. **MED-4/5**: Document CSP `unsafe-inline` as accepted trade-off (or plan nonce-based CSP)
10. **MED-6**: Remove user email from Sentry context
11. **CRIT-1**: Evaluate buffered streaming PII approach or strengthen system prompt PII prohibition
12. **L-20**: Add minimatch override to pnpm.overrides

### Backlog
13. All remaining LOW findings (L-01 through L-29)

---

## Delta from Previous Audit (2026-02-16)

The previous audit scored **58/100 (F)**. This audit scores **88/100 (B)**, a **+30 point improvement**.

### Issues Resolved Since Previous Audit
- **C-1 (old)**: AI model fallback chain -- RESOLVED. Three-level fallback chain now implemented (in-provider, cross-provider `ai-fallback`, circuit breaker)
- **C-2 (old)**: No output filtering -- RESOLVED. PII redaction, canary token detection, and safety middleware now implemented
- **C-3 (old)**: No PII redaction in storage -- RESOLVED. `redactPII()` applied to user messages before database insert
- **C-4 (old)**: Model not pinned -- RESOLVED. Now uses `gemini-2.5-flash` stable alias with in-provider fallback
- **C-5 (old)**: No cost alerting -- RESOLVED. Daily cost check cron, per-user anomaly detection, admin email alerts
- **C-6 (old)**: Title generation no resilience -- RESOLVED. Now has `AbortSignal.timeout(10_000)` and error handling
- **C-7 (old)**: Weather API no validation -- RESOLVED. Response validation and error handling added
- **C-8 (old)**: `dangerouslySetInnerHTML` -- RESOLVED. No longer uses this pattern
- **C-9 (old)**: Raw MP3 concatenation -- DOWNGRADED to LOW. Still present but correctly identified as working in practice due to MP3 self-sync
- **C-10 (old)**: Weather fetch no timeout -- RESOLVED. Now has AbortController timeouts
- **H-1 through H-21 (old)**: 18 of 21 HIGH findings resolved (streaming timeout, auth middleware, document sanitization, realtime validation, conversation summarizer resilience, human handoff, truncation warning, tool auth checks, health endpoint, structured logging, latency tracking, cost tracking, ElevenLabs optimization, etc.)
- **M-1 through M-28 (old)**: Majority of MEDIUM findings resolved including personalization sanitization, title generation sanitization, Stripe event deduplication, circuit breaker improvements, demo chat validation, error message cleanup, TTS caching, etc.

### Remaining Issues from Previous Audit
- CSP `unsafe-inline` (was L-15, now MED-4/5) -- accepted trade-off, documented
- Focus mode persistence (was M-21, now L-23) -- acknowledged as DOC-06
- Sentry `tracesSampleRate: 0.1` (was L-21, now INFO) -- accepted for cost management

---

*Report generated by AI Production Audit v2 -- 10 specialized agents analyzing prompt security, safety rails, auth/billing, channel reliability, model resilience, tool design, deployment security, conversation flow, observability, and voice systems.*
