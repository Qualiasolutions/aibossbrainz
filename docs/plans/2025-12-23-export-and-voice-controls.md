# Export & Voice Speed Controls Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add PDF/Excel export buttons directly under each assistant message and add speed control to the existing voice player button.

**Architecture:** Extend `MessageActions` component with new export buttons that use existing `lib/pdf-export.ts` and add new Excel export utility. Enhance `VoicePlayerButton` with a popover menu for speed selection that persists via localStorage.

**Tech Stack:** jspdf + html2canvas (existing), xlsx (installed but unused), lucide-react icons, shadcn/ui Popover + Slider, localStorage for speed persistence

---

## Feature Summary

| Feature | Location | Description |
|---------|----------|-------------|
| PDF Export Button | Under each assistant message | Direct PDF download without fullscreen |
| Excel Export Button | Under each assistant message | Export message as .xlsx file |
| Voice Speed Control | Existing voice button | Popover with speed slider (0.5x - 2x) |

---

## Task 1: Create Excel Export Utility

**Files:**
- Create: `lib/excel-export.ts`

**Step 1: Create the Excel export function**

```typescript
import * as XLSX from "xlsx";

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
}

export function exportToExcel(
  text: string,
  options: ExcelExportOptions
): void {
  const { filename, sheetName = "Message" } = options;

  // Split text into paragraphs for better formatting
  const paragraphs = text.split(/\n\n+/).filter(Boolean);

  // Create worksheet data with each paragraph as a row
  const wsData = paragraphs.map((paragraph, index) => ({
    Section: index + 1,
    Content: paragraph.trim(),
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(wsData);

  // Set column widths for readability
  ws["!cols"] = [
    { wch: 10 }, // Section column
    { wch: 100 }, // Content column
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate and download file
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
```

**Step 2: Verify file created**

Run: `ls -la lib/excel-export.ts`
Expected: File exists with correct content

**Step 3: Commit**

```bash
git add lib/excel-export.ts
git commit -m "feat: add Excel export utility using xlsx library"
```

---

## Task 2: Add Export Icons

**Files:**
- Modify: `components/icons.tsx`

**Step 1: Add FileSpreadsheet and FileText icons to icons.tsx**

Find the existing icons file and add these exports at the end (before the final closing):

```typescript
export function FileTextIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      height={size}
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      width={size}
      style={{ color: "currentColor" }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.5 13.5V6.5H10.5V2.5H3.5V13.5H14.5ZM4 1H11.5L16 5.5V14C16 14.8284 15.3284 15.5 14.5 15.5H3.5C2.67157 15.5 2 14.8284 2 14V3C2 2.17157 2.67157 1.5 3.5 1.5L4 1ZM5 7.5H11V9H5V7.5ZM5 10.5H11V12H5V10.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function FileSpreadsheetIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      height={size}
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      width={size}
      style={{ color: "currentColor" }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.5 13.5V6.5H10.5V2.5H3.5V13.5H14.5ZM4 1H11.5L16 5.5V14C16 14.8284 15.3284 15.5 14.5 15.5H3.5C2.67157 15.5 2 14.8284 2 14V3C2 2.17157 2.67157 1.5 3.5 1.5L4 1ZM5 7H7V8.5H5V7ZM8.5 7H11V8.5H8.5V7ZM5 10H7V11.5H5V10ZM8.5 10H11V11.5H8.5V10Z"
        fill="currentColor"
      />
    </svg>
  );
}
```

**Step 2: Verify icons work**

Run: `pnpm lint`
Expected: No errors related to icons.tsx

**Step 3: Commit**

```bash
git add components/icons.tsx
git commit -m "feat: add FileTextIcon and FileSpreadsheetIcon for export buttons"
```

---

## Task 3: Add Export Buttons to MessageActions

**Files:**
- Modify: `components/message-actions.tsx`

**Step 1: Add imports at top of file**

Add these imports to the existing import statements:

```typescript
import { exportToPDF } from "@/lib/pdf-export";
import { exportToExcel } from "@/lib/excel-export";
import { FileTextIcon, FileSpreadsheetIcon } from "./icons";
import { botPersonalities } from "@/lib/bot-personalities";
```

**Step 2: Add export state and handlers**

Inside the `PureMessageActions` component, add after the existing `hasCopied` state:

```typescript
const [isExportingPdf, setIsExportingPdf] = useState(false);
const [isExportingExcel, setIsExportingExcel] = useState(false);
const messageRef = useRef<HTMLDivElement>(null);
```

