# Phase 32: Voice Call Redesign - Research

**Researched:** 2026-03-02
**Domain:** Voice UI Architecture, Real-Time Communication, React Component Patterns
**Confidence:** HIGH

## Summary

Phase 32 restructures the app's voice architecture by separating text chat from voice calls. Currently, the app has TTS auto-playback, per-message voice buttons, and inline voice mode scattered across the chat interface. This creates UX confusion and couples voice tightly to chat messages.

The redesign removes all voice features from chat (making it text-only) and introduces a dedicated "Call" button in the sidebar that opens a premium, minimalist real-time voice call experience. Users select Alexandria or Kim, then engage in a live voice conversation with the AI agent.

The existing `/api/realtime/*` endpoints, `lib/ai/voice-config.ts`, and ElevenLabs integration remain intact — they're already production-ready. The work is primarily **UI restructuring** (remove voice from chat, build call interface) plus **component deletion** (auto-speak, greeting speech, voice player button, inline voice mode).

**Primary recommendation:** Use the existing `/api/realtime/stream` endpoint as the backend for the call UI. Build a modal-based call interface with browser SpeechRecognition for input, existing TTS infrastructure for output, and clean visual feedback (waveform visualization, speaking indicators). Remove VoicePlayerButton, useAutoSpeak, useGreetingSpeech, useInlineVoice, and sidebar voice/clear buttons.

## Standard Stack

### Core Voice Technologies (Already Implemented)

| Library/API | Version/Status | Purpose | Why Standard |
|-------------|---------------|---------|--------------|
| ElevenLabs API | Turbo v2.5 | Text-to-speech generation | Industry-leading voice quality, prosody-aligned multi-speaker via request stitching |
| Web Speech API | Browser Native | Speech-to-text recognition (SpeechRecognition) | Native browser API, no dependencies, used in production by useInlineVoice |
| Browser MediaRecorder | Browser Native | Audio recording (optional upgrade path) | Standard WebRTC API for voice capture if SpeechRecognition insufficient |
| Next.js 15.6+ | Current | Framework | App Router, React 19, Server Actions |
| Tailwind CSS 4 | Current | Styling | Utility-first, matches existing design system |
| shadcn/ui | Current | Component primitives | Radix UI + Tailwind, already used project-wide |

### Supporting Libraries (Already Installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| framer-motion | Latest | Micro-interactions, animations | Waveform visualization, modal transitions, speaking indicators |
| lucide-react | Latest | Icons | Phone icons, waveform icons, UI controls |
| Radix UI Dialog | Via shadcn/ui | Modal/overlay primitives | Call UI modal container |
| Sonner | Current | Toasts | Error feedback, connection status |

### Alternative Considerations

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Web Speech API | Deepgram/AssemblyAI streaming | Better accuracy, but adds cost/complexity. Web Speech API free + already working in useInlineVoice |
| Modal-based UI | Full-page route (/call) | Better mobile UX, but adds routing complexity. Modal simpler for v1 |
| Browser SpeechRecognition | MediaRecorder + cloud STT | More control over audio, but requires backend streaming infrastructure |

**Installation:**
No new dependencies required. All necessary APIs and libraries already present.

## Architecture Patterns

### Recommended Project Structure

