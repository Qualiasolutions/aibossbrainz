# Phase 19: Voice Quality - Research

**Researched:** 2026-02-17
**Domain:** ElevenLabs TTS API, MP3 audio processing, browser autoplay policies
**Confidence:** HIGH

## Summary

Phase 19 addresses six audit findings (1 critical, 5 high) in the voice subsystem. The codebase has three voice API routes (`/api/voice`, `/api/realtime`, `/api/realtime/stream`) with varying levels of quality. The main `/api/voice` route is well-structured with resilience patterns, but the collaborative multi-voice concatenation uses raw buffer joining (C-9). The `/api/realtime` route has config drift -- it hardcodes `eleven_flash_v2_5` model and inline voice settings instead of using `voice-config.ts` (H-17), and duplicates markdown stripping with weaker regex (H-21). None of the routes send `optimize_streaming_latency` (H-15), and collaborative segments use the non-streaming endpoint doubling latency (H-16). The greeting hook auto-plays without user gesture (H-18).

All six issues are well-understood with clear fixes. The ElevenLabs API parameters are stable and documented. MP3 frame boundary detection is a solved problem with established libraries. Browser autoplay policies are well-documented and consistent across modern browsers. The primary risk is the MP3 concatenation fix (VOICE-01), which requires either proper frame-aligned concatenation or leveraging ElevenLabs' request stitching feature to avoid the problem entirely.

**Primary recommendation:** Use ElevenLabs request stitching (`previous_request_ids`) for collaborative segments to avoid MP3 frame boundary issues, switch all collaborative segments to the streaming endpoint, add `optimize_streaming_latency` parameter, centralize all TTS config through `voice-config.ts`, and gate greeting audio behind user gesture.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ElevenLabs REST API | v1 | Text-to-speech | Already in use, direct fetch calls with resilience wrapper |
| `eleven_turbo_v2_5` model | current | TTS model | Already configured in `voice-config.ts`, good quality/latency balance (~250-300ms TTFB) |

### Supporting (New)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| codec-parser | 2.5.0 | MP3 frame boundary detection | Only if request stitching approach is insufficient for VOICE-01 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| codec-parser for MP3 frames | Hand-rolled sync word detection (0xFFE0) | Simple but fragile; codec-parser handles edge cases (VBR, ID3 tags) |
| codec-parser for MP3 frames | ElevenLabs request stitching (`previous_request_ids`) | **Preferred** -- avoids client-side frame parsing entirely by having ElevenLabs produce prosody-consistent audio across segments |
| Direct fetch API calls | `elevenlabs` npm SDK | SDK adds dependency; current fetch+resilience pattern is clean and working |

**No new installation needed** if using request stitching approach (recommended). If frame detection fallback is needed:
```bash
pnpm add codec-parser
```

## Architecture Patterns

### Current Voice File Structure
```
app/(chat)/api/
├── voice/route.ts           # Main TTS (manual play + auto-speak) - GOOD
├── realtime/route.ts        # Realtime voice call TTS - HAS DRIFT (H-17, H-21)
└── realtime/stream/route.ts # Realtime streaming TTS - USES voice-config.ts correctly
lib/
├── ai/voice-config.ts       # Single source of truth for voice settings
├── voice/
│   ├── strip-markdown-tts.ts  # Shared TTS text preprocessing
│   └── service-status.ts     # Voice service availability tracking
hooks/
├── use-auto-speak.ts        # Auto-speak after streaming completes
├── use-greeting-speech.ts   # Greeting audio on first visit - AUTOPLAY ISSUE (H-18)
├── use-voice-player.ts      # Manual voice playback
└── use-voice-call.ts        # Voice call dialog management
components/
├── voice-player-button.tsx  # Manual play button per message
└── chat/voice-call-dialog.tsx # Voice call UI
lib/audio-manager.ts         # Global audio state management
```

### Pattern 1: Centralized Voice Config
**What:** All TTS calls derive model, voice ID, and settings from `voice-config.ts`
**When to use:** Every ElevenLabs API call in the codebase
**Current violation:** `/api/realtime/route.ts` hardcodes `model_id: "eleven_flash_v2_5"`, `stability: 0.5`, `similarity_boost: 0.75`, `style: 0.0` instead of using `getVoiceConfig(botType)`
**Fix:** Replace inline config with `getVoiceConfig(botType)` import, same as `/api/voice/route.ts` and `/api/realtime/stream/route.ts` already do

### Pattern 2: Shared TTS Text Preprocessing
**What:** All text-to-speech conversion uses `stripMarkdownForTTS()` from `lib/voice/strip-markdown-tts.ts`
**When to use:** Before any text is sent to ElevenLabs
**Current violation:** `/api/realtime/route.ts` lines 98-108 have inline regex stripping that is weaker than the shared utility (misses suggestions blocks, executive markers, tables, blockquotes, horizontal rules)
**Fix:** Import and use `stripMarkdownForTTS()` from the shared module