Add the handler functions after the copy handler:

```typescript
const handleExportPdf = async () => {
  if (!messageText || isExportingPdf) return;

  setIsExportingPdf(true);
  try {
    // Get personality name for filename
    const personality = botType ? botPersonalities[botType] : null;
    const name = personality?.name?.split(" ")[0] || "Assistant";
    const date = new Date().toISOString().split("T")[0];
    const filename = `${name}-message-${date}`;

    // Create temporary element for PDF export
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = `
      <div style="padding: 40px; font-family: system-ui, sans-serif; max-width: 800px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e5e5;">
          ${personality?.avatar ? `<img src="${personality.avatar}" style="width: 48px; height: 48px; border-radius: 50%;" />` : ""}
          <div>
            <div style="font-weight: 600; font-size: 18px;">${personality?.name || "Assistant"}</div>
            <div style="color: #666; font-size: 14px;">${personality?.role || ""}</div>
          </div>
        </div>
        <div style="line-height: 1.7; white-space: pre-wrap;">${messageText}</div>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; color: #999; font-size: 12px;">
          Generated by Alecci Media AI on ${new Date().toLocaleDateString()}
        </div>
      </div>
    `;
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.background = "white";
    document.body.appendChild(tempDiv);

    await exportToPDF(tempDiv, filename);
    document.body.removeChild(tempDiv);

    toast.success("PDF exported successfully");
  } catch (error) {
    console.error("PDF export failed:", error);
    toast.error("Failed to export PDF");
  } finally {
    setIsExportingPdf(false);
  }
};

const handleExportExcel = () => {
  if (!messageText || isExportingExcel) return;

  setIsExportingExcel(true);
  try {
    const personality = botType ? botPersonalities[botType] : null;
    const name = personality?.name?.split(" ")[0] || "Assistant";
    const date = new Date().toISOString().split("T")[0];
    const filename = `${name}-message-${date}`;

    exportToExcel(messageText, {
      filename,
      sheetName: name,
    });

    toast.success("Excel exported successfully");
  } catch (error) {
    console.error("Excel export failed:", error);
    toast.error("Failed to export Excel");
  } finally {
    setIsExportingExcel(false);
  }
};
```

**Step 3: Add export buttons to the JSX**

Find the section with assistant message buttons (after the expand button, before vote buttons). Add these two buttons:

```tsx
{/* PDF Export Button */}
{messageText && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        className="text-muted-foreground hover:text-foreground"
        variant="ghost"
        size="icon"
        onClick={handleExportPdf}
        disabled={isExportingPdf}
      >
        {isExportingPdf ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileTextIcon size={16} />
        )}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      {isExportingPdf ? "Exporting..." : "Export as PDF"}
    </TooltipContent>
  </Tooltip>
)}

{/* Excel Export Button */}
{messageText && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        className="text-muted-foreground hover:text-foreground"
        variant="ghost"
        size="icon"
        onClick={handleExportExcel}
        disabled={isExportingExcel}
      >
        {isExportingExcel ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheetIcon size={16} />
        )}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      {isExportingExcel ? "Exporting..." : "Export as Excel"}
    </TooltipContent>
  </Tooltip>
)}
```

**Step 4: Add Loader2 import if not present**

Ensure `Loader2` is imported from lucide-react:

```typescript
import { Loader2 } from "lucide-react";
```

**Step 5: Update component props interface**

Add `botType` to the props if not already present:

```typescript
interface MessageActionsProps {
  // ... existing props
  botType?: BotType | null;
}
```

**Step 6: Run lint and fix any issues**

Run: `pnpm lint`
Expected: No errors

**Step 7: Commit**

```bash
git add components/message-actions.tsx
git commit -m "feat: add PDF and Excel export buttons to message actions"
```

---

## Task 4: Pass botType to MessageActions

**Files:**
- Modify: `components/message.tsx`

**Step 1: Find where MessageActions is rendered**

Locate the `<MessageActions>` component in message.tsx and ensure `botType` is passed:

```tsx
<MessageActions
  // ... existing props
  botType={botType}
/>
```

**Step 2: Verify botType is available in the component**

The `botType` should already be extracted from message metadata. Verify this exists:

```typescript
const botType = message.metadata?.botType as BotType | undefined;
```

**Step 3: Run lint**

Run: `pnpm lint`
Expected: No errors

**Step 4: Commit**

