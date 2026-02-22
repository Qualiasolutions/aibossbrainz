# Quick Task 5: Inline Voice Mode

## What Changed

Replaced the separate voice call page with inline ChatGPT-style voice mode in the chat input.

## Files Modified
- `components/app-sidebar.tsx` — Removed Voice Call buttons (desktop + mobile)
- `components/chat.tsx` — Replaced `useVoiceCall` + `VoiceCallDialog` with `useInlineVoice`
- `components/multimodal-input.tsx` — Added voice mode props, End button, transcript placeholder
- `components/voice-input-button.tsx` — Rewritten as stateless toggle (was full SpeechRecognition manager)
- `hooks/use-inline-voice.ts` — New hook: continuous listen→send→wait→relisten cycle
- `lib/supabase/middleware.ts` — Removed `/call` from subscription routes

## Files Deleted
- `app/(chat)/call/page.tsx` — Full-page voice call page
- `components/premium-realtime-call.tsx` — Premium realtime call component (722 lines)
- `components/chat/voice-call-dialog.tsx` — Voice call modal dialog
- `hooks/use-voice-call.ts` — Old voice call hook (405 lines)

## Net Change
**+94 / -1770 lines** — massive simplification

## How It Works Now
1. Click mic button in chat input → starts voice mode
2. Speech is transcribed and auto-sent as user messages
3. AI responds as text (typewriter) + auto-speak plays audio
4. After TTS finishes, listening auto-resumes
5. Click "End" button to stop voice mode
6. All messages save as normal chat history

## Commit
`a2025f9`
