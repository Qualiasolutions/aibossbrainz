---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - hooks/use-inline-voice.ts
  - components/voice-input-button.tsx
  - components/multimodal-input.tsx
  - components/chat.tsx
  - components/app-sidebar.tsx
  - lib/supabase/middleware.ts
autonomous: true

must_haves:
  truths:
    - "Clicking the mic button in the chat input starts continuous voice mode"
    - "User speech is transcribed and auto-sent as messages without pressing send"
    - "AI responds with text messages and auto-speaks them via existing useAutoSpeak"
    - "After AI finishes speaking, voice mode automatically resumes listening"
    - "An End button appears in the input area during voice mode"
    - "Clicking End or mic again stops voice mode and returns to normal chat"
    - "The sidebar no longer has Voice Call buttons (desktop or mobile)"
    - "The /call page no longer exists"
    - "All voice messages save as normal chat history"
  artifacts:
    - path: "hooks/use-inline-voice.ts"
      provides: "Continuous voice mode hook with auto-listen cycle"
    - path: "components/voice-input-button.tsx"
      provides: "Voice mode toggle button with active/inactive states"
    - path: "components/multimodal-input.tsx"
      provides: "End button UI during voice mode"
  key_links:
    - from: "hooks/use-inline-voice.ts"
      to: "lib/audio-manager.ts"
      via: "subscribeToAudioChanges"
      pattern: "subscribeToAudioChanges"
    - from: "components/chat.tsx"
      to: "hooks/use-inline-voice.ts"
      via: "useInlineVoice hook"
      pattern: "useInlineVoice"
    - from: "components/multimodal-input.tsx"
      to: "hooks/use-inline-voice.ts"
      via: "voiceMode prop drilling"
      pattern: "isVoiceMode"
---

<objective>
Replace the separate-page voice call system with inline voice mode in the chat input bar, ChatGPT-style.

Purpose: Users should be able to toggle voice mode directly from the chat input without navigating away. Speech gets transcribed, auto-sent as messages, AI responds as text + auto-speaks, then listening resumes automatically.

Output: Inline voice mode in chat input, removal of /call page and sidebar voice buttons.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/chat.tsx
@components/multimodal-input.tsx
@components/voice-input-button.tsx
@hooks/use-voice-call.ts
@hooks/use-auto-speak.ts
@lib/audio-manager.ts
@components/app-sidebar.tsx
@components/chat/voice-call-dialog.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create useInlineVoice hook and rewrite VoiceInputButton</name>
  <files>
    hooks/use-inline-voice.ts
    components/voice-input-button.tsx
  </files>
  <action>
**1. Create `hooks/use-inline-voice.ts`** — a new hook that manages continuous voice mode.

The hook takes these props:
```ts
interface UseInlineVoiceProps {
  status: "ready" | "submitted" | "streaming" | "error"; // chat status
  sendMessage: (message: { role: "user"; parts: { type: "text"; text: string }[] }) => void;
}
```

Returns:
```ts
interface UseInlineVoiceReturn {
  isVoiceMode: boolean;        // Whether voice mode is active
  isListening: boolean;        // Currently listening for speech
  isProcessing: boolean;       // Processing transcript before send
  isSupported: boolean;        // Browser supports SpeechRecognition
  transcript: string;          // Current interim/final transcript for display
  startVoiceMode: () => void;  // Begin voice mode
  stopVoiceMode: () => void;   // End voice mode
  toggleVoiceMode: () => void; // Toggle on/off
}
```

Core behavior:
- `startVoiceMode`: Sets `isVoiceMode = true`, requests mic permission via `navigator.mediaDevices.getUserMedia({ audio: true })` (stop tracks immediately — just for permission), then starts SpeechRecognition in `continuous: true, interimResults: true` mode.
- When a final transcript is received: stop recognition, set `isProcessing = true`, call `sendMessage({ role: "user", parts: [{ type: "text", text: finalTranscript }] })`.
- After sending, the hook needs to wait for AI to finish responding AND for TTS to finish playing. Use `subscribeToAudioChanges` from `lib/audio-manager.ts` to detect when auto-speak audio ends. When `status` returns to `"ready"` AND no audio is playing (check both conditions), auto-restart SpeechRecognition.
- On `recognition.onerror` with `no-speech` or `aborted`: if still in voice mode and not waiting for response, restart recognition after 100ms.
- On `recognition.onend` (unexpected end while listening): if still in voice mode and not waiting for response, restart after 100ms.
- `stopVoiceMode`: Sets `isVoiceMode = false`, stops recognition, clears all refs. Does NOT stop any playing audio (let auto-speak finish naturally).
- Use refs (`voiceModeActiveRef`, `waitingForResponseRef`) alongside state to avoid stale closures, same pattern as `use-voice-call.ts`.
- Import `getSpeechRecognition()` pattern from existing `voice-input-button.tsx` (webkit prefix handling).
- Use `lang: "en-US"` for recognition (same as existing).