```bash
git add components/message.tsx
git commit -m "feat: pass botType to MessageActions for export filename"
```

---

## Task 5: Create Voice Speed Hook

**Files:**
- Create: `hooks/use-voice-speed.ts`

**Step 1: Create the hook**

```typescript
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "voice-playback-speed";
const DEFAULT_SPEED = 1.0;
const MIN_SPEED = 0.5;
const MAX_SPEED = 2.0;
const SPEED_STEP = 0.25;

export const SPEED_PRESETS = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1.0, label: "1x" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 1.75, label: "1.75x" },
  { value: 2.0, label: "2x" },
] as const;

export function useVoiceSpeed() {
  const [speed, setSpeedState] = useState<number>(DEFAULT_SPEED);

  // Load saved speed from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = Number.parseFloat(saved);
      if (!Number.isNaN(parsed) && parsed >= MIN_SPEED && parsed <= MAX_SPEED) {
        setSpeedState(parsed);
      }
    }
  }, []);

  const setSpeed = useCallback((newSpeed: number) => {
    const clamped = Math.max(MIN_SPEED, Math.min(MAX_SPEED, newSpeed));
    setSpeedState(clamped);
    localStorage.setItem(STORAGE_KEY, clamped.toString());
  }, []);

  const incrementSpeed = useCallback(() => {
    setSpeed(speed + SPEED_STEP);
  }, [speed, setSpeed]);

  const decrementSpeed = useCallback(() => {
    setSpeed(speed - SPEED_STEP);
  }, [speed, setSpeed]);

  const resetSpeed = useCallback(() => {
    setSpeed(DEFAULT_SPEED);
  }, [setSpeed]);

  return {
    speed,
    setSpeed,
    incrementSpeed,
    decrementSpeed,
    resetSpeed,
    minSpeed: MIN_SPEED,
    maxSpeed: MAX_SPEED,
    speedStep: SPEED_STEP,
  };
}
```

**Step 2: Verify file created**

Run: `ls -la hooks/use-voice-speed.ts`
Expected: File exists

**Step 3: Commit**

```bash
git add hooks/use-voice-speed.ts
git commit -m "feat: add useVoiceSpeed hook with localStorage persistence"
```

---

## Task 6: Update Voice Player Hook for Speed Support

**Files:**
- Modify: `hooks/use-voice-player.ts`

**Step 1: Add speed parameter to play function**

Update the `play` function signature and audio element creation to accept speed:

Find the `play` function and modify it to accept a speed parameter:

```typescript
const play = useCallback(
  async (text: string, botType: BotType, speed: number = 1.0) => {
```

**Step 2: Apply playback rate when audio is ready**

After the audio element is created and before playing, add:

```typescript
audio.playbackRate = speed;
```

This should be added after `audio.src = URL.createObjectURL(blob)` and before `audio.play()`.

**Step 3: Update the type definition**

Update the return type if there's an interface:

```typescript
play: (text: string, botType: BotType, speed?: number) => Promise<void>;
```

**Step 4: Run lint**

Run: `pnpm lint`
Expected: No errors

**Step 5: Commit**

```bash
git add hooks/use-voice-player.ts
git commit -m "feat: add speed parameter to voice player hook"
```

---

## Task 7: Create Voice Player Button with Speed Controls

**Files:**
- Modify: `components/voice-player-button.tsx`

**Step 1: Add imports**

Add these imports at the top:

```typescript
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useVoiceSpeed, SPEED_PRESETS } from "@/hooks/use-voice-speed";
import { ChevronDown, Gauge } from "lucide-react";
```

**Step 2: Add speed state to component**

Inside the component, add:

```typescript
const { speed, setSpeed } = useVoiceSpeed();
const [showSpeedPopover, setShowSpeedPopover] = useState(false);
```

**Step 3: Update play call to include speed**

Find where `voicePlayer.play(text, botType)` is called and update to:

```typescript
voicePlayer.play(text, botType, speed);
```

**Step 4: Replace the button JSX with a button group including speed control**

Replace the entire return statement with:

