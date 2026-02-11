---
phase: 12-export-copy-quality
plan: 02
subsystem: ui
tags: [clipboard, markdown-stripping, copy-paste, ux]

# Dependency graph
requires:
  - phase: 12-export-copy-quality
    provides: "PDF rendering engine (plan 01)"
provides:
  - "lib/clipboard-utils.ts stripMarkdownForClipboard utility"
  - "Clean clipboard copy in message actions and fullscreen modal"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [markdown-stripping for clipboard, regex-based formatting removal]

key-files:
  created:
    - lib/clipboard-utils.ts
  modified:
    - components/message-actions.tsx
    - components/message-fullscreen.tsx

key-decisions:
  - "Default clipboard copy to stripped plain text (no markdown syntax) rather than raw markdown"
  - "Preserve code content inside fences (only remove fence markers and backticks)"
  - "Convert links to readable 'text (url)' format rather than dropping URLs entirely"

patterns-established:
  - "Clipboard copy pipeline: raw markdown -> stripMarkdownForClipboard() -> clean text -> copyToClipboard()"
  - "Processing order: code fences first, then inline code, then bold+italic before bold before italic"

# Metrics
duration: 2min
completed: 2026-02-11
---

# Phase 12 Plan 02: Copy/Paste Quality Summary

**Markdown stripping utility for clipboard copy so users get clean text without asterisks, hash marks, or bracket-URL patterns when pasting into emails and documents**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-11T15:28:40Z
- **Completed:** 2026-02-11T15:30:29Z
- **Tasks:** 1
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Created stripMarkdownForClipboard utility that handles all common markdown formatting patterns
- Updated both copy handlers (message actions bar + fullscreen modal) to strip markdown before clipboard write
- Handles: bold/italic (asterisks and underscores), headers, code fences, inline code, links, blockquotes, strikethrough, horizontal rules
- Preserves code content within fences (only fence markers removed)
- Converts links to readable "text (url)" format

## Task Commits

Each task was committed atomically:

1. **Task 1: Create clipboard-utils.ts and update all copy handlers** - `cc90003` (feat)

## Files Created/Modified
- `lib/clipboard-utils.ts` - stripMarkdownForClipboard function with ordered regex transforms
- `components/message-actions.tsx` - Import stripMarkdownForClipboard, wrap textFromParts before copyToClipboard
- `components/message-fullscreen.tsx` - Import stripMarkdownForClipboard, wrap content before copyToClipboard

## Decisions Made
- Stripped plain text as default copy format (matching EXPORT-04 requirement for clean text without HTML/markdown artifacts)
- Processing order: code fences -> inline code -> bold+italic -> bold -> italic -> underscores -> strikethrough -> links -> headings -> blockquotes -> whitespace cleanup
- Links converted to "text (url)" format to preserve both display text and URL in a readable way

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 12 complete (both plans done)
- Clean clipboard copy working alongside native text PDF exports
- Ready to proceed to Phase 13

## Self-Check: PASSED

- FOUND: lib/clipboard-utils.ts
- FOUND: components/message-actions.tsx
- FOUND: components/message-fullscreen.tsx
- FOUND: .planning/phases/12-export-copy-quality/12-02-SUMMARY.md
- FOUND: cc90003 commit

---
*Phase: 12-export-copy-quality*
*Completed: 2026-02-11*