**2. Rewrite `components/voice-input-button.tsx`** to become a voice mode toggle.

The component now accepts:
```ts
interface VoiceInputButtonProps {
  isVoiceMode: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  disabled?: boolean;
  onToggle: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}
```

- Remove ALL internal SpeechRecognition logic (the hook handles it now).
- Remove `onTranscript` prop entirely.
- When `isVoiceMode` is true AND `isListening`: show animated MicOff icon with pulse ring (existing animation).
- When `isVoiceMode` is true AND `isProcessing`: show Loader2 spinner.
- When `isVoiceMode` is true AND not listening/processing (waiting for AI): show Mic with a subtle breathing animation.
- When `isVoiceMode` is false: show Mic icon (idle state, existing).
- Button click calls `onToggle()`.
- Keep the tooltip: "Voice mode active" when on, "Start voice mode" when off.
- If `!isSupported`, return null (same as before).
  </action>
  <verify>
Run `pnpm build` to confirm no TypeScript errors. Check that `hooks/use-inline-voice.ts` exports `useInlineVoice` and `components/voice-input-button.tsx` exports `VoiceInputButton` with the new props interface.
  </verify>
  <done>
`useInlineVoice` hook exists with continuous listen->send->wait->re-listen cycle. `VoiceInputButton` is a stateless toggle component driven by hook state. Both compile without errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: Integrate inline voice into chat and multimodal input, add End button</name>
  <files>
    components/chat.tsx
    components/multimodal-input.tsx
  </files>
  <action>
**1. Update `components/chat.tsx`:**

- Remove the `useVoiceCall` import and all its usage (lines 19, 462-478).
- Remove the `VoiceCallDialog` dynamic import (lines 54-60) and its JSX rendering (lines 634-645).
- Add `useInlineVoice` import from `@/hooks/use-inline-voice`.
- Use the hook:
  ```ts
  const {
    isVoiceMode,
    isListening,
    isProcessing,
    isSupported: isVoiceSupported,
    transcript: voiceTranscript,
    toggleVoiceMode,
    stopVoiceMode,
  } = useInlineVoice({ status, sendMessage });
  ```
- Pass voice state down to `MultimodalInput` as new props:
  ```tsx
  <MultimodalInput
    // ...existing props...
    isVoiceMode={isVoiceMode}
    isListening={isListening}
    isVoiceProcessing={isProcessing}
    isVoiceSupported={isVoiceSupported}
    voiceTranscript={voiceTranscript}
    onVoiceToggle={toggleVoiceMode}
    onVoiceStop={stopVoiceMode}
  />
  ```

**2. Update `components/multimodal-input.tsx`:**

- Add the new voice props to the component interface:
  ```ts
  isVoiceMode?: boolean;
  isListening?: boolean;
  isVoiceProcessing?: boolean;
  isVoiceSupported?: boolean;
  voiceTranscript?: string;
  onVoiceToggle?: () => void;
  onVoiceStop?: () => void;
  ```
- Remove the old `handleVoiceTranscript` callback entirely (lines 128-152).
- Update `VoiceInputButton` usage to pass new props:
  ```tsx
  <VoiceInputButton
    className="size-6 rounded text-muted-foreground/70 transition-colors duration-200 hover:text-red-400"
    disabled={status !== "ready" && !isVoiceMode}
    isVoiceMode={isVoiceMode ?? false}
    isListening={isListening ?? false}
    isProcessing={isVoiceProcessing ?? false}
    isSupported={isVoiceSupported ?? true}
    onToggle={onVoiceToggle ?? (() => {})}
    size="sm"
  />
  ```
- When `isVoiceMode` is true, show an **End button** next to the mic button (or replace the send button area). The End button:
  - Red pill-shaped button with text "End" and a small square stop icon.
  - Styled: `className="flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 transition-colors shrink-0"`
  - Calls `onVoiceStop()` on click.
