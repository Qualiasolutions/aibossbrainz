---
phase: 13-agents-speak-first-in-calls-add-mute-mic
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - hooks/use-voice-call.ts
  - components/call/voice-call-interface.tsx
  - components/call/voice-visualizer.tsx
  - components/call/call-controls.tsx
autonomous: true

must_haves:
  truths:
    - "When voice call connects, AI speaks first with a greeting before listening"
    - "Mute button is visible and functional during active call states"
    - "Call UI feels polished and real-time (smooth transitions, premium look)"
  artifacts:
    - path: "hooks/use-voice-call.ts"
      provides: "Auto-greeting trigger after mic access"
      contains: "sendToAI.*greeting"
    - path: "components/call/voice-call-interface.tsx"
      provides: "Polished connecting/active state UI"
      min_lines: 180
    - path: "components/call/voice-visualizer.tsx"
      provides: "Enhanced visualizer animation"
      min_lines: 100
  key_links:
    - from: "hooks/use-voice-call.ts"
      to: "/api/realtime/stream"
      via: "auto-greeting request after connecting"
      pattern: "sendToAI.*greet"
    - from: "components/call/voice-call-interface.tsx"
      to: "CallControls"
      via: "always render during active states"
      pattern: "CallControls.*isActive"
---

<objective>
Make voice calls feel like premium real-time phone conversations where AI executives speak first with a natural greeting.

Purpose: Transform the current "wait for user" pattern into a natural conversation flow where the executive greets the caller immediately after connecting. Polish the UI to match the quality of native phone apps.

Output: Voice calls that start with AI greeting, have always-visible mute controls, and feature smooth transitions and premium visuals.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@hooks/use-voice-call.ts
@components/call/voice-call-interface.tsx
@components/call/voice-visualizer.tsx
@components/call/call-controls.tsx
@lib/bot-personalities.ts
@~/.claude/rules/frontend.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add auto-greeting trigger after mic access</name>
  <files>hooks/use-voice-call.ts</files>
  <action>
In the `startCall` function, after mic permission is granted and AudioContext setup completes, automatically trigger a greeting before transitioning to listening state.

Implementation:
1. After line 518 (AudioContext setup), before setting state to "listening" (line 528):
   - Set state to "thinking" instead of "listening"
   - Call `sendToAI()` with a greeting trigger message: "Greet the caller. You're speaking to them for the first time on this call. Keep it warm, brief (1-2 sentences), and then ask how you can help them today."
   - The existing flow will handle: thinking → speaking (AI greeting plays) → listening (user can respond)

