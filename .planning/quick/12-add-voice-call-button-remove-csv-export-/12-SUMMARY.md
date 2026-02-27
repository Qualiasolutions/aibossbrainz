# Quick Task 12: Voice Call Button + Remove CSV + History Pinning

**Completed:** 2026-02-28
**Duration:** 6 minutes
**Commits:** 0a4f08b, 681256d, b797703, db8557b

## One-liner

Added voice call button to sidebar, removed CSV export from sheets, and implemented pin/unpin functionality with sorting on chat history page.

## Tasks Completed

### Task 1: Add Voice Call Button to Sidebar Header ✅

**Files Modified:**
- `components/app-sidebar.tsx` - Added AudioLines button with custom event dispatch
- `components/chat.tsx` - Added event listener for toggle-voice-mode

**Implementation:**
- Added `AudioLines` icon import from lucide-react
- Created `handleVoiceToggle` function dispatching `toggle-voice-mode` custom event
- Added voice button between Clear and New Chat in both desktop and mobile sidebars
- Reduced gap from `gap-2` to `gap-1.5` for tighter button layout
- Styled with emerald hover colors (`hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-600`) to distinguish from primary
- Added `useEffect` in chat.tsx to listen for event and call `toggleVoiceMode()`

**Verification:** Lint passed, build passed

---

### Task 2: Remove CSV Export Functionality ✅

**Files Modified:**
- `artifacts/sheet/client.tsx` - Removed CSV copy action and unparse import
- `app/(chat)/reports/report-actions.tsx` - Changed sheet MIME/extension to plain text

**Implementation:**
- Removed "Copy as .csv" action object from actions array (lines 69-84)
- Removed `unparse` from papaparse import (kept `parse` for SpreadsheetEditor)
- Changed `EXTENSION_MAP` sheet entry from `.csv` to `.txt`
- Changed `MIME_MAP` sheet entry from `text/csv` to `text/plain`
- Left server-side CSV parsing in `artifacts/sheet/server.ts` untouched (internal format)

**Verification:** Lint passed, build passed

---

### Task 3: Add Pin/Unpin to Chat History Page ✅

**Files Created:**
- `components/history-pin-button.tsx` - Client component for pin toggle
- `components/history-chat-list.tsx` - Client component for chat list rendering

**Files Modified:**
- `app/(chat)/history/page.tsx` - Integrated new components and converted types

**Implementation:**

**HistoryPinButton:**
- Star icon with filled state for pinned conversations
- Optimistic UI update (toggle immediately, revert on error)
- Uses `useCsrf` for authenticated PATCH `/api/chat?id={chatId}` requests
- Amber color scheme (`text-amber-600`) for pinned state
- Prevents Link navigation with `e.preventDefault()` and `e.stopPropagation()`

**HistoryChatList:**
- Client component accepting `initialChats` prop
- Sorts: pinned first (by createdAt desc), then unpinned (by createdAt desc)
- Amber ring border (`ring-2 ring-amber-400/50`) on pinned chat cards
- Handles pin toggle state updates locally via `handlePinToggle`
- Extracted `getBotIcon` and `getBotBadge` helper functions from server component

**History Page:**
- Removed `getBotIcon` and `getBotBadge` (moved to HistoryChatList)
- Added `isPinned` field to chatStats mapping from `chat.isPinned || false`
- Converted `createdAt` from string to Date (`new Date(chat.createdAt)`)
- Explicitly mapped only required fields to match `ChatStat` interface
- Removed unused imports (CalendarDays, format from date-fns)
- Replaced entire conversation list rendering with `<HistoryChatList initialChats={chatStats} />`

**Verification:** Lint passed, build passed (after type fix)

---

## Deviations from Plan

### Type Fix

**Issue:** TypeScript build error - chatStats had `createdAt` as string (from Supabase) but HistoryChatList expected Date.

**Fix:** Modified chatStats mapping to explicitly construct objects with converted types:
```typescript
chatStats = chats.map((chat) => ({
  id: chat.id,
  title: chat.title,
  createdAt: new Date(chat.createdAt),  // Convert string to Date
  visibility: chat.visibility,
  isPinned: chat.isPinned || false,
  primaryBot: stats?.primaryBot || "collaborative",
  messageCount: stats?.messageCount || 0,
}));
```

**Commit:** db8557b

This was a necessary deviation (Rule 1 - bug fix) to resolve the build error. The plan didn't specify type handling for the createdAt field conversion.

---

## Implementation Notes

### Voice Button Event Pattern

The sidebar doesn't have direct access to chat state, so a custom event (`toggle-voice-mode`) provides clean decoupling. The chat component already has the `toggleVoiceMode` function from `useInlineVoice` hook, making integration trivial.

### CSV Removal Scope

Only user-facing CSV export was removed. The server-side CSV parsing in `artifacts/sheet/server.ts` remains because that's how the AI creates sheet data internally (CSV is the serialization format for sheets).

### Pin Functionality Architecture

- **PATCH `/api/chat`** endpoint already supported `isPinned` updates (no API changes needed)
- **Chat type** already had `isPinned` field (no schema changes needed)
- Optimistic UI provides instant feedback while preventing race conditions via loading state
- CSRF protection via `csrfFetch` ensures security
- Client-side sorting ensures pinned chats always appear first without additional server queries

### Mobile Responsiveness

All three features maintain existing mobile patterns:
- Voice button uses same responsive sizing as Clear/New Chat
- CSV removal doesn't affect mobile (artifact actions already responsive)
- Pin button uses fixed size-8 with adequate touch target
- Amber ring on pinned cards visible but not overwhelming on small screens

---

## Verification

**Lint:** ✅ Passed (npx ultracite@latest check)
**Build:** ✅ Passed (pnpm build - Next.js 15.5.11)
**Formatter:** ✅ Applied (npx ultracite@latest fix - 2 files auto-formatted)

## Files Changed

**Modified:**
- `components/app-sidebar.tsx` (voice button + event dispatch)
- `components/chat.tsx` (voice event listener)
- `artifacts/sheet/client.tsx` (CSV removal)
- `app/(chat)/reports/report-actions.tsx` (MIME/extension change)
- `app/(chat)/history/page.tsx` (integration + type conversion)

**Created:**
- `components/history-pin-button.tsx` (pin toggle client component)
- `components/history-chat-list.tsx` (chat list client component)

## Next Steps

1. Test voice button in browser (sidebar → voice mode toggle)
2. Verify sheet artifacts no longer show CSV export option
3. Test pin/unpin on history page with multiple chats
4. Verify pinned chats sort to top and show amber ring
5. Test optimistic UI behavior (pin button disables during request)

## Related Work

- Quick task 5 introduced inline voice mode (VoiceModeButton)
- Chat history page has always had sorting by createdAt desc
- PATCH /api/chat already supports isPinned updates (implemented in Phase 18)
- Artifact actions pattern used across all artifact types (text, code, sheet, image)