```tsx
return (
  <div className="flex items-center">
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-8 rounded-r-none text-muted-foreground hover:text-foreground"
          onClick={handleClick}
          disabled={voicePlayer.isLoading}
        >
          {voicePlayer.isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : voicePlayer.isPaused ? (
            <Play size={16} className="text-emerald-500" />
          ) : voicePlayer.isPlaying ? (
            <Pause size={16} className="text-rose-500" />
          ) : (
            <Volume2 size={16} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {voicePlayer.isLoading
          ? "Generating voice..."
          : voicePlayer.isPaused
            ? "Resume"
            : voicePlayer.isPlaying
              ? "Pause"
              : "Listen to response"}
      </TooltipContent>
    </Tooltip>

    <Popover open={showSpeedPopover} onOpenChange={setShowSpeedPopover}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-6 rounded-l-none border-l border-border/40 px-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown size={12} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Gauge size={14} />
              Speed
            </span>
            <span className="text-sm text-muted-foreground">{speed}x</span>
          </div>
          <Slider
            value={[speed]}
            onValueChange={([value]) => setSpeed(value)}
            min={0.5}
            max={2}
            step={0.25}
            className="w-full"
          />
          <div className="flex flex-wrap gap-1">
            {SPEED_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                type="button"
                variant={speed === preset.value ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSpeed(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  </div>
);
```

**Step 5: Run lint**

Run: `pnpm lint`
Expected: No errors

**Step 6: Test locally**

Run: `pnpm dev`
Expected: Voice button shows with dropdown arrow, clicking arrow shows speed popover

**Step 7: Commit**

```bash
git add components/voice-player-button.tsx
git commit -m "feat: add speed controls popover to voice player button"
```

---

## Task 8: Ensure Slider Component Exists

**Files:**
- Check: `components/ui/slider.tsx`

**Step 1: Check if Slider component exists**

Run: `ls -la components/ui/slider.tsx`

**Step 2: If not exists, create using shadcn**

If the file doesn't exist, create it:

```typescript
"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
```

**Step 3: Install @radix-ui/react-slider if needed**

Run: `pnpm add @radix-ui/react-slider`

**Step 4: Commit if created**

```bash
git add components/ui/slider.tsx package.json pnpm-lock.yaml
git commit -m "feat: add Slider component from shadcn/ui"
```

---

## Task 9: Final Testing & Lint

**Files:**
- All modified files

**Step 1: Run full lint check**

Run: `pnpm lint`
Expected: No errors

**Step 2: Run format**

Run: `pnpm format`
Expected: Files formatted

**Step 3: Start dev server and test**

Run: `pnpm dev`

Test checklist:
- [ ] PDF export button visible under assistant messages
- [ ] Excel export button visible under assistant messages
- [ ] PDF downloads with correct filename (Executive-message-date.pdf)
- [ ] Excel downloads with correct filename
- [ ] Voice button has dropdown arrow
- [ ] Speed popover opens on dropdown click
- [ ] Slider adjusts speed
- [ ] Speed preset buttons work
- [ ] Speed persists after page refresh
- [ ] Voice playback uses selected speed

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete export buttons and voice speed controls implementation"
```

---

## Task 10: Update PROGRESS.md

**Files:**
- Modify: `PROGRESS.md`

**Step 1: Add completion entry**

Add to the "Completed" section:

```markdown
- [x] PDF export button on message actions (2025-12-23)
- [x] Excel export button on message actions (2025-12-23)
- [x] Voice speed control popover (2025-12-23)
```

**Step 2: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: update progress with export and voice speed features"
```

---

## Implementation Order Summary

1. **Task 1:** Create Excel export utility (`lib/excel-export.ts`)
2. **Task 2:** Add export icons (`components/icons.tsx`)
3. **Task 3:** Add export buttons to MessageActions
4. **Task 4:** Pass botType to MessageActions from message.tsx
5. **Task 5:** Create voice speed hook (`hooks/use-voice-speed.ts`)
6. **Task 6:** Update voice player hook for speed support
7. **Task 7:** Update voice player button with speed popover
8. **Task 8:** Ensure Slider component exists
9. **Task 9:** Final testing and lint
10. **Task 10:** Update PROGRESS.md

---

## Files Modified/Created Summary

| Action | File |
|--------|------|
| Create | `lib/excel-export.ts` |
| Create | `hooks/use-voice-speed.ts` |
| Create | `components/ui/slider.tsx` (if needed) |
| Modify | `components/icons.tsx` |
| Modify | `components/message-actions.tsx` |
| Modify | `components/message.tsx` |
| Modify | `hooks/use-voice-player.ts` |
| Modify | `components/voice-player-button.tsx` |
| Modify | `PROGRESS.md` |

---

## Dependencies

- `xlsx` - Already installed (v0.18.5)
- `@radix-ui/react-slider` - May need installation
- `html2canvas` + `jspdf` - Already installed
