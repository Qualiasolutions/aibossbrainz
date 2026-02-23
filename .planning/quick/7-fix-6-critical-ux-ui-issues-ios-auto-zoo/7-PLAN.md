---
phase: quick-7
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/multimodal-input.tsx
  - components/chat/chat-header.tsx
  - components/elements/actions.tsx
  - components/voice-player-button.tsx
  - components/voice-input-button.tsx
  - components/voice-mode-button.tsx
  - components/focus-mode-chips.tsx
  - components/executive-landing.tsx
  - app/globals.css
  - hooks/use-keyboard-height.ts
  - components/chat.tsx
  - components/messages.tsx
autonomous: true
must_haves:
  truths:
    - "iOS Safari does not auto-zoom when user taps the chat textarea"
    - "All interactive buttons have at least 44x44px touch target on mobile"
    - "Muted foreground text in dark mode passes WCAG AA contrast ratio"
    - "Virtual keyboard on mobile does not overlap input area or scroll-to-bottom button"
    - "Focus mode chips show gradient fade indicators when overflowing horizontally"
    - "Executive landing cards stack vertically on mobile screens"
  artifacts:
    - path: "components/multimodal-input.tsx"
      provides: "16px textarea on mobile (no iOS zoom), 44px touch targets on buttons"
    - path: "app/globals.css"
      provides: "WCAG AA compliant muted-foreground in dark mode"
    - path: "hooks/use-keyboard-height.ts"
      provides: "Virtual keyboard height detection via visualViewport API"
    - path: "components/focus-mode-chips.tsx"
      provides: "Gradient scroll indicators on overflow edges"
    - path: "components/executive-landing.tsx"
      provides: "Responsive grid: 1 col mobile, 3 col desktop"
  key_links:
    - from: "hooks/use-keyboard-height.ts"
      to: "components/chat.tsx"
      via: "useKeyboardHeight hook consumed in input area wrapper"
      pattern: "useKeyboardHeight"
---

<objective>
Fix 6 critical UX/UI issues identified in comprehensive review: iOS auto-zoom, touch targets, dark mode contrast, virtual keyboard compensation, focus chip scroll indicators, and responsive executive landing grid. Then deploy to production.

Purpose: These are mobile-critical issues causing degraded experience on iOS Safari and small screens.
Output: All 6 fixes applied, build passing, deployed to production.
</objective>

<execution_context>
@components/multimodal-input.tsx
@components/chat/chat-header.tsx
@components/elements/actions.tsx
@components/voice-player-button.tsx
@components/voice-input-button.tsx
@components/voice-mode-button.tsx
@components/focus-mode-chips.tsx
@components/executive-landing.tsx
@app/globals.css
@components/chat.tsx
@components/messages.tsx
</execution_context>

<tasks>

<task type="auto">
  <name>Task 1: Fix iOS auto-zoom, touch targets, and dark mode contrast</name>
  <files>
    components/multimodal-input.tsx
    components/chat/chat-header.tsx
    components/elements/actions.tsx
    components/voice-player-button.tsx
    components/voice-input-button.tsx
    components/voice-mode-button.tsx
    components/executive-landing.tsx
    app/globals.css
  </files>
  <action>
**Fix 1 - iOS Safari Auto-Zoom (multimodal-input.tsx):**
Line 334: Change the PromptInputTextarea className from `text-xs` to `text-base sm:text-xs` (16px on mobile prevents iOS auto-zoom, 12px on desktop keeps compact look). Also change `placeholder:text-xs` to `placeholder:text-base sm:placeholder:text-xs` in the same className string.

**Fix 2 - Touch Targets (multiple files):**
All touch target changes use the pattern: keep visual size small via icon size, but expand the tappable area to 44px on mobile using `min-h-11 min-w-11 sm:min-h-0 sm:min-w-0` or responsive size classes.