The new call feature fits into existing structure:
```
app/(chat)/
├── api/
│   ├── realtime/
│   │   ├── route.ts              # KEEP — one-shot TTS generation
│   │   └── stream/route.ts       # KEEP — use this for call backend
│   └── voice/route.ts            # KEEP — TTS only
components/
├── call/                          # NEW — call UI components
│   ├── call-modal.tsx            # Main call interface
│   ├── executive-selector.tsx    # Alexandria vs Kim picker
│   ├── voice-visualizer.tsx      # Waveform/speaking indicator
│   └── call-controls.tsx         # Hang up, mute, volume
├── app-sidebar.tsx               # MODIFY — remove Clear/Voice, add Call button
├── chat.tsx                      # MODIFY — remove useAutoSpeak, useGreetingSpeech
├── message-actions.tsx           # MODIFY — remove VoicePlayerButton
└── multimodal-input.tsx          # MODIFY — remove VoiceModeButton
hooks/
├── use-voice-call.ts             # NEW — call state management
├── use-auto-speak.ts             # DELETE
├── use-greeting-speech.ts        # DELETE
├── use-inline-voice.ts           # DELETE (or refactor if reusable)
└── use-voice-player.ts           # KEEP (might be useful for call UI)
lib/
├── ai/voice-config.ts            # KEEP — ElevenLabs settings
├── audio-manager.ts              # KEEP — global audio state
├── tts-cache.ts                  # KEEP — TTS caching
└── voice/strip-markdown-tts.ts   # KEEP — text cleaning for TTS
```

### Pattern 1: Modal-Based Call UI

**What:** Call interface as a modal overlay, not a separate route
**When to use:** For focused, temporary interactions that don't need URL persistence
**Example:**
```typescript
// components/call/call-modal.tsx
"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import type { BotType } from "@/lib/bot-personalities";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CallModal({ isOpen, onClose }: CallModalProps) {
  const [selectedExecutive, setSelectedExecutive] = useState<BotType | null>(null);
  const [callState, setCallState] = useState<"idle" | "ringing" | "connected" | "ended">("idle");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        {!selectedExecutive ? (
          <ExecutiveSelector onSelect={setSelectedExecutive} />
        ) : (
          <VoiceCallInterface
            executive={selectedExecutive}
            callState={callState}
            onStateChange={setCallState}
            onHangup={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 2: Real-Time Voice Loop with SpeechRecognition

**What:** Continuous listen → transcribe → send → receive TTS → play cycle
**When to use:** For conversational AI voice calls (ChatGPT Voice mode pattern)
**Example:**
```typescript
// hooks/use-voice-call.ts (based on useInlineVoice.ts pattern)
import { useCallback, useRef, useState } from "react";
import { useCsrf } from "@/hooks/use-csrf";

export function useVoiceCall({ executive }: { executive: BotType }) {
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { csrfFetch } = useCsrf();

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      // On final result, send to AI
      if (finalTranscript) {
        handleUserSpeech(finalTranscript);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, []);

  const handleUserSpeech = async (text: string) => {
    setIsListening(false);
    setIsAISpeaking(true);

    // Call /api/realtime/stream
    const response = await csrfFetch("/api/realtime/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, botType: executive }),
    });

    const { audioUrl, audioData } = await response.json();

    // Play audio
    const audio = new Audio(audioUrl || `data:audio/mpeg;base64,${audioData}`);
    audio.onended = () => {
      setIsAISpeaking(false);
      startListening(); // Resume listening after AI speaks
    };
    await audio.play();
  };

  return { isListening, isAISpeaking, transcript, startListening };
}
```

### Pattern 3: Visual Feedback for Voice State

**What:** Premium waveform visualization and speaking indicators
**When to use:** To create a polished, engaging voice call experience
**Example:**
```typescript
// components/call/voice-visualizer.tsx
import { motion } from "framer-motion";

