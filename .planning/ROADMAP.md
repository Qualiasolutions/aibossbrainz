# Roadmap: AI Boss Brainz

## Milestones

- v1.0 MVP - Phases 1-5 (shipped)
- v1.1 Branding & Billing - Phases 6-10 (shipped 2026-02-02)
- v1.2 Client Feedback Sweep - Phases 11-15 (in progress)

## Overview

v1.2 addresses 24 items from Alexandria's team feedback spreadsheet. The milestone moves from stability fixes (broken auth rate limiting, generation errors) through export quality, AI content improvements, public-facing page updates, and platform enhancements. Each phase delivers an independently verifiable capability improvement.

## Phases

- [x] **Phase 11: Critical Fixes & Auth Hardening** - Fix production bugs and auth UX issues
- [x] **Phase 12: Export & Copy Quality** - Clean PDF exports and copy/paste output
- [x] **Phase 13: AI Content & Voice** - Better AI deliverables and voice integration
- [ ] **Phase 14: Homepage & SEO** - Public-facing page updates and meta-data
- [ ] **Phase 15: Billing, Knowledge Base & Platform** - Billing options, Fireflies ingestion, analytics categories, reaction UX

## Phase Details

### Phase 11: Critical Fixes & Auth Hardening
**Goal**: Users can sign up, reset passwords, and chat without hitting bugs that block core workflows
**Depends on**: Nothing (first phase of v1.2)
**Requirements**: BUG-01, BUG-02, BUG-03, BUG-04, AUTH-01, AUTH-02
**Success Criteria** (what must be TRUE):
  1. User can sign up and reset password without rate limiting errors (auth rate limiter uses correct variable)
  2. When AI generation fails, user sees a clear retry message instead of a raw error
  3. User can create a new chat thread even when another thread has a generation error
  4. Returning to a previous chat loads the full conversation content (no blank screen)
  5. Password fields show a toggle to reveal/hide text, and minimum length is enforced at 8 characters
**Plans:** 2 plans

Plans:
- [x] 11-01-PLAN.md -- Auth rate limiting fix, password min length (8), password show/hide toggle (BUG-01, AUTH-01, AUTH-02)
- [x] 11-02-PLAN.md -- Chat error recovery with clearError, improved error messages, safe auto-resume (BUG-02, BUG-03, BUG-04)

### Phase 12: Export & Copy Quality
**Goal**: Users get clean, professional output when exporting or copying chat content
**Depends on**: Phase 11
**Requirements**: EXPORT-01, EXPORT-02, EXPORT-03, EXPORT-04
**Success Criteria** (what must be TRUE):
  1. Single-message PDF export contains no HTML tags -- only clean formatted text
  2. User can export an entire chat thread as one PDF document
  3. Exported PDFs are noticeably smaller in file size than current output
  4. Selecting and copying chat text produces clean text without HTML markup in clipboard
**Plans:** 2 plans

Plans:
- [x] 12-01-PLAN.md -- Native text PDF engine + rewrite single-message and thread exports (EXPORT-01, EXPORT-02, EXPORT-03)
- [x] 12-02-PLAN.md -- Clipboard copy markdown stripping for clean paste output (EXPORT-04)

### Phase 13: AI Content & Voice
**Goal**: AI executives produce actionable deliverables (not just strategy) and voice features work seamlessly with chat
**Depends on**: Phase 11
**Requirements**: AI-01, AI-02, VOICE-01
**Success Criteria** (what must be TRUE):
  1. When asked, AI generates ready-to-use content (email drafts, social media posts, ad copy) not just strategic advice
  2. Voice playback intelligently skips tables and charts instead of reading them cell-by-cell
  3. Questions asked during a voice call and the AI answers appear in the chat history afterward
**Plans:** 2 plans

Plans:
- [x] 13-01-PLAN.md -- AI content generation prompts + consolidated voice text preprocessing (AI-01, AI-02)
- [x] 13-02-PLAN.md -- Voice call TTS bug fix + per-session realtime chat persistence (VOICE-01)

### Phase 14: Homepage & SEO
**Goal**: Public-facing pages reflect current branding, accurate meta-data, and support media management
**Depends on**: Nothing (independent of chat fixes)
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, SEO-01, SEO-02
**Success Criteria** (what must be TRUE):
  1. Executive bios on homepage render as regular text descriptions, not chat bubbles
  2. Homepage hero section media (photo/video) is swappable through admin CMS without code changes
  3. Social icons link to aleccimedia.com website and Facebook; X/Twitter icon is removed
  4. Sales & Marketing Checkup section is styled in red with items ordered lowest to highest value
  5. Sharing a link to the site shows "AI Boss Brainz" as title and "Your Sales and Marketing Secret Weapon" as description; contact page tagline reads "Sales and Marketing Strategy 24/7"
**Plans:** 2 plans

Plans:
- [ ] 14-01-PLAN.md -- Homepage layout updates: executive bios as text, checkup section, social icons (LAND-01, LAND-03, LAND-04)
- [ ] 14-02-PLAN.md -- Hero media CMS swap + SEO meta-data + contact tagline (LAND-02, SEO-01, SEO-02)

### Phase 15: Billing, Knowledge Base & Platform
**Goal**: Platform has upgraded billing options, external knowledge ingestion, user segmentation, and richer message interactions
**Depends on**: Phase 11
**Requirements**: BILL-01, BILL-02, KB-01, USER-01, UX-01
**Success Criteria** (what must be TRUE):
  1. Billing portal presents upgrade and downgrade options between subscription tiers
  2. Pricing page shows "Cancel Anytime" instead of "30 Money Back Guarantee"
  3. Fireflies call transcripts can be ingested into the executive knowledge base for context-aware responses
  4. Analytics dashboard distinguishes team vs client users to show only realized revenue
  5. User can apply multiple reaction types to a single message
**Plans:** 3 plans

Plans:
- [ ] 15-01-PLAN.md -- Billing portal upgrade/downgrade config + pricing copy update (BILL-01, BILL-02)
- [ ] 15-02-PLAN.md -- Fireflies transcript ingestion into knowledge base via Supabase (KB-01)
- [ ] 15-03-PLAN.md -- User categories in analytics + multi-select reactions (USER-01, UX-01)

## Progress

**Execution Order:**
Phase 11 first (critical fixes), then 12-15. Phases 12, 13, 14 can run in parallel after 11. Phase 15 after 11.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 11. Critical Fixes & Auth | v1.2 | 2/2 | Complete | 2026-02-11 |
| 12. Export & Copy Quality | v1.2 | 2/2 | Complete | 2026-02-11 |
| 13. AI Content & Voice | v1.2 | 2/2 | Complete | 2026-02-11 |
| 14. Homepage & SEO | v1.2 | 0/2 | Not started | - |
| 15. Billing, KB & Platform | v1.2 | 0/3 | Not started | - |

---
*Roadmap created: 2026-02-11*
*Last updated: 2026-02-11*