### Pattern 3: ElevenLabs Request Stitching for Multi-Voice
**What:** Use `previous_request_ids` to maintain audio continuity across collaborative segments
**When to use:** Collaborative mode where multiple segments from different speakers are generated sequentially
**How it works:**
1. Generate first segment, capture `request-id` from response headers
2. Pass captured ID(s) in `previous_request_ids` for subsequent segments
3. Concatenate resulting audio buffers (now prosody-aligned by ElevenLabs)
**Constraint:** Segments must be generated sequentially (not in parallel) to capture request IDs. This changes the current `Promise.all` pattern but improves audio quality.
**Constraint:** Max 3 `previous_request_ids` per call. Request IDs expire after 2 hours.
**Constraint:** Not available with `eleven_v3` model (not an issue -- project uses `eleven_turbo_v2_5`)

### Pattern 4: User Gesture Gate for Audio
**What:** Audio playback requires a user interaction (click/tap) before first play
**When to use:** Any auto-playing audio (greetings, notifications)
**Implementation:** Show a "Click to enable audio" button or defer greeting until user's first click on the page

### Anti-Patterns to Avoid
- **Raw MP3 buffer concatenation:** Joining `Uint8Array` buffers from separate ElevenLabs calls produces corrupt audio at segment boundaries because MP3 frames may not align. Use request stitching or frame-aligned concatenation instead.
- **Parallel TTS generation for collaborative segments:** When using request stitching, segments MUST be sequential to capture request IDs. The current `Promise.all` is faster but produces glitchy audio.
- **Inline TTS config in route handlers:** Creates config drift. Always import from `voice-config.ts`.
- **Duplicate markdown stripping logic:** Creates inconsistency. Always import from `strip-markdown-tts.ts`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MP3 frame boundary detection | Custom sync word scanner | ElevenLabs request stitching (`previous_request_ids`) | Avoids binary parsing entirely; ElevenLabs handles prosody continuity server-side |
| MP3 frame parsing (fallback) | Manual 0xFFE0 detection | `codec-parser` npm package | Handles VBR, ID3 tags, false sync patterns; hand-rolled parsers miss edge cases |
| Audio continuity across segments | Crossfade/overlap logic | ElevenLabs `previous_text` / `previous_request_ids` | Purpose-built API feature for exactly this problem |
| Browser autoplay detection | Custom feature detection | `audio.play()` promise rejection + catch | Standard browser API; play() returns rejected promise when blocked |
| TTS text preprocessing | Per-route regex chains | Shared `stripMarkdownForTTS()` | Already exists, handles suggestions, tables, executive markers, code blocks |

**Key insight:** The codebase already has the right abstractions (`voice-config.ts`, `strip-markdown-tts.ts`). The problem is not missing infrastructure -- it's inconsistent usage of existing infrastructure plus one genuinely hard problem (MP3 concatenation) that ElevenLabs' request stitching solves.

## Common Pitfalls

### Pitfall 1: Silent Autoplay Failure
**What goes wrong:** `audio.play()` silently fails in browsers without user gesture, greeting never plays
**Why it happens:** Chrome, Firefox, and Safari all block `audio.play()` without prior user interaction. The `play()` promise rejects with `NotAllowedError` but the code may not surface this.
**How to avoid:** Require user gesture before first audio playback. For greeting: defer until user clicks any element on the page, or show a "Click to hear greeting" button.
**Warning signs:** Greeting audio works in dev (localhost exempted by some browsers) but fails in production.

### Pitfall 2: Request Stitching Requires Sequential Generation
**What goes wrong:** Attempting to use `previous_request_ids` with parallel `Promise.all` fails because request IDs aren't available until each response completes
**Why it happens:** Request IDs come from response headers, which are only available after the request completes
**How to avoid:** Generate collaborative segments sequentially with `for...of` loop instead of `Promise.all`. Each call passes the previous call's request ID.
**Warning signs:** Slightly higher latency for collaborative mode (sequential vs parallel), but much better audio quality

### Pitfall 3: Config Drift Between Routes
**What goes wrong:** Realtime route uses `eleven_flash_v2_5` while voice-config.ts specifies `eleven_turbo_v2_5`; voice settings differ
**Why it happens:** Routes were developed at different times; realtime route was hardcoded for speed
**How to avoid:** All routes import from `voice-config.ts`. No TTS parameters hardcoded in route files.
**Warning signs:** Different audio quality/voice between chat playback and realtime voice calls