export function VoiceVisualizer({ isListening, isSpeaking }: { isListening: boolean; isSpeaking: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1 h-24">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-gradient-to-t from-rose-500 to-amber-500 rounded-full"
          animate={{
            height: isListening || isSpeaking ? [20, 60, 20] : 20,
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Mixing chat and voice state:** Keep call state (transcript, audio playback) separate from chat messages. Don't save voice call transcripts to the Chat table during the call — only after hangup if desired.
- **Blocking UI during TTS generation:** Use optimistic UI — show "speaking" state immediately after user finishes, even before audio returns.
- **Not handling SpeechRecognition errors gracefully:** `SpeechRecognition` can fail with "no-speech", "aborted", "not-allowed". Auto-retry on transient errors, show UI feedback on permission denial.
- **Forgetting to stop audio on hangup:** Always clean up audio playback, recognition instances, and timeouts when the call ends.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Voice waveform visualization | Custom canvas renderer with Web Audio API frequency analysis | Framer-motion animated bars (fake waveform) or react-wave library | Real waveform analysis requires MediaRecorder + AudioContext + FFT. Fake animated bars (Pattern 3) are visually sufficient and 10x simpler. |
| Speech-to-text streaming | Custom WebSocket to Deepgram/AssemblyAI | Browser SpeechRecognition (already working in useInlineVoice) | Free, zero-latency, already integrated. Cloud STT adds cost + complexity without meaningful benefit for this use case. |
| Audio playback state management | Custom audio queue/player | Existing `lib/audio-manager.ts` | Global audio state already implemented with play/pause/stop, subscriptions, cleanup. |
| TTS request deduplication | Custom cache layer | Existing `lib/tts-cache.ts` with Vercel Blob | Already caches TTS responses by text+voiceConfig hash, supports CDN delivery. |

**Key insight:** The app already has production-ready voice infrastructure (ElevenLabs integration, TTS caching, audio state management, SpeechRecognition usage in useInlineVoice). Don't rebuild these. The work is **UI restructuring** (remove voice from chat, build call modal) and **component cleanup** (delete unused hooks/components).

## Common Pitfalls

### Pitfall 1: SpeechRecognition Browser Support Gaps

**What goes wrong:** SpeechRecognition only works in Chrome/Edge/Safari (not Firefox), and requires HTTPS (fails on localhost HTTP).
**Why it happens:** Web Speech API is not universally supported. Firefox has no implementation.
**How to avoid:** Check for `window.SpeechRecognition || window.webkitSpeechRecognition` before enabling call UI. Show browser compatibility warning if unsupported. Development works on `localhost` (HTTPS not required for localhost), but production requires HTTPS (already configured).
**Warning signs:** Users on Firefox see "Call" button but it doesn't work. Console shows `SpeechRecognition is not defined`.

### Pitfall 2: Audio Playback Overlaps and Race Conditions

**What goes wrong:** User speaks while AI is still playing previous response, or multiple audio clips play simultaneously.
**Why it happens:** Async audio playback and speech recognition run independently. No mutex/gating.
**How to avoid:** Use `lib/audio-manager.ts` to enforce single audio source (auto-stops previous when new audio starts). Pause SpeechRecognition while `isAISpeaking === true`. Resume recognition only after `audio.onended`.
**Warning signs:** Echoing voices, overlapping speech, user's mic picks up AI's voice and re-transcribes it.

### Pitfall 3: Removing Voice Features Breaks Existing Chat Flows

**What goes wrong:** Deleting `useAutoSpeak` causes runtime errors in `chat.tsx` if not properly removed from component logic.
**Why it happens:** Voice hooks are deeply integrated into chat lifecycle (onFinish callbacks, state dependencies).
**How to avoid:** Audit all usages of `useAutoSpeak`, `useGreetingSpeech`, `VoicePlayerButton`, `VoiceModeButton` before deletion. Use Grep to find all imports. Remove from component state, event handlers, and JSX. Test chat flow after removal to ensure no regressions.
**Warning signs:** TypeScript errors for undefined hooks, React errors for missing dependencies, broken message actions bar.

### Pitfall 4: Modal Dismissal During Active Call

**What goes wrong:** User clicks outside modal or presses Escape, ending the call abruptly without cleanup.
**Why it happens:** Default Radix Dialog behavior allows dismissal via overlay click or Escape key.
**How to avoid:** During call state (not just executive selection), disable `onOpenChange` for overlay clicks. Add explicit "Hang Up" button as the only way to end the call. Clean up audio, recognition, and state on hangup.
**Warning signs:** Call UI disappears but microphone stays active, audio continues playing in background, state persists after modal closes.

### Pitfall 5: Not Persisting Call History

**What goes wrong:** Voice calls vanish after hangup — no record in chat history.
**Why it happens:** `/api/realtime/stream` creates a chatId but the call UI doesn't navigate to it or save the conversation.
**How to avoid:** After hangup, optionally redirect to the generated chatId (returned by `/api/realtime/stream`) so the conversation appears in sidebar history. Or add a "Save Transcript" option before closing. For v1, can skip persistence if calls are ephemeral.
**Warning signs:** Users complain about lost voice call content, no way to review what was discussed.

## Code Examples

Verified patterns from codebase and official sources:

### Starting a Voice Call (Executive Selection + Call Flow)

```typescript
// components/call/call-modal.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { BotType } from "@/lib/bot-personalities";
import { Phone, PhoneOff } from "lucide-react";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CallModal({ isOpen, onClose }: CallModalProps) {
  const [selectedExecutive, setSelectedExecutive] = useState<BotType | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const handleHangup = () => {
    setIsConnected(false);
    setSelectedExecutive(null);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Prevent dismissal during active call
        if (!open && !isConnected) {
          handleHangup();
        }
      }}
    >
      <DialogContent
        className="max-w-2xl"
        onEscapeKeyDown={(e) => {
          // Disable Escape during call
          if (isConnected) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          // Disable outside clicks during call
          if (isConnected) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {!selectedExecutive ? "Select Executive" : isConnected ? "Call in Progress" : "Connecting..."}
          </DialogTitle>
        </DialogHeader>

        {!selectedExecutive ? (
          <ExecutiveSelector onSelect={(exec) => {
            setSelectedExecutive(exec);
            setIsConnected(true);
          }} />
        ) : (
          <VoiceCallInterface
            executive={selectedExecutive}
            isConnected={isConnected}
            onHangup={handleHangup}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### Real-Time Voice Loop (based on useInlineVoice pattern)

```typescript
// hooks/use-voice-call.ts
// Pattern derived from existing hooks/use-inline-voice.ts (lines 44-341)
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCsrf } from "@/hooks/use-csrf";
import type { BotType } from "@/lib/bot-personalities";
import { logClientError } from "@/lib/client-logger";

type CallState = "idle" | "listening" | "thinking" | "speaking";

export function useVoiceCall({ executive }: { executive: BotType }) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { csrfFetch } = useCsrf();

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      logClientError(new Error("SpeechRecognition not supported"), {
        component: "useVoiceCall",
      });
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    recognition.onstart = () => {
      setCallState("listening");
      setTranscript("");
    };

    recognition.onresult = (event) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setTranscript(finalTranscript + interim);

      // Send final transcript to AI
      if (finalTranscript.trim()) {
        handleUserSpeech(finalTranscript.trim());
        finalTranscript = "";
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        logClientError(new Error("Microphone permission denied"), {
          component: "useVoiceCall",
        });
        setCallState("idle");
        return;
      }

      // Auto-retry on transient errors
      if (event.error === "no-speech" || event.error === "aborted") {
        setTimeout(() => startListening(), 500);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still in listening state
      if (callState === "listening") {
        setTimeout(() => startListening(), 100);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [callState]);

  const handleUserSpeech = async (text: string) => {
    setCallState("thinking");

    try {
      const response = await csrfFetch("/api/realtime/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, botType: executive }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const { audioUrl, audioData } = await response.json();

      setCallState("speaking");

      // Play audio response
      const audio = new Audio(audioUrl || `data:audio/mpeg;base64,${audioData}`);
      audioRef.current = audio;

      audio.onended = () => {
        setCallState("listening");
        audioRef.current = null;
        startListening(); // Resume listening after AI finishes
      };

      await audio.play();
    } catch (error) {
      logClientError(error, { component: "useVoiceCall", action: "handleUserSpeech" });
      setCallState("listening");
      startListening(); // Resume listening on error
    }
  };

  const stopCall = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCallState("idle");
    setTranscript("");
  }, []);

  const startCall = useCallback(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        // Stop tracks immediately — just needed for permission
        for (const track of stream.getTracks()) {
          track.stop();
        }
        startListening();
      })
      .catch((err) => {
        logClientError(err, { component: "useVoiceCall", action: "microphone_permission" });
        setCallState("idle");
      });
  }, [startListening]);

  useEffect(() => {
    return () => {
      stopCall();
    };
  }, [stopCall]);

  return {
    callState,
    transcript,
    startCall,
    stopCall,
    isListening: callState === "listening",
    isThinking: callState === "thinking",
    isSpeaking: callState === "speaking",
  };
}
```

### Removing Voice from Chat

```typescript
// components/chat.tsx (BEFORE - lines 16-17)
import { useAutoSpeak } from "@/hooks/use-auto-speak";
import { useGreetingSpeech } from "@/hooks/use-greeting-speech"; // DELETE THESE