- `multimodal-input.tsx` line 324 (VoiceInputButton className prop): Change `size-6` to `size-11 sm:size-6` for the VoiceInputButton className passed at line 324.
- `multimodal-input.tsx` line 376 (PromptInputSubmit): Change `size-6` to `size-11 sm:size-6` in className.
- `multimodal-input.tsx` line 424 (AttachmentsButton): Change `size-6` to `size-11 sm:size-6` in className.
- `chat-header.tsx` lines 65, 86, 97, 150: All header buttons use `h-8`. Change to `h-11 sm:h-8` for mobile touch compliance. Specifically:
  - Line 65 (New Chat button): `h-8` -> `h-11 sm:h-8`
  - Line 86 (Strategy Canvas button): `h-8` -> `h-11 sm:h-8`
  - Line 97 (Menu/More button): `h-8` -> `h-11 sm:h-8`
  - Line 150 (Support button): `h-8` -> `h-11 sm:h-8`
- `elements/actions.tsx` line 38: Change `size-9` to `size-11 sm:size-9` for message action buttons.
- `voice-player-button.tsx`:
  - Line 143 (main play/pause Button): Add `className="size-11 sm:size-9"` or merge with existing className prop. The button uses `size="icon"` which is likely ~36px. Override with explicit `size-11 sm:size-9` in className.
  - Line 186-188 (settings chevron button): Change `h-8 w-6` to `h-11 w-8 sm:h-8 sm:w-6`.
- `voice-input-button.tsx`: The button inherits size from the `className` prop passed by multimodal-input.tsx (already handled above via `size-11 sm:size-6`). No additional change needed in this file.
- `voice-mode-button.tsx` line 49: Change `size-8` to `size-11 sm:size-8` in the className.

**Fix 3 - Dark Mode Contrast (globals.css):**
Line 221: Change `--muted-foreground: hsl(0 0% 55%)` to `--muted-foreground: hsl(0 0% 65%)` in the `.dark` block. This improves from ~4.2:1 to ~5.7:1 contrast ratio against the dark background (hsl(0 0% 3%)), meeting WCAG AA.

**Fix 6 - Executive Landing Responsive Grid (executive-landing.tsx):**
Line 70: Change `grid grid-cols-3 gap-3` to `grid grid-cols-1 sm:grid-cols-3 gap-3`. This stacks executive cards vertically on mobile.
  </action>
  <verify>
Run `pnpm build` - must pass with no errors. Visually verify: on mobile viewport (375px), textarea shows 16px text, all buttons have min 44px touch area, executive cards stack vertically.
  </verify>
  <done>
iOS Safari no longer auto-zooms on input focus (text-base on mobile). All interactive buttons meet 44px minimum touch target on mobile. Dark mode muted-foreground passes WCAG AA (5.7:1 ratio). Executive landing stacks on mobile.
  </done>
</task>

<task type="auto">
  <name>Task 2: Virtual keyboard compensation and focus chip scroll indicators</name>
  <files>
    hooks/use-keyboard-height.ts
    components/chat.tsx
    components/messages.tsx
    components/focus-mode-chips.tsx
  </files>
  <action>
**Fix 4 - Virtual Keyboard Height Compensation:**

Create `hooks/use-keyboard-height.ts`:
```typescript
"use client";

import { useEffect, useState } from "react";

/**
 * Detects virtual keyboard height using the visualViewport API.
 * Returns the keyboard height in pixels (0 when keyboard is hidden).
 * Falls back gracefully to 0 on browsers without visualViewport support.
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      // The keyboard height is the difference between window inner height
      // and the visual viewport height (viewport shrinks when keyboard opens)
      const height = window.innerHeight - viewport.height;
      // Only treat as keyboard if the difference is significant (>100px)
      // to avoid false positives from browser chrome changes
      setKeyboardHeight(height > 100 ? height : 0);
    };

    viewport.addEventListener("resize", handleResize);
    viewport.addEventListener("scroll", handleResize);

    return () => {
      viewport.removeEventListener("resize", handleResize);
      viewport.removeEventListener("scroll", handleResize);
    };
  }, []);

  return keyboardHeight;
}
```

In `components/chat.tsx` (line ~567, the input area wrapper div):
- Import `useKeyboardHeight` from `@/hooks/use-keyboard-height`
- Call `const keyboardHeight = useKeyboardHeight();` inside the Chat component (near the other hooks around line 470)
- On the input area wrapper div (line 567), add a dynamic `style` prop:
  Change from:
  ```
  <div className="flex-shrink-0 border-t border-border bg-background/80 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-6 sm:pt-4 sm:pb-6">
  ```
  To:
  ```
  <div
    className="flex-shrink-0 border-t border-border bg-background/80 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl transition-[padding] duration-150 sm:px-6 sm:pt-4 sm:pb-6"
    style={keyboardHeight > 0 ? { paddingBottom: `${keyboardHeight}px` } : undefined}
  >
  ```

