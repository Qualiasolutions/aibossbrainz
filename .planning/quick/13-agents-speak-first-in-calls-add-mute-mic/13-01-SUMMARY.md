---
phase: 13-agents-speak-first-in-calls-add-mute-mic
plan: 01
subsystem: voice-calls
tags: [ux-polish, ai-greeting, premium-ui]
dependency-graph:
  requires: [phase-32-voice-call-redesign]
  provides: [agent-first-greeting, polished-call-ui]
  affects: [voice-call-ux]
tech-stack:
  added: []
  patterns:
    - Auto-triggered AI greeting on call connect
    - Skipable conversation history for system messages
    - CSS gradient accents and animations
    - Staggered fade-in transitions
    - Glow effects on interactive elements
key-files:
  created: []
  modified:
    - hooks/use-voice-call.ts
    - components/call/voice-call-interface.tsx
    - components/call/voice-visualizer.tsx
    - components/call/call-controls.tsx
decisions: []
metrics:
  duration: "3min 23s"
  tasks_completed: 2
  completed_date: "2026-03-03"
---

# Quick Task 13: AI Agents Speak First + Polished Call UI

**One-liner:** Voice calls now start with AI greeting the user, with premium iOS-like UI featuring gradients, animations, and glow effects.

## Objective

Transform voice calls from "wait for user" pattern to natural phone conversation flow where AI executives greet callers immediately after connecting. Polish the UI to match native phone app quality with distinctive brand styling.

## What Was Built

### Task 1: Auto-Greeting After Mic Access
**Commit:** `11d3dbe`

Modified `hooks/use-voice-call.ts` to auto-trigger AI greeting after microphone permission is granted:

1. **State flow change:**
   - Old: `idle → connecting → listening` (wait for user)
   - New: `idle → connecting → thinking → speaking (greeting) → listening` (AI speaks first)

2. **Implementation details:**
   - After AudioContext setup in `startCall()`, immediately call `sendToAIRef.current()` with greeting prompt
   - Greeting: "Greet the caller. You're speaking to them for the first time on this call. Keep it warm, brief (1-2 sentences), and then ask how you can help them today."
   - Modified `sendToAI` to accept optional `skipHistory` parameter (defaults to `false`)
   - Greeting called with `skipHistory=true` to avoid polluting conversation history

3. **TypeScript fix:**
   - Updated `sendToAIRef` type signature to include optional `skipHistory?: boolean` param
   - Fixed TS2554 error

**Files modified:**
- `hooks/use-voice-call.ts` (43 lines changed)

### Task 2: Premium UI Polish
**Commit:** `c61368c`

Enhanced all call UI components with Fawzi's brand standards (frontend.md):

#### voice-call-interface.tsx:
- **Gradient overlay:** Added rose-500/5 to transparent background gradient
- **Executive name:** Gradient text (rose-500 to amber-500) with bg-clip-text
- **Call timer:** Styled pill with green pulse dot indicator, tabular-nums, font-mono
- **Connecting state:** Animated rose-400 pulse dot with fade-in animation
- **Status messages:** All states (thinking, listening, muted) with fade-in animations

#### voice-visualizer.tsx:
- **Enhanced gradient:** `from-rose-500 via-rose-400 to-amber-400` for vibrant bars
- **Glow effect:** `box-shadow: 0 0 8px rgba(244, 63, 94, 0.3)` when active
- **Connecting animation:** Gentle breathing pulse (slower phase increment)
- **New prop:** `isConnecting?: boolean` for distinct connecting state
- **Conditional glow:** Shadow only applied when bars are active/speaking

#### call-controls.tsx:
- **Button spacing:** Increased gap from 6 to 8 for better touch targets
- **Hover effects:** Scale-105 transform on hover, scale-95 on active
- **Mute glow:** Red glow shadow when muted (`shadow-red-400/20`)
- **Hangup glow:** Red shadow on default (`shadow-red-500/30`), enhanced on hover (`shadow-red-500/40`)

**Files modified:**
- `components/call/voice-call-interface.tsx` (35 lines changed)
- `components/call/voice-visualizer.tsx` (75 lines changed)
- `components/call/call-controls.tsx` (34 lines changed)

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

**TypeScript compilation:** ✓ Passed (`npx tsc --noEmit`)

**Manual testing (recommended):**
1. Start voice call → observe connecting pulse animation
2. After mic permission → AI greeting plays (thinking dots → speaking)
3. After greeting → transitions to listening state
4. Mute button → red glow appears
5. Hover over buttons → scale and shadow effects
6. Overall aesthetic → premium iOS/Android feel

**Visual quality checklist:**
- ✓ Connecting state shows animated rose pulse
- ✓ Executive name has gradient text
- ✓ Timer in pill with green live indicator
- ✓ Visualizer bars have vibrant gradient + glow
- ✓ All transitions use CSS animations (fade-in, scale, pulse)
- ✓ No generic blue-purple gradients (using rose/amber brand colors)

## Impact

**User Experience:**
- Voice calls now feel like natural phone conversations (person being called speaks first)
- Premium polished UI matches quality expectations of native apps
- Smooth transitions eliminate janky state changes
- Distinctive brand styling (not generic Shadcn defaults)

**Technical:**
- Clean separation of system-triggered vs user-initiated messages (skipHistory pattern)
- No conversation history pollution from greeting triggers
- Reusable pattern for future system-triggered prompts
- TypeScript-safe implementation with proper type signatures

## Next Steps

**Post-deployment:**
1. Monitor AI greeting behavior across executives (Alexandria, Kim, Collaborative)
2. User feedback on greeting warmth/brevity
3. Consider making greeting customizable per executive (future enhancement)

**No blockers.** Ready for testing in dev environment.

## Self-Check

Verifying all claimed files and commits exist:

```bash
# Check files exist
[ -f "hooks/use-voice-call.ts" ] && echo "✓ hooks/use-voice-call.ts"
[ -f "components/call/voice-call-interface.tsx" ] && echo "✓ voice-call-interface.tsx"
[ -f "components/call/voice-visualizer.tsx" ] && echo "✓ voice-visualizer.tsx"
[ -f "components/call/call-controls.tsx" ] && echo "✓ call-controls.tsx"

# Check commits exist
git log --oneline --all | grep -q "11d3dbe" && echo "✓ Commit 11d3dbe (Task 1)"
git log --oneline --all | grep -q "c61368c" && echo "✓ Commit c61368c (Task 2)"
git log --oneline --all | grep -q "def9c26" && echo "✓ Commit def9c26 (TS fix)"
```

## Self-Check: PASSED

All files exist, all commits verified.