// AFTER
// (imports removed)

// BEFORE (inside Chat component)
const autoSpeak = useAutoSpeak({ messages, status, botType });
const greeting = useGreetingSpeech({ botType, enabled: messages.length === 0 }); // DELETE THESE

// AFTER
// (hook calls removed)
```

```typescript
// components/message-actions.tsx (BEFORE - line 23, 198-201)
import { VoicePlayerButton } from "./voice-player-button"; // DELETE

// In JSX:
{textFromParts && (
  <VoicePlayerButton botType={botType} text={textFromParts} /> // DELETE
)}

// AFTER
// (import and JSX removed)
```

```typescript
// components/app-sidebar.tsx (BEFORE - lines 123-140)
<Button onClick={() => setShowDeleteAllDialog(true)} ...>
  <Trash2 /> Clear
</Button>
<Button onClick={handleVoiceToggle} ...>
  <AudioLines />
</Button>

// AFTER
<Button onClick={handleOpenCall} ...>
  <Phone className="mr-1.5 h-3.5 w-3.5" />
  <span className="text-xs font-medium">Call</span>
</Button>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Auto-speak TTS on every AI response | User-initiated voice calls via dedicated UI | 2026 (this phase) | Reduces ElevenLabs costs, improves UX clarity (chat = text, calls = voice) |
| Inline voice mode (SpeechRecognition in chat) | Separate call modal with SpeechRecognition | 2026 (this phase) | Better focus, premium feel, clearer interaction model |
| Per-message voice playback buttons | No voice in chat, all voice via calls | 2026 (this phase) | Simpler chat UI, less cognitive load |
| localStorage voice settings (volume/speed) | Centralized voice config in call UI | 2026 (this phase) | Settings scoped to call context, not global |

