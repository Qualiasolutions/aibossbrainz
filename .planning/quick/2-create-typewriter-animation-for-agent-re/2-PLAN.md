---
phase: quick-02
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/enhanced-chat-message.tsx
  - app/globals.css
autonomous: true

must_haves:
  truths:
    - "Assistant response text reveals word-by-word at a slow, deliberate pace (~100-120ms per word during streaming)"
    - "When streaming ends, remaining text catches up smoothly (not instant dump)"
    - "Historical messages (page reload) render instantly with no animation"
    - "A blinking cursor follows the text edge during reveal"
    - "Each revealed word has a subtle fade-in opacity transition"
  artifacts:
    - path: "components/enhanced-chat-message.tsx"
      provides: "Slower typewriter pacing, CSS fade per word"
    - path: "app/globals.css"
      provides: "Word fade-in keyframe and typewriter-word class"
  key_links:
    - from: "components/enhanced-chat-message.tsx"
      to: "app/globals.css"
      via: "typewriter-word CSS class applied to revealed content"
---

<objective>
Tune the existing TypewriterContent component for a slower, smoother typewriter reveal on AI assistant responses.

Purpose: The current word-by-word reveal at ~60ms feels too fast. Fawzi wants "slow and nice" -- a deliberate, elegant typewriter effect that lets users read along as text appears.

Output: Slower pacing (~100-120ms/word streaming, ~35ms catch-up), subtle per-word CSS fade-in transition, polished cursor behavior.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/enhanced-chat-message.tsx
@app/globals.css
@components/elements/response.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Slow down typewriter pacing and add per-word fade-in</name>
  <files>components/enhanced-chat-message.tsx, app/globals.css</files>
  <action>
In `components/enhanced-chat-message.tsx`, modify the `TypewriterContent` component:

1. **Slow down the streaming interval** from 60ms to 110ms per word tick. This creates a deliberate, readable pace.

2. **Slow down the catch-up interval** from 20ms to 35ms. When streaming ends, remaining text fills in briskly but not instant -- 3x faster than live pace, not 5x.

3. **Reduce the aggressive catch-up word batching**: Change the `gap > 150` threshold for 3-words-per-tick to `gap > 300` so it only batches on very large backlogs.

4. **Add a CSS-based per-word fade-in**: Instead of slicing content as a single string, split the `displayedContent` into two spans:
   - Already-revealed text (fully opaque, no animation)
   - The last revealed word (with a `typewriter-reveal` CSS class that does a quick 150ms opacity fade from 0.3 to 1)

   Implementation approach: Track `previousDisplayedLength` via a ref. On each render, the text from `previousDisplayedLength` to `displayedLength` gets the `typewriter-reveal` class. The rest is plain. This avoids re-animating the entire text on each tick.

   Specifically, render like this:
   ```tsx
   <div className="message-text prose prose-stone max-w-none text-stone-700 selection:bg-rose-100 selection:text-rose-900">
     <Response mode={isRevealing ? "streaming" : "static"} parseIncompleteMarkdown={isRevealing}>
       {displayedContent}
     </Response>
     {isRevealing && <span className="streaming-cursor" />}
   </div>
   ```

   NOTE: Since `Response` wraps `Streamdown` which renders markdown, we CANNOT easily split the content into two spans with different classes at the markdown level -- Streamdown parses the full string. Instead, apply a simpler CSS approach: use a CSS `animation` on the entire `.message-text` container that does NOT re-trigger, and rely purely on the slower pacing for the "smooth and nice" feel. The slower pacing (110ms) combined with word-boundary advancement already creates the typewriter effect.

   Actually, the simplest high-impact change: keep the existing rendering approach (single string sliced to displayedLength) but make the cursor transition smoother and add a very subtle text-shadow glow that fades in on the `.message-text` container while streaming.

5. **Smoother cursor**: In `app/globals.css`, update `.streaming-cursor` to have a slightly wider width (2.5px), softer animation timing, and a subtle box-shadow glow matching `--alecci-red`.

In `app/globals.css`:

- Update `.streaming-cursor` keyframe to be smoother:
  ```css
  @keyframes cursor-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .streaming-cursor {
    display: inline-block;
    width: 2.5px;
    height: 1.15em;
    background-color: var(--alecci-red);
    border-radius: 1px;
    vertical-align: text-bottom;
    margin-left: 2px;
    animation: cursor-pulse 1.2s ease-in-out infinite;
    box-shadow: 0 0 4px color-mix(in srgb, var(--alecci-red) 40%, transparent);
  }
  ```

- Remove the `transform: scaleY()` from cursor-pulse -- the scaling looks jittery at slow speeds.

Summary of changes to TypewriterContent timing:
- `interval` while streaming: 60 -> 110 (ms)
- `interval` while catching up: 20 -> 35 (ms)
- Batch threshold: `gap > 150` -> `gap > 300`
- wordsPerTick when batching: keep at 3 (fine for large backlogs)
  </action>
  <verify>
    1. Run `pnpm build` -- no TypeScript errors
    2. Run `pnpm dev` and send a message to an AI executive
    3. Observe: text appears word-by-word at a noticeably slower, readable pace
    4. Observe: cursor pulses smoothly with a subtle glow
    5. Observe: when streaming finishes, remaining text fills in at a moderate pace (not instant)
    6. Refresh the page -- historical messages appear instantly with no animation
  </verify>
  <done>
    - Streaming typewriter pace is ~110ms per word (noticeably slower and more deliberate than before)
    - Catch-up pace is ~35ms per word (smooth fill, not jarring instant)
    - Cursor has subtle glow effect and smoother pulse
    - Historical messages render instantly (no regression)
    - No build errors
  </done>
</task>

</tasks>

<verification>
- `pnpm build` passes
- New message streaming shows slow, deliberate word-by-word reveal
- Page reload shows instant historical messages (no typewriter on old messages)
- Cursor animation is smooth with subtle glow
</verification>

<success_criteria>
AI assistant responses appear with a slow, elegant typewriter effect (~110ms/word) that feels deliberate and readable. The streaming cursor has a polished glow. Historical messages are unaffected.
</success_criteria>

<output>
After completion, create `.planning/quick/2-create-typewriter-animation-for-agent-re/2-SUMMARY.md`
</output>
