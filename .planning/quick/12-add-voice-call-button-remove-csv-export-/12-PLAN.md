# Quick Task 12: Voice Call Button + Remove CSV + History Pinning

## Task 1: Add Voice Call Button to Sidebar Header

**Files:** `components/app-sidebar.tsx`

Add a voice call button next to the "Clear" and "New Chat" buttons in the sidebar header. This button triggers the inline voice mode (same as VoiceModeButton). Since the sidebar doesn't have access to chat state directly, implement it as a global event that the chat component listens to.

**Approach:**
- Add a `Phone` (or `AudioLines`) icon button between "Clear" and "New Chat" in both desktop and mobile sidebars
- Create a simple custom event `toggle-voice-mode` that the sidebar dispatches
- In `components/chat.tsx`, listen for this event and call `toggleVoiceMode()`
- Style the button consistently with Clear/New Chat buttons (h-9 rounded-lg)
- Make the 3 buttons closer together (reduce gap or make buttons smaller)

**Implementation:**
1. In `components/app-sidebar.tsx`:
   - Import `AudioLines` from lucide-react
   - Add voice call button in the `flex gap-2` div between Clear and New Chat (both desktop and mobile)
   - Button dispatches `window.dispatchEvent(new CustomEvent('toggle-voice-mode'))`
   - Style: ghost variant matching Clear button styling with voice-specific hover color

2. In `components/chat.tsx`:
   - Add useEffect to listen for `toggle-voice-mode` custom event
   - Call `toggleVoiceMode()` when event fires

## Task 2: Remove CSV Export Functionality

**Files:** `artifacts/sheet/client.tsx`, `app/(chat)/reports/report-actions.tsx`

Remove the CSV copy/export from the sheet artifact and clean up CSV references in report actions.

**Implementation:**
1. In `artifacts/sheet/client.tsx`:
   - Remove the "Copy as .csv" action from the actions array (lines 69-83)
   - Remove `unparse` from the papaparse import if it becomes unused (check if it's used elsewhere)
   - Keep `parse` import since it's used in SpreadsheetEditor

2. In `app/(chat)/reports/report-actions.tsx`:
   - Remove `sheet: ".csv"` from EXTENSION_MAP and replace with `sheet: ".txt"`
   - Remove `sheet: "text/csv"` from MIME_MAP and replace with `sheet: "text/plain"`

NOTE: Keep the server-side CSV parsing in `artifacts/sheet/server.ts` since that's how the AI creates sheet data (csv format is the internal data format). Only remove user-facing CSV export.

## Task 3: Add Pin/Unpin to Chat History Page

**Files:** `app/(chat)/history/page.tsx`

Add pin/unpin functionality to the history page chat cards. Since this is a server component, we need a client component for the pin button.

**Implementation:**
1. Create a client component `components/history-pin-button.tsx`:
   - Accept `chatId`, `isPinned`, `onToggle` props
   - Star icon button that calls PATCH /api/chat with isPinned toggle
   - Uses `useCsrf` for the CSRF fetch
   - Optimistic UI update (toggle immediately, revert on error)

2. In `app/(chat)/history/page.tsx`:
   - Import the HistoryPinButton component
   - Add the pin button to each chat card (in the badge area)
   - Sort pinned chats to the top of the list
   - Show a visual indicator for pinned chats (amber/gold border or star icon)
   - Add `isPinned` field to the chatStats mapping (already on Chat type)