### Pitfall 4: optimize_streaming_latency on Flash/Turbo Models
**What goes wrong:** Parameter may have diminishing returns on models already optimized for latency
**Why it happens:** Flash v2.5 and Turbo v2.5 are inherently low-latency. The `optimize_streaming_latency` parameter was designed for older, higher-latency models.
**How to avoid:** Use value `2` or `3` (not `4` which disables text normalization and can mispronounce numbers/dates). Test that audio quality remains acceptable.
**Warning signs:** Mispronounced numbers, dates, or currency amounts (especially at level 4)

### Pitfall 5: Streaming vs Non-Streaming Endpoint Confusion
**What goes wrong:** Using non-streaming endpoint (`/v1/text-to-speech/{voice_id}`) when streaming (`/v1/text-to-speech/{voice_id}/stream`) would reduce time-to-first-byte
**Why it happens:** Non-streaming returns complete audio buffer; streaming sends chunks as generated
**How to avoid:** For collaborative segments, use streaming endpoint. For the main voice route, it already uses streaming correctly.
**Warning signs:** `/stream` suffix missing from collaborative segment API calls in `generateAudioForSegment()`

## Code Examples

### VOICE-01: Request Stitching for Collaborative Segments
```typescript
// Source: ElevenLabs request stitching docs
// Replace Promise.all with sequential generation using previous_request_ids

async function generateCollaborativeAudio(
  segments: Array<{ speaker: 'alexandria' | 'kim'; text: string }>,
  apiKey: string,
): Promise<Uint8Array> {
  const audioBuffers: ArrayBuffer[] = [];
  const previousRequestIds: string[] = [];

  for (const segment of segments) {
    const voiceConfig = getVoiceConfig(segment.speaker);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: segment.text,
          model_id: voiceConfig.modelId,
          voice_settings: {
            stability: voiceConfig.settings.stability,
            similarity_boost: voiceConfig.settings.similarityBoost,
            style: voiceConfig.settings.style ?? 0,
            use_speaker_boost: voiceConfig.settings.useSpeakerBoost ?? true,
          },
          previous_request_ids: previousRequestIds.slice(-3), // Max 3
          optimize_streaming_latency: 2,
        }),
      },
    );

    // Capture request ID from response headers
    const requestId = response.headers.get('request-id');
    if (requestId) {
      previousRequestIds.push(requestId);
    }

    const buffer = await response.arrayBuffer();
    audioBuffers.push(buffer);
  }

  // Concatenate buffers (now prosody-aligned by ElevenLabs)
  const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of audioBuffers) {
    combined.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  return combined;
}
```

### VOICE-02: Adding optimize_streaming_latency
```typescript
// Source: ElevenLabs API docs - stream endpoint query parameter
// Add to ALL ElevenLabs fetch calls

// Option A: As query parameter (recommended)
const url = new URL(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}/stream`
);
url.searchParams.set('optimize_streaming_latency', '2');

// Option B: In request body (also works per docs)
body: JSON.stringify({
  text: cleanText,
  model_id: voiceConfig.modelId,
  voice_settings: { ... },
  optimize_streaming_latency: 2, // 0-4 scale
}),
```

### VOICE-04: Fix Realtime Route Config Drift
```typescript
// Current (broken) - app/(chat)/api/realtime/route.ts lines 117-137
// Hardcodes: model_id: "eleven_flash_v2_5", stability: 0.5, etc.

// Fixed: import from voice-config.ts
import { getVoiceConfig } from '@/lib/ai/voice-config';

const voiceConfig = getVoiceConfig(botType);
const ttsResponse = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}/stream`,
  {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: cleanText,
      model_id: voiceConfig.modelId,
      voice_settings: {
        stability: voiceConfig.settings.stability,
        similarity_boost: voiceConfig.settings.similarityBoost,
        style: voiceConfig.settings.style ?? 0,
        use_speaker_boost: voiceConfig.settings.useSpeakerBoost ?? true,
      },
      optimize_streaming_latency: 2,
    }),
  },
);
```

### VOICE-05: User Gesture Gate for Greeting
```typescript
// Source: Chrome autoplay policy, MDN autoplay guide
// Current (broken): useGreetingSpeech auto-calls speak() after 500ms timeout
// Fixed: Wait for first user interaction before playing greeting

// In use-greeting-speech.ts:
useEffect(() => {
  if (!enabled || hasGreetedRef.current) return;

  const greeted = sessionStorage.getItem(SESSION_KEY);
  if (greeted) {
    hasGreetedRef.current = true;
    return;
  }

  // Instead of setTimeout, wait for user gesture
  const handleUserGesture = () => {
    if (hasGreetedRef.current) return;
    hasGreetedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, 'true');

    // Remove listeners
    document.removeEventListener('click', handleUserGesture);
    document.removeEventListener('keydown', handleUserGesture);

    // Now safe to play audio
    const greetingText = GREETINGS[botType];
    speak(greetingText);
  };

  document.addEventListener('click', handleUserGesture, { once: true });
  document.addEventListener('keydown', handleUserGesture, { once: true });

  return () => {
    document.removeEventListener('click', handleUserGesture);
    document.removeEventListener('keydown', handleUserGesture);
  };
}, [botType, enabled, speak]);
```