**Deprecated/outdated:**
- **useAutoSpeak:** Replaced by dedicated call UI. Auto-speaking AI responses was expensive and cluttered the chat experience.
- **useGreetingSpeech:** Greeting via TTS on first visit. Removed in favor of onboarding modal (text-based).
- **VoicePlayerButton:** Per-message voice playback. Removed — voice is now call-only.
- **VoiceModeButton (inline voice toggle in multimodal-input):** Replaced by Call modal. Inline voice mode confused users (is this a voice call or text chat?).

## Open Questions

1. **Should call transcripts be saved to chat history?**
   - What we know: `/api/realtime/stream` creates a chatId and saves messages. Frontend could redirect to that chatId after hangup.
   - What's unclear: Do users want voice calls to appear in sidebar history, or should calls be ephemeral (no persistence)?
   - Recommendation: For v1, make calls ephemeral (don't redirect, don't show in sidebar). Add "Save Transcript" as a v2 feature if users request it.

2. **Should the Call button be premium-only (paywalled)?**
   - What we know: Voice costs are significant (ElevenLabs TTS). Rate limits exist (500 requests/day for regular users).
   - What's unclear: Is the call feature intended for all users, or only premium subscribers?
   - Recommendation: Allow all authenticated users to call, enforce existing rate limits. If costs become an issue, add premium-only gating in v2.

