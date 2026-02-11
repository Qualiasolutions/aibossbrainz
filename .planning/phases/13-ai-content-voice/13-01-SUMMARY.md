---
phase: 13-ai-content-voice
plan: 01
subsystem: ai, voice
tags: [elevenlabs, tts, system-prompts, regex, markdown-stripping]

requires:
  - phase: 12-export-copy-quality
    provides: stripMarkdownForClipboard pattern (separate utility, not modified)
provides:
  - CONTENT_GENERATION_INSTRUCTIONS in executive system prompts
  - Shared stripMarkdownForTTS utility at lib/voice/strip-markdown-tts.ts
  - parseCollaborativeSegments exported from shared utility
  - Suggestions JSON stripping in all voice paths (bug fix)
  - Table verbal cue replacement for TTS
affects: [13-02, voice, ai-prompts]

tech-stack:
  added: []
  patterns: [shared-voice-preprocessing, content-generation-prompts]

key-files:
  created:
    - lib/voice/strip-markdown-tts.ts
  modified:
    - lib/bot-personalities.ts
    - app/(chat)/api/voice/route.ts
    - app/(chat)/api/realtime/stream/route.ts
    - hooks/use-auto-speak.ts

key-decisions:
  - "Single shared utility for all TTS text preprocessing instead of per-file duplication"
  - "Tables replaced with verbal cue instead of silent removal for better UX"
  - "Content generation instructions kept concise to avoid prompt bloat"

patterns-established:
  - "Voice preprocessing: All voice paths import from lib/voice/strip-markdown-tts.ts"
  - "Content generation: CONTENT_GENERATION_INSTRUCTIONS constant injected per-executive with voice notes"

duration: 4min
completed: 2026-02-11
---

# Phase 13 Plan 01: AI Content & Voice Summary

**Content generation instructions in all executive prompts plus consolidated TTS text preprocessing utility with suggestions stripping and table verbal cues**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-11T17:31:51Z
- **Completed:** 2026-02-11T17:36:35Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- All three executive system prompts (Alexandria, Kim, Collaborative) now instruct the AI to produce actual deliverables (email drafts, social posts, ad copy) when asked, with persona-specific voice guidelines
- Voice text preprocessing consolidated from 3 duplicated implementations into one shared utility at lib/voice/strip-markdown-tts.ts
- Fixed bug where /api/voice route was not stripping suggestions JSON blocks before TTS
- Tables now produce a verbal cue ("I've included a table in the text version") instead of being silently dropped

## Task Commits

Each task was committed atomically:

1. **Task 1: Add content generation instructions to executive system prompts** - `6c5dfee` (feat)
2. **Task 2: Consolidate voice text preprocessing into shared utility** - `bf8eea8` (refactor)

## Files Created/Modified
- `lib/bot-personalities.ts` - Added CONTENT_GENERATION_INSTRUCTIONS constant, injected into all 3 executive prompts
- `lib/voice/strip-markdown-tts.ts` - New shared utility exporting stripMarkdownForTTS and parseCollaborativeSegments
- `app/(chat)/api/voice/route.ts` - Removed local MARKDOWN_PATTERNS, stripMarkdown, parseCollaborativeSegments; imports from shared utility
- `app/(chat)/api/realtime/stream/route.ts` - Removed local MARKDOWN_PATTERNS, stripMarkdown, parseCollaborativeSegments; imports from shared utility
- `hooks/use-auto-speak.ts` - Replaced inline code-block stripping with shared stripMarkdownForTTS call

## Decisions Made
- Kept CONTENT_GENERATION_INSTRUCTIONS concise (no per-content-type detailed templates) to avoid prompt bloat per research findings
- Used line-by-line table detection for verbal cue replacement instead of regex-only approach for accurate contiguous block detection
- Preserved generateAudioForSegment functions in their respective route files since they have different signatures (voice route has AbortController support)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Content generation prompts active for all executives
- Shared voice preprocessing utility ready for any future voice path additions
- Ready for 13-02 (knowledge base and remaining voice improvements)

---
*Phase: 13-ai-content-voice*
*Completed: 2026-02-11*