### VOICE-06: Fix Realtime Route Markdown Stripping
```typescript
// Current (broken) - app/(chat)/api/realtime/route.ts lines 98-108
// Inline regex chain that misses suggestions, tables, executive markers

// Fixed: import shared utility
import { stripMarkdownForTTS } from '@/lib/voice/strip-markdown-tts';

const cleanText = stripMarkdownForTTS(responseText).slice(0, 4000);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `optimize_streaming_latency` param | Flash/Turbo models with built-in low latency | 2024-2025 | Parameter still works but has diminishing returns on already-fast models |
| Raw MP3 concatenation | Request stitching via `previous_request_ids` | 2024 | ElevenLabs handles prosody continuity server-side |
| `eleven_monolingual_v1` | `eleven_multilingual_v2` / `eleven_turbo_v2_5` | Deprecated 2025-12-15 | v1 models being removed |
| Non-streaming TTS for all calls | Streaming endpoint (`/stream`) | Stable | Lower time-to-first-byte |

**Deprecated/outdated:**
- `eleven_monolingual_v1` and `eleven_multilingual_v1`: Deprecated, removed 2025-12-15. Migrate to v2+.
- `optimize_streaming_latency` at level 4: Disables text normalization, causes mispronunciation. Use level 2-3 max.

## Open Questions

1. **Request stitching latency tradeoff for collaborative mode**
   - What we know: Sequential generation is slower than parallel `Promise.all`, but produces better audio continuity
   - What's unclear: Exact latency increase for typical collaborative responses (2-4 segments)
   - Recommendation: Implement sequential with request stitching. If latency is unacceptable, fall back to parallel with `previous_text` parameter (text-based continuity, no request IDs needed, can run in parallel)

2. **optimize_streaming_latency effectiveness on Turbo v2.5**
   - What we know: Turbo v2.5 already has ~250-300ms TTFB. Parameter may not significantly improve this.
   - What's unclear: Whether quality degradation at level 2-3 is noticeable on turbo models
   - Recommendation: Add at level 2, verify quality in manual testing. The audit specifically flagged this as missing, so add it regardless.

3. **Greeting audio UX after user gesture gate**
   - What we know: Current greeting fires 500ms after page load. New approach waits for first click/keydown.
   - What's unclear: Whether the greeting feels natural when triggered by clicking the chat input vs. a random UI element
   - Recommendation: Listen for first user gesture (click or keydown) on the document, then play greeting. The slight delay will feel natural since user just interacted.

## Sources

### Primary (HIGH confidence)
- ElevenLabs API docs: [Stream speech endpoint](https://elevenlabs.io/docs/api-reference/text-to-speech/stream) - all parameters verified
- ElevenLabs API docs: [Create speech endpoint](https://elevenlabs.io/docs/api-reference/text-to-speech/convert) - `optimize_streaming_latency` confirmed 0-4 scale
- ElevenLabs docs: [Request stitching](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/text-to-speech/request-stitching) - `previous_request_ids`, max 3, 2-hour expiry, not available on v3
- ElevenLabs docs: [Models](https://elevenlabs.io/docs/overview/models) - model IDs and deprecation dates confirmed
- Chrome developer docs: [Autoplay policy](https://developer.chrome.com/blog/autoplay) - user gesture requirement
- MDN: [Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) - cross-browser autoplay policies
- Codebase analysis: Direct reading of all 10+ voice-related files (routes, hooks, lib modules)

### Secondary (MEDIUM confidence)
- [codec-parser npm](https://www.npmjs.com/package/codec-parser) v2.5.0 - MP3 frame parsing capabilities verified via GitHub README
- [MP3 frame header spec](http://www.mp3-tech.org/programmer/frame_header.html) - sync word 0xFFE0 (11 bits) confirmed
- ElevenLabs blog: [Meet Flash](https://elevenlabs.io/blog/meet-flash) - Flash v2.5 ~75ms TTFB

### Tertiary (LOW confidence)
- None. All findings verified with official sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - ElevenLabs API is already in production use; parameters verified against official docs
- Architecture: HIGH - All code paths read and analyzed; violations clearly identified with line numbers
- Pitfalls: HIGH - Autoplay policies are well-documented standards; MP3 framing is established spec; request stitching has official docs

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (ElevenLabs API is stable; 30-day validity appropriate)
