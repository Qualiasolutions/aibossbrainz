# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Founders get instant, actionable sales and marketing strategy from AI executives
**Current focus:** Quick tasks (post-v1.2 polish)

## Current Position

Phase: 15 of 15 (all complete)
Plan: 2 of 2 in phase 14 (both complete)
Status: v1.2 milestone complete
Last activity: 2026-02-15 - Completed quick task 2: Typewriter animation tuning (slower pace, cursor glow)

Progress: [###########] 100% (11/11 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 11 (v1.2)
- Average duration: 4min
- Total execution time: 41min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 11 | 2/2 | 6min | 3min |
| 12 | 2/2 | 8min | 4min |
| 13 | 2/2 | 6min | 3min |
| 14 | 2/2 | 8min | 4min |
| 15 | 3/3 | 13min | 4min |

## Accumulated Context

### Decisions

- CSP frame-src managed in vercel.json (single source of truth for security headers), not next.config.ts
- Hero media_type defaults to "none" so InteractiveChatDemo renders by default with zero behavior change
- Reaction toggle semantics: POST always toggles reaction (server checks existence), eliminates need for separate DELETE calls from client
- Reaction backward compat: GET response includes both userReactions (array) and legacy userReaction (single) field
- Revenue filter defaults to Clients Only to avoid inflating metrics with team subscriptions
- KB Supabase content: Separate admin page at /admin/knowledge-base rather than embedding in settings (server component constraint)
- KB graceful degradation: If knowledge_base_content table doesn't exist, loader silently falls back to filesystem-only
- KB types: Using 'as any' cast for untyped table queries until types are regenerated
- Portal config ID optional: STRIPE_PORTAL_CONFIG_ID env var enables plan switching; portal works with Stripe defaults if not set
- Plan change webhook reuses activateSubscription() to sync subscription type on upgrade/downgrade
- v1.2 roadmap: 5 phases (11-15), 24 requirements, standard depth
- Phase 11 first (auth is broken in production), then 12-15
- PasswordInput: all password fields use PasswordInput component, never plain Input with type=password
- PasswordInput uses forwardRef + Omit<type> for clean API; button type=button with tabIndex={-1} for toggle
- clearError pattern: Always call clearError() in useChat onError to prevent stuck error state
- Safe resume: Wrap resumeStream() in try/catch when resumable streams may be disabled server-side
- PDF export: Replace html2canvas screenshot approach with jsPDF native text API for all text PDFs; keep html2canvas only for SWOT board
- PDF rendering pipeline: markdown -> parseMarkdown() -> PDFBlock[] -> renderBlocksToPDF() -> jsPDF doc
- Clipboard copy: Default to stripped plain text (no markdown syntax) for clipboard copy; preserve code content, convert links to "text (url)" format
- Voice preprocessing: Single shared utility at lib/voice/strip-markdown-tts.ts for all TTS text cleaning
- Tables in TTS: Replaced with verbal cue instead of silent removal
- Content generation: CONTENT_GENERATION_INSTRUCTIONS constant injected per-executive with persona voice notes
- Voice chat titles: first 50 chars of user message, truncated at word boundary with "..." suffix
- Voice chatId tracking: always update to latest (each realtime call creates new per-session chat)
- Executive bios: 2-column grid cards with CMS-driven descriptions, not chat-bubble window chrome
- Checkup section: Placed between ExecutiveCards and BenefitsGrid for natural content flow
- Footer social icons: Globe (aleccimedia.com) + Facebook + LinkedIn, X/Twitter removed
- Chat animations: CSS-only with cubic-bezier(0.16, 1, 0.3, 1) easing; separate classes for user (message-enter) and assistant (assistant-enter) messages
- Thinking indicator: 3 pulsing dots (thinking-dots class) over skeleton/shimmer for assistant waiting state
- framer-motion removed from greeting.tsx and message-suggestions.tsx; kept only in landing-page-client.tsx
- Typewriter pacing: 110ms stream / 35ms catch-up / 300 gap batch threshold (tuned from 60/20/150)
- Cursor styling: 2.5px width, no scaleY transform, box-shadow glow via color-mix()

### Completed

**Quick Tasks:**
- quick-01: Chat animation revamp -- thinking dots, cursor pulse, staggered suggestions, framer-motion removed from 2 components
- quick-02: Typewriter tuning -- 110ms/word streaming, 35ms catch-up, cursor glow, removed scaleY jitter

**v1.2 (Complete):**
- 11-01: Auth rate-limit crash fix, 8-char password min, PasswordInput show/hide toggle
- 11-02: Chat error recovery with clearError, user-friendly toasts, safe auto-resume
- 12-01: PDF export rewrite -- native jsPDF text rendering, markdown parser, page-break-aware renderer
- 12-02: Copy/paste quality -- stripMarkdownForClipboard utility, clean text in clipboard from both copy locations
- 13-01: AI content generation prompts + consolidated TTS preprocessing utility with suggestions stripping
- 13-02: Voice call TTS fix (botType param), per-session realtime voice chats with titles, SWR sidebar refresh
- 15-01: Stripe billing portal with optional config ID, webhook plan-change sync, Cancel Anytime copy
- 15-02: Fireflies transcript ingestion endpoint, Supabase KB table, merged filesystem+DB KB loader, admin UI
- 15-03: Admin user category (team/client) toggle, filtered revenue analytics, multi-select reaction system
- 14-02: SEO meta-data "Your Sales and Marketing Secret Weapon", contact tagline, CMS hero media swap (none/image/video)
- 14-01: Executive bios as plain text descriptions, red checkup section ($97/$1K+/$6K), footer social icons (Globe+Facebook+LinkedIn)

**v1.1 (Shipped 2026-02-02):**
- Phases 6-10 complete

### Blockers

(None)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Revamp chat animations and loading states for professional polish | 2026-02-13 | 13e3736 | [1-revamp-chat-animations-and-loading-state](./quick/1-revamp-chat-animations-and-loading-state/) |
| 2 | Typewriter animation tuning -- slower pace, cursor glow | 2026-02-15 | 929939b | [2-create-typewriter-animation-for-agent-re](./quick/2-create-typewriter-animation-for-agent-re/) |

### Notes

- v1.1 archives: milestones/v1.1-ROADMAP.md, milestones/v1.1-REQUIREMENTS.md
- Mailchimp module ready: lib/mailchimp/
- pnpm build fails locally due to missing env vars (Supabase URL/key) -- not a code issue
- Source: Product feedback spreadsheet from Alexandria's team (61 items, 24 selected for v1.2)
- All Supabase migrations applied (knowledge_base_content table, userType default, reaction constraint)
- New migrations pending: 20260211_phase14_hero_media_cms.sql, 20260211_phase14_homepage_cms_fields.sql
- Run `pnpm gen:types` after deployment to get proper TypeScript types for knowledge_base_content
- Stripe portal requires STRIPE_PORTAL_CONFIG_ID env var + Dashboard config for plan switching
- Fireflies ingestion requires FIREFLIES_API_KEY env var

## Session Continuity

Last session: 2026-02-15
Stopped at: Quick task 2 complete (typewriter animation tuning)
Resume: Quick tasks in progress. v1.2 milestone fully complete.