2. Ensure the greeting is NOT added to conversation history (it's a system-triggered opening, not a user message)
   - The sendToAI function already adds user messages to conversationRef
   - For greeting: skip the user entry addition OR mark it specially so it doesn't pollute history

Why: Current flow goes idle→connecting→listening (waits for user). New flow: idle→connecting→thinking→speaking→listening (AI greets first, THEN listens). This matches natural phone call expectations where the person being called speaks first.

DO NOT change the state machine for normal conversation turns (user speaks → AI responds). Only modify the initial connection flow.
  </action>
  <verify>
Start a voice call in dev mode. After "Connecting..." and mic permission grant, verify:
1. State transitions to "thinking" (shows thinking dots)
2. Then to "speaking" (AI greeting plays through audio)
3. Then to "listening" (visualizer shows listening state)
4. Check browser console: greeting request sent to `/api/realtime/stream` with greeting prompt
5. Subsequent conversation turns work normally (user speaks, AI responds)
  </verify>
  <done>
Voice calls start with AI executive greeting the user before listening. State flow: connecting → thinking → speaking (greeting) → listening. No conversation history pollution from greeting trigger.
  </done>
</task>

<task type="auto">
  <name>Task 2: Polish call UI with premium transitions and states</name>
  <files>
    components/call/voice-call-interface.tsx
    components/call/voice-visualizer.tsx
    components/call/call-controls.tsx
  </files>
  <action>
**voice-call-interface.tsx:**

1. **Connecting state animation**: Replace static "Connecting..." text (line 78) with a pulsing ring/dot animation:
   ```tsx
   {isConnecting && (
     <div className="flex items-center gap-2">
       <span className="size-2 rounded-full bg-rose-400 animate-pulse" />
       <p className="text-sm text-muted-foreground">Connecting...</p>
     </div>
   )}
   ```

2. **Executive name header**: Add gradient underline to executive name (line 71):
   ```tsx
   <h2 className="text-2xl font-semibold bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
     {EXECUTIVE_NAMES[executive]}
   </h2>
   ```

3. **Call timer styling**: Make timer more prominent with tabular nums and subtle background (lines 72-76):
   ```tsx
   {isActive && !hasError && (
     <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
       <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
       <p className="text-sm text-muted-foreground tabular-nums font-mono">
         {formatDuration(callDuration)}
       </p>
     </div>
   )}
   ```

4. **Status messages**: Add staggered fade-in animations to status indicators (thinking dots, listening text, muted indicator). Use Tailwind `animate-in fade-in` utilities.

5. **Overall container**: Add subtle gradient background overlay to the main container (line 68):
   ```tsx
   <div className="relative flex flex-col items-center justify-between min-h-[420px] py-6 px-6">
     <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent pointer-events-none rounded-lg" />
     <div className="relative z-10 flex flex-col items-center justify-between w-full h-full">
       {/* existing content */}
     </div>
   </div>
   ```

**voice-visualizer.tsx:**

1. **Bar gradient enhancement**: Make gradient more vibrant with better color stops (line 91):
   ```tsx
   className="w-1.5 rounded-full bg-gradient-to-t from-rose-500 via-rose-400 to-amber-400"
   ```

2. **Add glow effect**: Add subtle shadow to bars when active:
   ```tsx
   style={{
     height: "6%",
     transition: "height 60ms ease-out",
     opacity: 0.85,
     boxShadow: isActive ? "0 0 8px rgba(244, 63, 94, 0.3)" : "none",
   }}
   ```

3. **Connecting state pulse**: When `isConnecting`, show a gentle pulsing animation instead of static bars. Add prop `isConnecting?: boolean` and create a slow breathing effect.

**call-controls.tsx:**

1. **Button hover states**: Enhance hover effects with scale and glow (lines 22-26, 33-39):
   ```tsx
   // Mute button
   className={`flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 ${
     isMuted
       ? "bg-white/15 text-red-400 ring-1 ring-red-400/40 shadow-lg shadow-red-400/20"
       : "bg-white/10 text-white/80 hover:bg-white/15 hover:shadow-md"
   }`}

   // Hangup button
   className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105 hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/40 active:scale-95"
   ```

2. **Button spacing**: Increase gap between buttons for better touch targets (line 17):
   ```tsx
   <div className="flex items-center justify-center gap-8">
   ```

Follow frontend.md rules: distinctive design, CSS transitions, layered backgrounds, subtle gradients, staggered animations. Avoid generic blue-purple gradients (using rose/amber instead per executive brand colors).
  </action>
  <verify>
1. Start voice call, observe:
   - Connecting state shows animated pulse + text
   - Executive name has gradient text
   - Timer appears in a pill with green dot indicator
   - Visualizer bars have vibrant gradient + glow when active
   - State transitions are smooth with fade-in effects
2. Hover over mute/hangup buttons: scale animation + glow effect
3. During thinking state: dots animate in staggered sequence
4. Overall feel: premium, polished, like iOS/Android native call screen
  </verify>
  <done>
Call UI features smooth CSS transitions, gradient accents, layered backgrounds, staggered animations. Connecting state has pulse animation. Timer shows in styled pill. Buttons have hover scale + glow. Visualizer has vibrant gradients. No generic card patterns or blue-purple gradients.
  </done>
</task>

</tasks>

<verification>
**End-to-end call flow test:**
1. Click "Start Call" button
2. Grant mic permission
3. Observe: "Connecting..." with pulse → "Thinking..." dots → AI greeting plays → transitions to "Listening..."
4. Speak after greeting → AI responds normally
5. Click mute → indicator shows "Muted" in red
6. Unmute → returns to listening state
7. Interrupt AI while speaking → AI stops, switches to listening
8. Hang up → returns to idle

**Visual quality check:**
- All state transitions feel smooth and intentional
- Executive name, timer, status indicators use gradient accents
- Visualizer is engaging (not generic bars)
- Controls feel tactile with hover/active states
- Overall aesthetic matches Fawzi's brand standards (distinctive, layered, animated)

**Performance:**
- Greeting triggers without delay after mic access
- No lag in state transitions
- Audio playback starts promptly
</verification>

<success_criteria>
- [ ] Voice calls start with AI greeting the user (agent speaks first)
- [ ] Mute button visible and functional during all active call states
- [ ] Connecting state shows animated pulse indicator
- [ ] Executive name has gradient text styling
- [ ] Call timer displays in pill with live indicator
- [ ] Visualizer bars have vibrant gradient + glow effect
- [ ] Control buttons have hover scale and shadow effects
- [ ] All transitions use CSS animations (fade-in, scale, pulse)
- [ ] No generic patterns (plain cards, blue-purple gradients, static states)
- [ ] Call experience feels like premium native phone app
</success_criteria>

<output>
After completion, create `.planning/quick/13-agents-speak-first-in-calls-add-mute-mic/13-01-SUMMARY.md`
</output>
