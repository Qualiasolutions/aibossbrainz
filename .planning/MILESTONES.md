# Milestones

## v1.3 — AI Production Hardening (Shipped: 2026-02-18)

**Delivered:** Remediated all critical and high-severity findings from the AI Production Audit (score 58/100, grade F) — model resilience, security hardening, safety rails, voice quality fixes, and observability infrastructure.

**Phases completed:** 16-20 (10 plans total)

**Key accomplishments:**

- Model resilience with OpenRouter fallback chain and circuit breakers — AI survives outages gracefully
- Security hardening: XSS elimination, middleware API allowlist, Zod input validation, health endpoint lockdown
- PII redaction with Luhn-validated credit card detection, canary leak detection, and AI SDK safety middleware
- Voice quality: request stitching for glitch-free collaborative audio, streaming TTS, autoplay compliance
- Structured logging migration achieving 98% coverage (247/250 calls) with pino
- AI cost tracking with per-request logging, daily spend alerting, and monthly dashboard API

**Stats:**

- 5 phases, 10 plans, 23 tasks
- 31/31 requirements shipped
- 123 files changed (+9,628 / -1,192)
- Completed in 2 days (2026-02-16 → 2026-02-18)

**Git range:** `926b568` → `b79822f`

**Archive:** [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)

**What's next:** v1.4 — Medium and low severity findings from the production audit (28 medium + 25 low items)

---

## v1.2 — Client Feedback Sweep (Shipped: 2026-02-11)

**Delivered:** Auth hardening, PDF/copy export quality, AI content generation, voice call fixes, homepage/SEO updates, billing portal, Fireflies KB ingestion, analytics user categories, multi-select reactions.

**Phases completed:** 11-15 (11 plans total)

**Key accomplishments:**

- Fixed auth rate-limiting crash and added PasswordInput component
- Rewrote PDF exports with native jsPDF text rendering (no html2canvas)
- Added AI content generation prompts (email drafts, social posts, ad copy)
- Fixed voice call TTS and added per-session realtime chat persistence
- Updated homepage executive bios, checkup section, footer social icons
- SEO meta-data "Your Sales and Marketing Secret Weapon"
- Stripe billing portal with plan-change sync
- Fireflies transcript ingestion into executive knowledge base
- Admin user categories (team/client) with filtered revenue analytics

**Stats:**

- 5 phases, 11 plans
- 24/24 requirements shipped
- Completed in 1 day (2026-02-11)

**Archive:** [ROADMAP.md](../ROADMAP.md) (v1.2 section)

---

## v1.1 — Alexandria Requests (Shipped: 2026-02-02)

**Delivered:** Bug fixes, branding updates, billing documentation, Mailchimp integration, and documentation assets for email marketing.

**Phases completed:** 6-10 (8 plans total)

**Key accomplishments:**

- Fixed admin panel 404 error and unpin conversation bug
- Updated branding (Phoenix location, AI-powered tagline, contact emails, social links)
- Created comprehensive billing documentation with legacy user resolution checklists
- Integrated Mailchimp for trial/paid tagging automation via Stripe webhooks
- Created profile dropdown GIF via Remotion for Mailchimp onboarding emails
- Improved email confirmation redirect flow

**Stats:**

- 5 phases, 8 plans
- 15/17 requirements shipped (2 intentionally skipped)
- ~111K lines TypeScript
- Completed in 1 day (2026-02-02)

**Git range:** `e35141c` -> `4e31f3c`

**Archive:** [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

---

## v1.0 — Initial Release (Prior Work)

**Status:** Complete (before GSD tracking)

**Delivered:**
- User authentication with Supabase Auth
- Three AI personas (Alexandria, Kim, Collaborative)
- Focus modes for specialized consulting
- Chat interface with history, pinning, topic classification
- Strategy canvases (SWOT, BMC, Journey, Brainstorm)
- Voice playback with ElevenLabs TTS
- Subscription system (Trial, Monthly, Annual, Lifetime)
- Stripe integration for payments
- Admin panel with user management
- Landing page with CMS
- Support ticket system
- Rate limiting (Redis + DB fallback)

**Phases:** 1-5 (implicit, not tracked)

---