- When `isVoiceMode` is true, show the `voiceTranscript` as placeholder text in the textarea (or as a small overlay above the input showing what's being heard). Use the textarea's placeholder prop: when voice mode is active AND there's a transcript, show it as the placeholder. When no transcript but voice mode is active, show "Listening..." as placeholder. When voice mode is off, show the default "Message your executive team...".
- When `isVoiceMode` is true, the textarea should be `disabled` (user shouldn't type during voice mode).
- When `isVoiceMode` is true, hide the send button and attachments button (only show mic button + End button).
- Update the `memo` comparison to include `isVoiceMode`, `isListening`, `isVoiceProcessing`, `voiceTranscript` in the equality check.
  </action>
  <verify>
Run `pnpm build` to confirm no TypeScript errors. Verify that `VoiceCallDialog` is no longer imported in chat.tsx and `useVoiceCall` is no longer referenced.
  </verify>
  <done>
Chat component uses `useInlineVoice` instead of `useVoiceCall`. MultimodalInput shows End button during voice mode, hides send/attachments, and displays live transcript. VoiceCallDialog is completely removed from the chat page.
  </done>
</task>

<task type="auto">
  <name>Task 3: Remove old voice call system (sidebar, /call page, dead code)</name>
  <files>
    components/app-sidebar.tsx
    lib/supabase/middleware.ts
    app/(chat)/call/page.tsx
    components/premium-realtime-call.tsx
    components/chat/voice-call-dialog.tsx
    hooks/use-voice-call.ts
  </files>
  <action>
**1. `components/app-sidebar.tsx`:**
- Remove the desktop "Voice Call" button and its wrapping Link (lines 138-154, the `{user && (<Link href="/call">...` block).
- Remove the mobile "Voice Call" button and its wrapping Link (lines 236-251, the `{user && (<Link href="/call"...` block inside the Sheet).
- Remove the `Phone` import from lucide-react if it's no longer used anywhere in the file.
- Keep everything else intact (New Chat button, Clear button, sidebar history, user nav).

**2. `lib/supabase/middleware.ts`:**
- Remove `"/call"` from the `subscriptionRequiredRoutes` array (line 181).

**3. Delete these files entirely:**
- `app/(chat)/call/page.tsx` — the full-page voice call page
- `components/premium-realtime-call.tsx` — the premium realtime call component
- `components/chat/voice-call-dialog.tsx` — the voice call modal dialog
- `hooks/use-voice-call.ts` — the old voice call hook (replaced by `use-inline-voice.ts`)

**4. Verify no remaining imports of deleted files:**
- Grep for `use-voice-call`, `voice-call-dialog`, `premium-realtime-call`, and `/call` to ensure no dangling imports.
- If `PremiumRealtimeCall` or `VoiceCallDialog` are imported anywhere else, remove those imports.
  </action>
  <verify>
Run `pnpm build` to confirm clean build with no missing module errors. Run `grep -r "use-voice-call\|voice-call-dialog\|premium-realtime-call\|href=\"/call\"" --include="*.tsx" --include="*.ts" components/ app/ hooks/ lib/` to confirm no dangling references.
  </verify>
  <done>
Sidebar has no Voice Call buttons. /call page is gone. VoiceCallDialog, PremiumRealtimeCall, and useVoiceCall are deleted. Middleware no longer references /call. Clean build passes.
  </done>
</task>

</tasks>

<verification>
1. `pnpm build` passes with zero errors
2. No references to deleted files (`use-voice-call`, `voice-call-dialog`, `premium-realtime-call`, `/call` route)
3. Sidebar renders without Voice Call buttons on desktop and mobile
4. VoiceInputButton in chat input is clickable and toggles voice mode state
5. During voice mode: End button visible, textarea shows transcript/listening state, send+attachment buttons hidden
6. Voice mode auto-sends transcribed speech as user messages
7. Auto-speak (via existing `useAutoSpeak`) plays AI response, then voice mode resumes listening
</verification>

<success_criteria>
- Inline voice mode works: mic toggle in chat input starts continuous voice conversation
- Speech is transcribed and auto-sent as normal chat messages
- AI responds as text, auto-speak plays audio, then listening resumes
- End button stops voice mode and returns to normal chat
- Old voice call system completely removed (sidebar buttons, /call page, dialog, hook)
- Clean build, no dead imports
</success_criteria>

<output>
After completion, create `.planning/quick/5-inline-voice-mode-like-chatgpt-remove-si/5-SUMMARY.md`
</output>
