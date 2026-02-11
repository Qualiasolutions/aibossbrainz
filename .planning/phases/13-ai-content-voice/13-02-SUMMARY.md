---
phase: 13-ai-content-voice
plan: 02
subsystem: voice, api
tags: [elevenlabs, tts, swr, voice-call, realtime, supabase]

# Dependency graph
requires:
  - phase: 13-01
    provides: TTS preprocessing utility (strip-markdown-tts.ts)
provides:
  - Fixed basic voice call TTS (correct botType param to /api/voice)
  - Per-session voice chats with descriptive titles in realtime path
  - SWR cache invalidation after premium voice call ends
affects: [voice, chat-history, sidebar]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-session voice chats with title derived from first user message"
    - "SWR mutate('/api/history') for sidebar refresh after voice calls"

key-files:
  created: []
  modified:
    - hooks/use-voice-call.ts
    - app/(chat)/api/realtime/stream/route.ts
    - components/premium-realtime-call.tsx

key-decisions:
  - "Voice chat titles: first 50 chars of user message, truncated at word boundary"
  - "Always update chatId to latest (each realtime call creates new chat)"

patterns-established:
  - "Voice chat title pattern: truncate at 50 chars, word boundary, ellipsis"

# Metrics
duration: 2min
completed: 2026-02-11
---

# Phase 13 Plan 02: Voice Call Persistence Summary

**Fixed voice call TTS bug (botType vs voiceId), per-session realtime voice chats with descriptive titles, and SWR sidebar refresh**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-11T17:39:45Z
- **Completed:** 2026-02-11T17:41:42Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Fixed basic voice call TTS requests that silently failed Zod validation (sent voiceId instead of botType)
- Premium realtime voice calls now create per-session chats with descriptive titles from user's question
- Sidebar chat list refreshes immediately after voice call ends via SWR cache invalidation

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix basic voice call TTS request** - `647a81a` (fix)
2. **Task 2: Per-session voice chats and SWR refresh** - `71043a3` (feat)

## Files Created/Modified
- `hooks/use-voice-call.ts` - Removed unused getVoiceForBot import, fixed fetch body to send botType instead of voiceId
- `app/(chat)/api/realtime/stream/route.ts` - Per-session chat creation with descriptive titles from user message
- `components/premium-realtime-call.tsx` - Added useSWRConfig for cache invalidation, always track latest chatId

## Decisions Made
- Voice chat titles: first 50 chars of user message truncated at word boundary with "..." suffix
- Always update voiceCallChatId to latest (not just first) since each API call creates a new chat
- Fallback title "Voice Call" only used when user message is empty (edge case)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused saveResult variable**
- **Found during:** Task 2
- **Issue:** `const saveResult = await saveMessages(...)` was unused, linter warned
- **Fix:** Changed to `await saveMessages(...)` without assignment
- **Files modified:** app/(chat)/api/realtime/stream/route.ts
- **Verification:** biome check passes clean
- **Committed in:** 71043a3 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed chatId tracking to always use latest**
- **Found during:** Task 2
- **Issue:** `if (chatId && !voiceCallChatId)` only captured first chatId; with per-session chats, redirect would go to wrong chat
- **Fix:** Changed to `if (chatId)` to always update to latest chatId
- **Files modified:** components/premium-realtime-call.tsx
- **Committed in:** 71043a3 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 13 complete (both plans done)
- Voice call persistence working across both basic and premium paths
- Ready for Phase 14

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 13-ai-content-voice*
*Completed: 2026-02-11*
