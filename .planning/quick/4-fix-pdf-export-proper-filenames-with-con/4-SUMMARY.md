---
phase: quick-4
plan: 01
subsystem: ui
tags: [pdf-export, jspdf, suggestions, filename]

requires:
  - phase: none
    provides: none
provides:
  - Topic-based PDF filenames with timestamps across all 3 export paths
  - Conversation title header in individual message PDFs
  - Three-tier suggestion JSON stripping (code block, regex, parse fallback)
affects: [pdf-export, conversation-export, message-actions, message-fullscreen]

tech-stack:
  added: []
  patterns:
    - "chatTopic prop threaded from page through component tree for PDF context"
    - "Three-tier detection pattern for unreliable AI output formats"

key-files:
  created: []
  modified:
    - app/(chat)/chat/[id]/page.tsx
    - components/chat-with-error-boundary.tsx
    - components/chat.tsx
    - components/messages.tsx
    - components/message.tsx
    - components/message-actions.tsx
    - components/message-fullscreen.tsx
    - lib/pdf-export.ts
    - lib/ai/parse-suggestions.ts

key-decisions:
  - "Use chat.topic || chat.title as chatTopic (topic is AI-classified, title is AI-generated fallback)"
  - "Initialize contentWithoutSuggestions to original text for safe fallback"
  - "chatTitle does not need memo comparison since it comes from DB and is stable during a session"

patterns-established:
  - "PDF filename pattern: {SafeTopic}-{ExecutiveFirstName}-{ISO-Timestamp}.pdf"
  - "Three-tier suggestion stripping: code block regex -> raw JSON regex -> JSON.parse fallback"

duration: 9min
completed: 2026-02-22
---

# Quick Task 4: Fix PDF Export Filenames with Conversation Topic Summary

**Topic-based PDF filenames with timestamps, conversation title headers in individual message PDFs, and hardened suggestion JSON stripping with three-tier detection**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-22T01:44:17Z
- **Completed:** 2026-02-22T01:53:17Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- All 3 PDF export paths now produce filenames like `Brand-Strategy-Alexandria-2026-02-22T14-30-00.pdf`
- Individual message PDFs render the conversation topic as a title line above the executive name/role header
- Conversation export uses actual `chat.topic` (or `chat.title` fallback) instead of first 50 chars of user message
- Suggestion JSON stripping hardened with three-tier detection to prevent leakage into PDFs

## Task Commits

1. **Task 1: Thread chatTopic prop and fix filenames across all export paths** - `d199b80` (feat)
2. **Task 2: Harden suggestion JSON stripping in parseSuggestions** - `ba30095` (fix)

## Files Created/Modified
- `app/(chat)/chat/[id]/page.tsx` - Added chatTopic prop (chat.topic || chat.title) to ChatWithErrorBoundary
- `components/chat.tsx` - Added chatTopic to ChatProps, replaced first-50-chars logic with chatTopic for conversation export
- `components/messages.tsx` - Thread chatTopic to PreviewMessage and MessageFullscreen
- `components/message.tsx` - Pass chatTitle to MessageActions and onFullscreen callback
- `components/message-actions.tsx` - Topic-based filename with timestamp, pass chatTitle to exportToPDF
- `components/message-fullscreen.tsx` - Topic-based filename with timestamp, pass chatTitle to exportToPDF
- `lib/pdf-export.ts` - Accept optional chatTitle parameter, render as title above executive header
- `lib/ai/parse-suggestions.ts` - Updated regex for both key orders, added parse-based fallback

## Decisions Made
- `chat.topic || chat.title` chosen as the topic source: topic is the AI-classified label (best), title is the AI-generated name (reasonable fallback). The previous approach of taking the first 50 chars of the first user message was the worst option.
- `contentWithoutSuggestions` initialized to original text rather than left uninitialized, ensuring safe fallback.
- chatTitle/chatTopic excluded from memo comparison checks since the value comes from the DB and doesn't change during a session.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PDF export system is complete with proper filenames and headers
- Suggestion stripping is robust against AI format variations

---
*Quick Task: 4-fix-pdf-export-proper-filenames-with-con*
*Completed: 2026-02-22*