In `components/messages.tsx` (line 162, scroll-to-bottom button):
- The Messages component does NOT have access to keyboardHeight. Instead, apply a CSS approach: the scroll-to-bottom button is positioned `bottom-4`. When the keyboard is open, the input area grows with padding, pushing the messages area up naturally. The button's `bottom-4` position relative to the messages container is sufficient since the messages container itself shrinks when the input area grows. No change needed to messages.tsx - the flexbox layout handles this automatically because the input area's increased padding-bottom shrinks the messages flex-1 area.

**Fix 5 - Focus Mode Chips Scroll Indicators (focus-mode-chips.tsx):**

Replace the existing scroll arrow buttons (lines 86-98 and 145-158) with gradient fade overlays. The current implementation uses small chevron buttons that are hard to tap and not visually intuitive.

Update the component to add gradient fade indicators:
- Remove the `<AnimatePresence>` blocks with the left/right chevron buttons (lines 86-98 and 145-158)
- Add gradient overlay divs that appear based on the existing `showLeftArrow`/`showRightArrow` state:

Before the scrollable div (line 101), add:
```jsx
{/* Left fade indicator */}
{showLeftArrow && (
  <div
    className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-background to-transparent"
    aria-hidden
  />
)}
```

After the scrollable div (after line 143), add:
```jsx
{/* Right fade indicator */}
{showRightArrow && (
  <div
    className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-background to-transparent"
    aria-hidden
  />
)}
```

Remove the imports for `ChevronLeft` and `ChevronRight` from lucide-react since they're no longer used. Also remove the `scroll` function (lines 68-76) and the AnimatePresence import if it's only used for the scroll arrows (check - it's also used in voice buttons, but in THIS file it can be removed since the chip motion elements don't use AnimatePresence).

Wait - `AnimatePresence` IS used in the existing chevron buttons only. The chip buttons use `motion.button` but no `AnimatePresence`. So remove `AnimatePresence` from the import and the `ChevronLeft`/`ChevronRight` imports. Keep the `motion` import for the chip buttons.
  </action>
  <verify>
Run `pnpm build` - must pass with no errors. Test: on mobile viewport, when virtual keyboard opens, the input area should pad up so it's not hidden behind the keyboard. Focus mode chips should show gradient fades on edges when scrollable content overflows.
  </verify>
  <done>
Virtual keyboard no longer overlaps the chat input on mobile (dynamic padding via visualViewport API). Focus mode chips show gradient fade indicators on left/right edges when content overflows, replacing the tiny chevron buttons with a more intuitive visual cue.
  </done>
</task>

<task type="auto">
  <name>Task 3: Build verification and production deployment</name>
  <files>
    (no new files - verification and deploy)
  </files>
  <action>
1. Run `pnpm build` to verify all changes compile correctly with no TypeScript or lint errors.
2. If build fails, fix any issues (likely unused imports or type errors).
3. Run `pnpm lint` to check for lint issues and fix if any.
4. Deploy to production: `vercel --prod`
5. Verify the deployment URL is live and accessible.
  </action>
  <verify>
`pnpm build` exits 0. `vercel --prod` completes successfully with a production URL. Visit the production URL to confirm the site loads.
  </verify>
  <done>
All 6 UX/UI fixes are deployed to production. Build passes. Site is live.
  </done>
</task>

</tasks>

<verification>
1. `pnpm build` passes with zero errors
2. `pnpm lint` passes
3. Production deployment succeeds via `vercel --prod`
4. Mobile viewport (375px) testing confirms:
   - No iOS auto-zoom on textarea focus
   - Touch targets meet 44px minimum
   - Dark mode text is readable (WCAG AA)
   - Keyboard doesn't overlap input
   - Scroll indicators visible on focus chips
   - Executive cards stack vertically
</verification>

<success_criteria>
- All 6 fixes implemented and deployed to production
- Zero build or lint errors
- No visual regressions on desktop (responsive classes preserve desktop sizing)
</success_criteria>
