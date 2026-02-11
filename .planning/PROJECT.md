# AI Boss Brainz

## What This Is

AI-powered executive consulting SaaS for sales and marketing strategy. Two AI personas (Alexandria as CMO, Kim as CSO) provide business consulting through a chat interface. Built for founders, marketers, and sales professionals who need strategic guidance on demand.

## Core Value

Founders get instant, actionable sales and marketing strategy from AI executives who remember context and deliver frameworks-based guidance.

## Current State (v1.1 Shipped)

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

### Active

(None - next milestone requirements to be defined with `/gsd:new-milestone`)

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
- **Phase numbering:** Continues from v1.1 (next phase is 11)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase Auth over NextAuth | Native Supabase integration | Good |
| OpenRouter + Gemini | Cost-effective AI routing | Good |
| Admin panel DB-only changes | No Stripe coupling for manual edits | Good |
| Strict Mailchimp consistency | Block webhook on failure, Stripe retries | Good |
| Remotion for GIF creation | Better than screen recording, reproducible | Good |

---

*Last updated: 2026-02-02 after v1.1 milestone completion*
