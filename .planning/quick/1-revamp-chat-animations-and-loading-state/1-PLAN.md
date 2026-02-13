---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/globals.css
  - components/enhanced-chat-message.tsx
  - components/messages.tsx
  - components/message.tsx
  - components/message-suggestions.tsx
  - components/greeting.tsx
autonomous: true
user_setup: []

must_haves:
  truths:
    - "User messages slide in with a smooth, premium entrance animation (not janky pop)"
    - "Assistant thinking indicator shows a polished animated state before text arrives"
    - "Typewriter cursor and streaming feel buttery smooth with no visual glitches"
    - "Suggestion chips appear with staggered, professional animation after assistant finishes"
    - "Page/chat loading state feels premium and intentional, not like a broken page"
    - "All transitions use consistent easing curves and timing across the chat experience"
  artifacts:
    - path: "app/globals.css"
      provides: "Refined keyframes, timing curves, and animation classes"
      contains: "message-enter"
    - path: "components/enhanced-chat-message.tsx"
      provides: "Polished thinking/typing indicator and message card entrance"
    - path: "components/messages.tsx"
      provides: "Smooth submitted-state loading indicator"
    - path: "components/message.tsx"
      provides: "Consistent entrance animations for both roles"
  key_links:
    - from: "app/globals.css"
      to: "components/message.tsx"
      via: "CSS class message-enter"
      pattern: "message-enter"
    - from: "components/enhanced-chat-message.tsx"
      to: "components/messages.tsx"
      via: "EnhancedChatMessage with isTyping prop"
      pattern: "isTyping.*true"
---

<objective>
Revamp chat animations and loading states to feel premium and professional.

Purpose: The current chat experience has janky animations — abrupt message appearances, a bare streaming cursor with no thinking state polish, and inconsistent motion timing. This plan replaces all chat animation/loading touchpoints with smooth, coordinated CSS-driven animations and refined React transitions, keeping the existing visual design (colors, layout, typography) completely unchanged.

Output: A polished chat experience where messages glide in, thinking states feel alive, streaming is buttery, and suggestion chips stagger in naturally.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/globals.css
@components/enhanced-chat-message.tsx
@components/messages.tsx
@components/message.tsx
@components/message-suggestions.tsx
@components/greeting.tsx
@components/elements/conversation.tsx
@hooks/use-messages.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Upgrade CSS animations and add premium thinking indicator</name>
  <files>app/globals.css, components/enhanced-chat-message.tsx</files>
  <action>
**In `app/globals.css`:**

1. Replace the `message-in` keyframes with a more premium version that includes a subtle scale:
```css
@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message-enter {
  animation: message-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```

2. Add a new `assistant-enter` animation for assistant message cards (separate from user bubbles):
```css
@keyframes assistant-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.assistant-enter {
  animation: assistant-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
}
```

3. Replace the basic `streaming-cursor` with a smoother, more premium pulsing cursor:
```css
@keyframes cursor-pulse {
  0%, 100% { opacity: 1; transform: scaleY(1); }
  50% { opacity: 0.4; transform: scaleY(0.85); }
}

.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1.15em;
  background-color: var(--alecci-red);
  border-radius: 1px;
  vertical-align: text-bottom;
  margin-left: 2px;
  animation: cursor-pulse 1s ease-in-out infinite;
}
```

4. Add a thinking dots animation for the waiting state:
```css
@keyframes thinking-dot {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1); }
}

.thinking-dots {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}

.thinking-dots span {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--alecci-red);
  animation: thinking-dot 1.4s ease-in-out infinite;
}

.thinking-dots span:nth-child(2) { animation-delay: 0.16s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.32s; }
```

5. Add staggered fade-in for suggestion chips:
```css
@keyframes chip-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.suggestion-chip {
  animation: chip-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.suggestion-chip:nth-child(1) { animation-delay: 0.05s; }
.suggestion-chip:nth-child(2) { animation-delay: 0.1s; }
.suggestion-chip:nth-child(3) { animation-delay: 0.15s; }
.suggestion-chip:nth-child(4) { animation-delay: 0.2s; }
```

**In `components/enhanced-chat-message.tsx`:**

1. Replace the bare `<span className="streaming-cursor" />` in the empty/thinking state (lines 161-163) with the thinking dots indicator:
```tsx
<div className="thinking-dots" aria-label="Thinking...">
  <span />
  <span />
  <span />
</div>
```

