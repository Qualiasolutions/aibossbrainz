# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Founders get instant, actionable sales and marketing strategy from AI executives
**Current focus:** v1.2 Client Feedback Sweep - Phase 15 complete

## Current Position

Phase: 15 of 15 (Billing, Knowledge Base & Platform)
Plan: 3 of 3 in current phase
Status: Phase complete
Last activity: 2026-02-11 -- Completed 15-03-PLAN.md (User Category & Multi-Select Reactions)

Progress: [#########.] 82% (9/11 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 9 (v1.2)
- Average duration: 4min
- Total execution time: 33min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 11 | 2/2 | 6min | 3min |
| 12 | 2/2 | 8min | 4min |
| 13 | 2/2 | 6min | 3min |
| 15 | 3/3 | 13min | 4min |

## Accumulated Context

### Decisions

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

### Completed

**v1.2 (In Progress):**
- 11-01: Auth rate-limit crash fix, 8-char password min, PasswordInput show/hide toggle
- 11-02: Chat error recovery with clearError, user-friendly toasts, safe auto-resume
- 12-01: PDF export rewrite -- native jsPDF text rendering, markdown parser, page-break-aware renderer
- 12-02: Copy/paste quality -- stripMarkdownForClipboard utility, clean text in clipboard from both copy locations
- 13-01: AI content generation prompts + consolidated TTS preprocessing utility with suggestions stripping
- 13-02: Voice call TTS fix (botType param), per-session realtime voice chats with titles, SWR sidebar refresh
- 15-01: Stripe billing portal with optional config ID, webhook plan-change sync, Cancel Anytime copy
- 15-02: Fireflies transcript ingestion endpoint, Supabase KB table, merged filesystem+DB KB loader, admin UI
- 15-03: Admin user category (team/client) toggle, filtered revenue analytics, multi-select reaction system

**v1.1 (Shipped 2026-02-02):**
- Phases 6-10 complete

### Blockers

(None)

### Notes

- v1.1 archives: milestones/v1.1-ROADMAP.md, milestones/v1.1-REQUIREMENTS.md
- Mailchimp module ready: lib/mailchimp/
- pnpm build fails locally due to missing env vars (Supabase URL/key) -- not a code issue
- Source: Product feedback spreadsheet from Alexandria's team (61 items, 24 selected for v1.2)
- KB migration needs to be applied via Supabase SQL Editor before ingestion works
- Run `pnpm gen:types` after migration to get proper TypeScript types
- 15-03 migration (userType default + reaction constraint) needs to be applied via Supabase SQL Editor

## Session Continuity

Last session: 2026-02-11
Stopped at: Phase 15 complete (all plans done)
Resume: Phases 14 still needs execution; all other phases complete
