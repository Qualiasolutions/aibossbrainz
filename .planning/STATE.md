# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Founders get instant, actionable sales and marketing strategy from AI executives
**Current focus:** v1.2 Client Feedback Sweep - Phase 13 in progress

## Current Position

Phase: 13 of 15 (AI Content & Voice)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-02-11 -- Completed 13-01-PLAN.md (AI Content Generation & Voice Preprocessing)

Progress: [#####.....] 45% (5/11 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 5 (v1.2)
- Average duration: 4min
- Total execution time: 18min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 11 | 2/2 | 6min | 3min |
| 12 | 2/2 | 8min | 4min |
| 13 | 1/2 | 4min | 4min |

## Accumulated Context

### Decisions

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

### Completed

**v1.2 (In Progress):**
- 11-01: Auth rate-limit crash fix, 8-char password min, PasswordInput show/hide toggle
- 11-02: Chat error recovery with clearError, user-friendly toasts, safe auto-resume
- 12-01: PDF export rewrite -- native jsPDF text rendering, markdown parser, page-break-aware renderer
- 12-02: Copy/paste quality -- stripMarkdownForClipboard utility, clean text in clipboard from both copy locations
- 13-01: AI content generation prompts + consolidated TTS preprocessing utility with suggestions stripping

**v1.1 (Shipped 2026-02-02):**
- Phases 6-10 complete

### Blockers

(None)

### Notes

- v1.1 archives: milestones/v1.1-ROADMAP.md, milestones/v1.1-REQUIREMENTS.md
- Mailchimp module ready: lib/mailchimp/
- pnpm build fails locally due to missing env vars (Supabase URL/key) -- not a code issue
- Source: Product feedback spreadsheet from Alexandria's team (61 items, 24 selected for v1.2)

## Session Continuity

Last session: 2026-02-11
Stopped at: Phase 13, plan 1 complete
Resume: Continue with 13-02-PLAN.md