2. Add the `assistant-enter` class to the outermost wrapper div of assistant messages (the `max-w-[85%]` div, line 126). Only apply it when the message just appeared (i.e., when `isTyping` is true and content is empty or just starting). Use a ref to track if this message has already been visible to avoid re-triggering animation on re-renders:
```tsx
const [hasAppeared, setHasAppeared] = useState(false);
useEffect(() => {
  // Small delay to ensure DOM is ready, then trigger animation
  const id = requestAnimationFrame(() => setHasAppeared(true));
  return () => cancelAnimationFrame(id);
}, []);
```
Then apply `assistant-enter` class to the wrapper only when `hasAppeared` is false initially (the animation runs once on mount via CSS `both` fill mode, so just always apply the class).

3. Keep the `streaming-cursor` at the end of active typewriter content (line 98) as-is — just the CSS change makes it smoother.

Do NOT change: colors, layout, typography, avatar sizes, card structure, border styles. Only animation behavior.
  </action>
  <verify>
Run `pnpm build` to confirm no compilation errors. Visually verify in dev (`pnpm dev`) that:
- The thinking dots appear (3 animated dots) when waiting for assistant response
- The streaming cursor pulses smoothly (not harsh blink)
- Assistant messages have a subtle entrance animation
- User messages slide in smoothly
  </verify>
  <done>
Thinking indicator shows 3 staggered pulsing dots in alecci-red. Streaming cursor pulses smoothly instead of harsh blink. Message entrances are polished with appropriate timing curves. All existing visual design (colors, layout, typography) unchanged.
  </done>
</task>

<task type="auto">
  <name>Task 2: Polish message list transitions and replace framer-motion in greeting/suggestions</name>
  <files>components/messages.tsx, components/message.tsx, components/message-suggestions.tsx, components/greeting.tsx</files>
  <action>
**In `components/message.tsx`:**

1. Apply `assistant-enter` class to assistant messages too. Currently only user messages get `message-enter` (line 87-91). Add logic so assistant messages also get a smooth entrance:
```tsx
const shouldAnimateUser = message.role === "user";
const shouldAnimateAssistant = message.role === "assistant";
```
Apply `message-enter` to user messages (as now), and add `assistant-enter` to the outer div for assistant messages. This ensures both roles have entrance animations but with different character (user = snappy slide, assistant = gentler fade-slide).

**In `components/messages.tsx`:**

1. Replace the inline `EnhancedChatMessage` loading indicator block (lines 106-118, the "submitted" state before assistant message exists) with a more polished version that uses the same `assistant-enter` animation class:
```tsx
{status === "submitted" &&
  messages.length > 0 &&
  messages[messages.length - 1]?.role === "user" && (
    <div className="w-full assistant-enter">
      <EnhancedChatMessage
        botType={selectedBotType}
        content=""
        isTyping={true}
        role="assistant"
      />
    </div>
  )}
```
This ensures the thinking indicator fades in smoothly rather than popping in.

**In `components/message-suggestions.tsx`:**

1. Replace the framer-motion `AnimatePresence` and `motion.div` wrapper (lines 100-110, 216-217) with a plain div using the CSS animation approach. Replace:
```tsx
<AnimatePresence mode="wait">
  <motion.div animate={...} initial={...} exit={...} transition={...} className="mt-5">
```
With:
```tsx
<div className="mt-5 assistant-enter">
```

