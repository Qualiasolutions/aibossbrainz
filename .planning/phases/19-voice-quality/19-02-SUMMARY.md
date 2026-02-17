---
phase: 19-voice-quality
plan: 02
subsystem: api
tags: [elevenlabs, tts, voice, request-stitching, autoplay, collaborative]

# Dependency graph
requires:
  - phase: 19-voice-quality-01
    provides: Centralized voice config, optimize_streaming_latency, shared markdown stripping
provides:
  - Prosody-aligned collaborative audio via ElevenLabs request stitching
  - Browser autoplay-compliant greeting audio with user gesture gate
  - Streaming endpoint usage for collaborative segments (lower TTFB)
affects: [voice, collaborative-mode, greeting-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ElevenLabs request stitching via previous_request_ids (max 3, 2-hour expiry)"
    - "Sequential collaborative segment generation (not parallel) for prosody alignment"
    - "User gesture gate for audio autoplay compliance (click/keydown listeners)"

key-files:
  created: []
  modified:
    - app/(chat)/api/voice/route.ts
    - app/(chat)/api/realtime/stream/route.ts
    - hooks/use-greeting-speech.ts

key-decisions:
  - "Sequential generation over parallel for collaborative segments -- request stitching requires ordered request IDs"
  - "Max 3 previous_request_ids per ElevenLabs docs (2-hour expiry window)"
  - "User gesture gate uses both click and keydown events for accessibility"
  - "sessionStorage marking moved into gesture handler to avoid false positives (marking greeted before audio actually plays)"

patterns-established:
  - "Request stitching: capture request-id from Response headers outside resilience wrapper, before .arrayBuffer()"
  - "Autoplay compliance: document-level event listeners with cleanup, not setTimeout"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 19 Plan 02: Request Stitching & Gesture Gate Summary

**ElevenLabs request stitching for prosody-aligned collaborative audio and browser autoplay-compliant greeting via user gesture gate**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-16T23:56:38Z
- **Completed:** 2026-02-16T23:59:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Collaborative audio segments now use `previous_request_ids` for prosody-aligned concatenation (eliminates pops/clicks at segment boundaries)
- Both voice routes switched to streaming endpoint (`/stream`) for collaborative segments, reducing TTFB
- Greeting audio waits for user click or keydown before playing (browser autoplay policy compliant)
- Sequential generation replaces `Promise.all` for collaborative segments, enabling request ID chaining

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement request stitching for collaborative segments** - `96c07d5` (feat)
2. **Task 2: Gate greeting audio behind user gesture** - `3d9794b` (fix)

## Files Created/Modified
- `app/(chat)/api/voice/route.ts` - Request stitching with sequential generation, streaming endpoint for collaborative, request-id capture
- `app/(chat)/api/realtime/stream/route.ts` - Same request stitching pattern, single-voice path updated for new return type
- `hooks/use-greeting-speech.ts` - Replaced setTimeout auto-play with click/keydown gesture listeners

## Decisions Made
- Sequential generation chosen over parallel because request stitching requires ordered request IDs from previous segments
- Max 3 previous_request_ids per ElevenLabs API documentation (2-hour expiry window)
- Both click and keydown events used for gesture detection to cover keyboard-only users
- sessionStorage marking moved inside the gesture handler (was previously set before audio played, causing false "already greeted" state)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed single-voice path in realtime stream route**
- **Found during:** Task 1 (request stitching implementation)
- **Issue:** Changing `generateAudioForSegment` return type from `Promise<ArrayBuffer>` to `Promise<{ buffer, requestId }>` broke the single-voice path which destructured the result directly as `audioData`
- **Fix:** Updated single-voice call to destructure `{ buffer: audioData }` from the result
- **Files modified:** `app/(chat)/api/realtime/stream/route.ts`
- **Verification:** Lint passes, all code paths consistent with new return type
- **Committed in:** 96c07d5 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for return type consistency. No scope creep.

## Issues Encountered
None - plan executed cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 19 (Voice Quality) complete -- both plans executed
- Ready for Phase 20 (observability and cost controls)
- No blockers

## Self-Check: PASSED

All files exist. All commits verified (96c07d5, 3d9794b).

---
*Phase: 19-voice-quality*
*Completed: 2026-02-17*
