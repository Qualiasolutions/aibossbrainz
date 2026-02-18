# AI Boss Brainz

## What This Is

AI-powered executive consulting SaaS for sales and marketing strategy. Two AI personas (Alexandria as CMO, Kim as CSO) provide business consulting through a chat interface with production-grade resilience, safety rails, and observability. Built for founders, marketers, and sales professionals who need strategic guidance on demand.

## Core Value

Founders get instant, actionable sales and marketing strategy from AI executives who remember context and deliver frameworks-based guidance.

## Requirements

### Validated

**v1.0:**
- User authentication (Supabase Auth)
- Three AI personas (Alexandria, Kim, Collaborative)
- Focus modes for specialized consulting
- Chat with message history, topic classification
- Strategy canvases (SWOT, BMC, Journey, Brainstorm)
- Voice playback (ElevenLabs TTS)
- Subscription tiers (Trial, Monthly, Annual, Lifetime)
- Admin panel with user management
- Landing page with CMS
- Support ticket system

**v1.1:**
- Admin panel user details page (BUG-01)
- Unpin conversation functionality (BUG-02)
- Phoenix, Arizona location on contact page (BRAND-01)
- AI-powered tagline in footer (BRAND-02)
- Contact emails updated to ai.bossbrainz@aleccimedia.com (BRAND-03, BRAND-04)
- Social links to Alecci Media accounts (BRAND-05)
- Billing documentation for platform vs legacy Stripe (BILL-01)
- Resolution plans for Dagmar and Becky (BILL-02, BILL-03)
- Mailchimp trial tagging integration (MAIL-01)
- Mailchimp paid tagging integration (MAIL-02)
- Pricing page checkout flow (MAIL-03)
- Profile dropdown GIF via Remotion (DOC-03)
- Email confirmation redirect to /subscribe?welcome=true (UX-01)

**v1.2:**
- Auth rate-limit fix, 8-char password min, PasswordInput component
- Chat error recovery with clearError, safe auto-resume
- PDF export rewrite with native jsPDF text rendering
- Copy/paste quality with stripMarkdownForClipboard
- AI content generation prompts, TTS preprocessing
- Voice call TTS fix, per-session realtime chats
- Stripe billing portal with plan-change sync
- Fireflies transcript ingestion, Supabase KB loader
- Admin user categories, filtered revenue, reaction system
- SEO meta-data updates, homepage executive bios, footer social icons

**v1.3:**
- OpenRouter fallback chain with stable model IDs (RESIL-01, RESIL-02)
- Title/summary resilience wrappers with 10s timeout (RESIL-03, RESIL-05)
- streamText timeout 55s/15s chunk (RESIL-04)
- Weather API validation + timeout (TOOL-01, TOOL-02)
- Tool auth checks without existence leaks (TOOL-03, TOOL-04)
- XSS elimination via next/script (SEC-01)
- Middleware API route allowlist (SEC-02)
- Realtime Zod validation (SEC-03)
- Health endpoint two-tier response (SEC-04)
- PII redaction before storage (SAFE-02)
- Streaming output PII/canary scan (SAFE-01)
- Document prompt sanitization (SAFE-03)
- Human escalation instructions (SAFE-04)
- Truncation detection with continue banner (SAFE-05)
- Suggestion validation with PII redaction (SAFE-06)
- Request stitching for collaborative audio (VOICE-01)
- ElevenLabs streaming latency optimization (VOICE-02, VOICE-03)
- Voice config centralization (VOICE-04)
- Greeting autoplay compliance (VOICE-05)
- Shared markdown stripping (VOICE-06)
- Stripe webhook structured logging (OBS-01)
- 98% structured logging coverage (OBS-02)
- AI response cost logging (OBS-03)
- Error path stack traces (OBS-04)
- Daily cost alerting cron (COST-01)
- Monthly cost dashboard API (COST-02)

### Active

(None — next milestone requirements TBD via `/gsd:new-milestone`)

### Out of Scope

- Mobile app — Web-first approach
- Real-time chat between users — Single-user AI consultation
- Video calls — Text/voice only
- Multi-tenant admin — Single admin panel
- Migrate legacy Stripe subscriptions — Document behavior instead
- Mailchimp automation UI — Outside platform codebase

## Context

Shipped v1.3 with ~64K lines TypeScript.
Tech stack: Next.js 15, React 19, Supabase, Vercel, OpenRouter (Gemini 2.5 Flash), ElevenLabs, Stripe.
AI Production Audit score improved from 58/100 (grade F) to full remediation of all critical and high findings.
Known tech debt: cost dashboard API-only (no frontend), AICostLog migration manual, post-hoc streaming PII scan is detection-only.
28 medium + 25 low severity findings from audit deferred to v1.4.

## Constraints

- **Tech stack:** Next.js 15, Supabase, Vercel, Stripe, Mailchimp
- **Billing:** Must not break existing Stripe integrations
- **Phase numbering:** Continues from v1.3 (next phase is 21)
- **No regressions:** Changes must not break existing chat, voice, billing, or auth flows
- **New API routes:** Must be added to publicApiRoutes in lib/supabase/middleware.ts if they need unauthenticated access

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase Auth over NextAuth | Native Supabase integration | Good |
| OpenRouter + Gemini | Cost-effective AI routing | Good |
| Admin panel DB-only changes | No Stripe coupling for manual edits | Good |
| Strict Mailchimp consistency | Block webhook on failure, Stripe retries | Good |
| Remotion for GIF creation | Better than screen recording, reproducible | Good |
| AI Production Audit before v1.3 | Systematic issue discovery vs ad-hoc fixes | Good |
| Critical+High scope for v1.3 | 31 items achievable; Medium/Low deferred to v1.4 | Good |
| Gemini 2.5 Flash (stable GA) | Reliability over bleeding edge (was Gemini 3 Flash Preview) | Good |
| OpenRouter extraBody.models for fallback | Native fallback, no app-level retry needed | Good |
| AI SDK LanguageModelV2Middleware | Correct type for safety middleware in SDK v5 | Good |
| Canary prefix match for leak detection | Catches partial leaks where model truncates | Good |
| Post-hoc streaming PII scan | Detection/logging only (cannot recall streamed content) | Accepted limitation |
| optimize_streaming_latency level 2 | Avoids text normalization issues with numbers/dates/currency | Good |
| Sequential collaborative generation | Request stitching requires ordered request IDs | Good |
| AICostLog as separate table | Per-request granularity, per-model breakdown | Good |
| Non-blocking cost recording via after() | No latency impact on chat responses | Good |
| Client-side console.* preserved | pino is server-only; lib/utils.ts, lib/audio-manager.ts | Accepted |

---

*Last updated: 2026-02-18 after v1.3 milestone*