2. Replace the framer-motion `AnimatePresence`/`motion.span` for the icon swap (lines 162-188) with a simpler CSS transition approach. Use a conditional render without AnimatePresence — the icon swap happens instantly (it's tiny, not worth the framer-motion overhead):
```tsx
<span className="flex items-center justify-center">
  {isCopied ? (
    <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
  ) : (
    <Icon className={cn("size-3.5", EXECUTIVE_ACCENT_STYLES[botType])} />
  )}
</span>
```

3. Replace the `motion.span` on the "Added to input" indicator (lines 203-209) with a plain span using CSS transition:
```tsx
{isCopied && (
  <span className="ml-1 flex items-center gap-1 whitespace-nowrap text-xs text-emerald-600 dark:text-emerald-400 chip-in">
    <CornerDownLeft className="size-3" />
    <span className="hidden sm:inline">Added to input</span>
  </span>
)}
```

4. Add the `suggestion-chip` class to each suggestion button (the `<button>` element, around line 135-212) so they stagger in:
```tsx
className={cn(
  "suggestion-chip",
  "group relative flex items-start gap-2 rounded-xl border px-3 py-2",
  // ... rest of existing classes
)}
```

5. Remove the `framer-motion` imports (`AnimatePresence`, `motion`) from `message-suggestions.tsx` since they are no longer used.

**In `components/greeting.tsx`:**

1. Replace framer-motion `motion.div` elements with plain divs using CSS animations. Replace the two `motion.div` blocks (lines 25-47 and 49-57) with:
```tsx
<div className="flex items-center gap-3 font-semibold text-xl md:text-2xl animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
  <span>Hello there!</span>
  {/* voice button stays the same */}
</div>
<div className="text-xl text-zinc-500 md:text-2xl animate-fade-in-up" style={{ animationDelay: '0.45s' }}>
  I'm {personality.name}. How can I help you today?
</div>
```
This uses the existing `animate-fade-in-up` class already defined in globals.css (lines 14-27).

2. Remove the `framer-motion` import from `greeting.tsx`.

Do NOT change: any colors, typography, layout structure, message content rendering, or functional behavior. Only swap animation mechanisms.
  </action>
  <verify>
Run `pnpm build` to confirm no compilation errors and no unused framer-motion imports. Run `pnpm lint` to check for any issues. In dev mode (`pnpm dev`):
- Send a message and verify the thinking indicator slides in smoothly (not pop)
- Verify suggestion chips stagger in one by one after assistant finishes
- Verify greeting text fades in with staggered delay on new chat page
- Verify clicking a suggestion shows the copied state without janky animation
  </verify>
  <done>
Message list transitions are polished: thinking indicator fades in, suggestion chips stagger, greeting uses CSS animations. framer-motion removed from greeting.tsx and message-suggestions.tsx (reducing JS bundle for chat path). All visual design unchanged. Only animation mechanisms upgraded.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Complete chat animation and loading state overhaul:
- Premium thinking dots indicator (3 staggered pulsing dots) replaces bare cursor
- Smooth streaming cursor (pulse instead of harsh blink)
- Polished message entrance animations for both user and assistant messages
- Staggered suggestion chip animations
- CSS-driven greeting animations (removed framer-motion)
- Consistent easing curves and timing across all chat transitions
  </what-built>
  <how-to-verify>
1. Run `pnpm dev` and open http://localhost:3000
2. Start a new chat (should see greeting fade in with staggered timing)
3. Send a message - watch for:
   a. User message slides in smoothly (subtle scale + translate)
   b. Thinking dots appear with staggered animation (3 red dots)
   c. Assistant message card fades in smoothly
   d. Streaming text reveals with smooth pulsing cursor
   e. After response completes, suggestion chips stagger in one by one
4. Click a suggestion chip - verify the "Added to input" feedback appears cleanly
5. Send another message to verify animations work consistently on subsequent messages
6. Scroll up during streaming, then click "New messages" button - verify scroll is smooth
  </how-to-verify>
  <resume-signal>Type "approved" or describe any issues with specific animations</resume-signal>
</task>

</tasks>

<verification>
- `pnpm build` completes without errors
- `pnpm lint` passes
- No framer-motion imports remain in greeting.tsx or message-suggestions.tsx
- All animation classes defined in globals.css use consistent cubic-bezier(0.16, 1, 0.3, 1) easing
- Thinking dots use alecci-red color variable
- No layout shifts during animations (transform-only, no width/height changes)
</verification>

<success_criteria>
- Chat animations feel premium and intentional, not janky or abrupt
- Thinking indicator clearly communicates "processing" state with animated dots
- Streaming cursor pulses smoothly instead of harsh blinking
- Message entrances are polished with sub-300ms animations
- Suggestion chips stagger in naturally after assistant response completes
- Zero visual design changes (colors, layout, typography all preserved)
- framer-motion removed from 2 components (greeting, message-suggestions), reducing chat bundle size
- All animations are CSS-driven (GPU-composited, 60fps)
</success_criteria>

<output>
After completion, create `.planning/quick/1-revamp-chat-animations-and-loading-state/1-SUMMARY.md`
</output>
