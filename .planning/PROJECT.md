# AI Boss Brainz

## What This Is

AI-powered executive consulting SaaS for sales and marketing strategy. Two AI personas (Alexandria as CMO, Kim as CSO) provide business consulting through a chat interface. Built for founders, marketers, and sales professionals who need strategic guidance on demand.

## Core Value

Founders get instant, actionable sales and marketing strategy from AI executives who remember context and deliver frameworks-based guidance.

## Current Milestone: v1.3 AI Production Hardening

**Goal:** Fix all critical and high-severity findings from the AI Production Audit — harden model resilience, add safety rails, secure tools, improve voice quality, and establish proper observability.

**Target fixes (34 items from audit):**
- Model resilience: fallback chain, pin versions, resilience wrappers, timeouts
- Safety rails: output filtering, PII redaction, prompt sanitization, human handoff
- Tool hardening: weather API validation/timeout, tool auth checks
- Security: remove dangerouslySetInnerHTML, middleware auth, input validation, health endpoint
- Voice quality: MP3 concatenation fix, latency optimization, config alignment
- Observability: structured logging, AI metrics, cost alerting/tracking
- Cost controls: spend budgets, monthly estimation

## Previous State (v1.1 Shipped)

**Shipped:** 2026-02-02
**Client:** Alecci Media (Alexandria)
**Users:** Dagmar (Insides Match), Becky, Rana, and trial users
**Codebase:** ~111K lines TypeScript (Next.js 15, Supabase, Vercel)

**v1.1 Delivered:**
- Bug fixes (admin panel 404, unpin conversation)
- Branding updates (Phoenix location, AI-powered tagline, emails, social links)
- Billing documentation with resolution checklists for legacy users
- Mailchimp integration for 7-day trial automation
- Profile dropdown GIF for Mailchimp emails

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

### Active

See `.planning/REQUIREMENTS.md` for v1.3 requirements

### Out of Scope

- Mobile app - Web-first approach
- Real-time chat between users - Single-user AI consultation
- Video calls - Text/voice only
- Multi-tenant admin - Single admin panel
- Migrate legacy Stripe subscriptions - Document behavior instead
- Mailchimp automation UI - Outside platform codebase

## Constraints

- **Tech stack:** Next.js 15, Supabase, Vercel, Stripe, Mailchimp
- **Billing:** Must not break existing Stripe integrations
- **Phase numbering:** Continues from v1.2 (next phase is 16)
- **No regressions:** Fixes must not break existing chat, voice, billing, or auth flows

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase Auth over NextAuth | Native Supabase integration | Good |
| OpenRouter + Gemini | Cost-effective AI routing | Good |
| Admin panel DB-only changes | No Stripe coupling for manual edits | Good |
| Strict Mailchimp consistency | Block webhook on failure, Stripe retries | Good |
| Remotion for GIF creation | Better than screen recording, reproducible | Good |
| AI Production Audit before v1.3 | Systematic issue discovery vs ad-hoc fixes | Good |
| Critical+High scope for v1.3 | 34 items is achievable; Medium/Low deferred to v1.4 | — Pending |

---

*Last updated: 2026-02-16 after v1.3 milestone start*
