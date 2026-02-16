---
phase: 19-voice-quality
plan: 01
subsystem: api
tags: [elevenlabs, tts, voice, streaming, latency]

# Dependency graph
requires:
  - phase: 16-model-resilience
    provides: withElevenLabsResilience wrapper used in all voice routes
provides:
  - Centralized voice config usage across all TTS routes
  - Shared markdown stripping in realtime route
  - optimize_streaming_latency in all ElevenLabs API calls
affects: [19-02-PLAN, voice routes, ElevenLabs integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All voice routes use getVoiceConfig() from voice-config.ts for model/settings"
    - "All voice routes use stripMarkdownForTTS() for text preprocessing"
    - "All ElevenLabs API calls include optimize_streaming_latency: 2 in JSON body"

key-files:
  created: []
  modified:
    - app/(chat)/api/realtime/route.ts
    - app/(chat)/api/voice/route.ts
    - app/(chat)/api/realtime/stream/route.ts

key-decisions:
  - "optimize_streaming_latency level 2 (not 3 or 4) to avoid text normalization issues with numbers, dates, and currency"
  - "Realtime route switched to streaming endpoint (/stream) for lower TTFB, consistent with voice route"

patterns-established:
  - "All ElevenLabs TTS calls include optimize_streaming_latency: 2"
  - "Voice config centralized in lib/ai/voice-config.ts, never hardcoded in routes"

# Metrics
duration: 3min
completed: 2026-02-17
---

# Phase 19 Plan 01: Config Drift, Streaming Latency Summary

**Centralized voice config and markdown stripping in realtime route, added optimize_streaming_latency: 2 to all four ElevenLabs API calls across three voice routes**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-16T23:48:31Z
- **Completed:** 2026-02-16T23:51:31Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Realtime route now uses getVoiceConfig(botType) instead of hardcoded eleven_flash_v2_5 model and mismatched voice settings
- Realtime route now uses shared stripMarkdownForTTS() instead of inline regex chain that missed suggestions blocks, executive markers, tables, blockquotes, and horizontal rules
- All four ElevenLabs API calls (realtime, voice single-path, voice generateAudioForSegment, realtime/stream generateAudioForSegment) now include optimize_streaming_latency: 2 for faster time-to-first-byte
- Realtime route switched to streaming endpoint (/stream) with Accept: audio/mpeg header

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix realtime route config drift and markdown stripping** - `41efbdd` (fix)
2. **Task 2: Add optimize_streaming_latency to voice route** - `0208c88` (feat)
3. **Task 3: Add optimize_streaming_latency to realtime/stream route** - `6eca4f6` (feat)

## Files Created/Modified
- `app/(chat)/api/realtime/route.ts` - Replaced hardcoded model/settings with getVoiceConfig, replaced inline regex with stripMarkdownForTTS, switched to streaming endpoint, added optimize_streaming_latency
- `app/(chat)/api/voice/route.ts` - Added optimize_streaming_latency: 2 to both ElevenLabs API calls (single-voice path and generateAudioForSegment)
- `app/(chat)/api/realtime/stream/route.ts` - Added optimize_streaming_latency: 2 to generateAudioForSegment API call

## Decisions Made
- Used optimize_streaming_latency level 2 (not 3 or 4) to preserve text normalization quality for numbers, dates, and currency amounts per research findings
- Switched realtime route to streaming endpoint for consistency with voice route and lower TTFB

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All voice routes now have consistent config, shared utilities, and latency optimization
- Ready for Plan 02 (streaming pipeline and chunk management)

## Self-Check: PASSED

All files verified present. All 3 commit hashes found in git log.

---
*Phase: 19-voice-quality*
*Completed: 2026-02-17*