3. **What happens if a user closes the browser during a call?**
   - What we know: SpeechRecognition and audio playback are client-side only. No server-side call session.
   - What's unclear: Should there be any cleanup or state persistence?
   - Recommendation: No special handling needed. Call state is ephemeral. When modal closes, all state resets. Standard behavior for client-side voice interactions.

4. **Should the waveform visualization be real (Web Audio API) or fake (animated bars)?**
   - What we know: Real waveform requires MediaRecorder + AudioContext frequency analysis (complex). Fake waveform is simple framer-motion animations.
   - What's unclear: Does the visual fidelity justify the engineering complexity?
   - Recommendation: Use fake animated bars (Pattern 3) for v1. Real waveform is a polish task for v2 if desired.

## Sources

### Primary (HIGH confidence)

- **Codebase:** `/home/qualia/Projects/live/aibossbrainz/hooks/use-inline-voice.ts` — Production SpeechRecognition implementation (lines 44-341)
- **Codebase:** `/home/qualia/Projects/live/aibossbrainz/app/(chat)/api/realtime/stream/route.ts` — Voice call backend endpoint (lines 1-551)
- **Codebase:** `/home/qualia/Projects/live/aibossbrainz/lib/ai/voice-config.ts` — ElevenLabs voice configuration
- **Codebase:** `/home/qualia/Projects/live/aibossbrainz/components/app-sidebar.tsx` — Sidebar button structure (lines 119-150)
- **MDN Web Docs:** [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) — SpeechRecognition API specification
- **MDN Web Docs:** [MediaStream Recording API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API) — MediaRecorder API (alternative to SpeechRecognition)
- **Chrome Developers:** [MediaRecorder API](https://developer.chrome.com/blog/mediarecorder) — Browser recording best practices

### Secondary (MEDIUM confidence)

- **AssemblyAI Blog:** [Web Speech API Guide](https://www.assemblyai.com/blog/speech-recognition-javascript-web-speech-api) — Browser STT usage patterns
- **web.dev:** [Recording Audio from the User](https://web.dev/media-recording-audio/) — MediaRecorder practical guide
- **Headless UI:** [Dialog Documentation](https://headlessui.com/react/dialog) — Modal accessibility patterns (used via shadcn/ui)
- **RecordRTC:** [Project Overview](https://recordrtc.org/) — WebRTC recording library (not needed, but good reference)
- **UI/UX Design Trends 2026:** [12 Design Trends](https://www.index.dev/blog/ui-ux-design-trends) — Minimalist voice UI patterns
- **WebDesigner Depot:** [Ultimate Guide to UI Design 2026](https://webdesignerdepot.com/the-ultimate-guide-to-ui-design-in-2026/) — Premium interaction patterns

### Tertiary (LOW confidence)

- **Medium Article:** [The Next Wave of UI/UX Trends in 2026](https://medium.com/@obliqdesign.india/the-next-wave-of-ui-ux-trends-in-2026-042a94e487d8) — General voice UI trends
- **Substack:** [Speech-to-Text APIs in 2026](https://futureagi.substack.com/p/speech-to-text-apis-in-2026-benchmarks) — Cloud STT comparison (informational, not used)

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — All libraries already installed, SpeechRecognition verified working in useInlineVoice, ElevenLabs integration production-tested
- Architecture: **HIGH** — Based on existing codebase patterns (useInlineVoice, /api/realtime/stream, modal usage throughout app)
- Pitfalls: **HIGH** — Derived from production codebase analysis (audio manager, SpeechRecognition error handling, modal dismissal patterns)

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (30 days — stable domain, voice APIs not rapidly changing)
