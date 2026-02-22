---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(chat)/chat/[id]/page.tsx
  - components/chat-with-error-boundary.tsx
  - components/chat.tsx
  - components/messages.tsx
  - components/message.tsx
  - components/message-actions.tsx
  - components/message-fullscreen.tsx
  - lib/pdf-export.ts
  - lib/conversation-export.ts
  - lib/ai/parse-suggestions.ts
autonomous: true
must_haves:
  truths:
    - "Individual message PDFs show the conversation topic as a title line above the executive name/role header"
    - "Individual message PDF filenames include the conversation topic and a timestamp (e.g., Brand-Strategy-Discussion-Alexandria-2026-02-22T14-30-00.pdf)"
    - "Fullscreen message PDF filenames include the conversation topic and a timestamp"
    - "Conversation export PDF uses the actual chat.topic (or chat.title fallback) instead of the first 50 chars of the first message"
    - "No suggestion JSON (code block or raw array) appears in any exported PDF content"
  artifacts:
    - path: "lib/pdf-export.ts"
      provides: "exportToPDF with optional chatTitle parameter rendered as title line"
    - path: "lib/ai/parse-suggestions.ts"
      provides: "Robust suggestion stripping covering edge cases"
    - path: "components/chat.tsx"
      provides: "chatTopic prop threaded to conversation export and child components"
  key_links:
    - from: "app/(chat)/chat/[id]/page.tsx"
      to: "components/chat.tsx"
      via: "chatTopic prop (chat.topic || chat.title)"
      pattern: "chatTopic.*chat\\.topic"
    - from: "components/chat.tsx"
      to: "components/messages.tsx"
      via: "chatTopic prop"
    - from: "components/messages.tsx"
      to: "components/message-fullscreen.tsx"
      via: "chatTitle prop"
    - from: "components/message.tsx"
      to: "components/message-actions.tsx"
      via: "chatTitle prop"
---

<objective>
Fix PDF export across all 3 export paths: proper filenames with conversation topic + timestamp, add conversation title to individual message PDFs, and ensure suggestion JSON never leaks into exported content.

Purpose: PDF exports currently have generic filenames (e.g., "Alexandria-message-2026-02-06.pdf"), individual message PDFs lack a conversation title header, and suggestion JSON sometimes leaks into PDF content.

Output: All PDF exports use descriptive topic-based filenames, individual message PDFs show the conversation topic as a title, and suggestion JSON is reliably stripped.
</objective>

<execution_context>
@/home/qualia/.claude/get-shit-done/workflows/execute-plan.md
@/home/qualia/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/(chat)/chat/[id]/page.tsx
@components/chat-with-error-boundary.tsx
@components/chat.tsx
@components/messages.tsx
@components/message.tsx
@components/message-actions.tsx
@components/message-fullscreen.tsx
@lib/pdf-export.ts
@lib/conversation-export.ts
@lib/ai/parse-suggestions.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Thread chatTopic prop and fix filenames across all export paths</name>
  <files>
    app/(chat)/chat/[id]/page.tsx
    components/chat-with-error-boundary.tsx
    components/chat.tsx
    components/messages.tsx
    components/message.tsx
    components/message-actions.tsx
    components/message-fullscreen.tsx
    lib/pdf-export.ts
    lib/conversation-export.ts
  </files>
  <action>
    **1. Thread `chatTopic` from page to Chat component:**

    In `app/(chat)/chat/[id]/page.tsx`: Add `chatTopic={chat.topic || chat.title}` prop to both `ChatWithErrorBoundary` renders (lines 76 and 94).

    In `components/chat-with-error-boundary.tsx`: Pass through the new `chatTopic` prop to `Chat`.

    In `components/chat.tsx`:
    - Add `chatTopic?: string` to `ChatProps` interface
    - Use `chatTopic` in `handleExportPDF` instead of the current first-50-chars-of-first-message logic (line 449-452). Pass it to `exportConversationToPDF`.
    - Pass `chatTopic` to the `Messages` component.

    In `components/messages.tsx`:
    - Add `chatTopic?: string` to `MessagesProps`
    - Pass it to `MessageFullscreen` as `chatTitle` prop
    - Pass it to `PreviewMessage` as `chatTitle` prop

    In `components/message.tsx`:
    - Add `chatTitle?: string` to `PurePreviewMessage` props
    - Pass it to `MessageActions` as `chatTitle` prop
    - Pass it to `onFullscreen` callback (update the callback to also carry `chatTitle`)

    In `components/message-actions.tsx`:
    - Add `chatTitle?: string` to `PureMessageActions` props
    - In `handleExportPdf`, build filename as: `safeTopic-executiveFirstName-YYYY-MM-DDTHH-MM-SS`
      where `safeTopic` = `(chatTitle || "Message").replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 40)`
      and timestamp = `new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)`
    - Pass `chatTitle` to `exportToPDF` as the new optional 5th parameter

    In `components/message-fullscreen.tsx`:
    - Add `chatTitle?: string` to `MessageFullscreenProps`
    - In `handleExportPDF`, build filename same pattern as message-actions
    - Pass `chatTitle` to `exportToPDF`

    **2. Update `exportToPDF` to accept optional chatTitle:**

    In `lib/pdf-export.ts`:
    - Add 5th optional parameter `chatTitle?: string`
    - If `chatTitle` is provided and non-empty, render it FIRST as a title line:
      - Font: helvetica bold, size 14, color STYLES.headingColor
      - Wrap with `doc.splitTextToSize(chatTitle, STYLES.contentWidth)` for long titles
      - Add 8mm spacing after title before executive name
    - The existing executive name + role header follows after

    **3. Fix conversation export filename:**

    In `lib/conversation-export.ts`: The filename logic (lines 104-109) is already decent. No change needed to the filename pattern itself, but the `chatTitle` parameter now receives the actual `chat.topic || chat.title` instead of the first 50 chars of the first message.

    **Important:** For new chats that haven't been topic-classified yet (topic is null), `chat.title` is the AI-generated title which is a reasonable fallback. The current first-50-chars approach is the worst option since it grabs raw user input.

    **Memo comparison updates:**
    - In `message.tsx` memo comparison: chatTitle is a string prop, add comparison check only if it could change frequently. Since it comes from DB and doesn't change during a session, it does NOT need a memo check (it won't cause unnecessary re-renders).
    - In `messages.tsx` memo: same reasoning, no need to add chatTopic comparison.
  </action>
  <verify>
    Run `pnpm build` to verify no TypeScript errors from the prop threading.
    Verify all 10 files compile cleanly.
  </verify>
  <done>
    - chatTopic flows from page -> Chat -> Messages -> MessageActions/MessageFullscreen
    - All 3 export paths use topic-based filenames with timestamps
    - Individual message PDFs show conversation title above executive header
    - Conversation export receives actual chat topic instead of first 50 chars of message
  </done>
</task>

<task type="auto">
  <name>Task 2: Harden suggestion JSON stripping in parseSuggestions</name>
  <files>
    lib/ai/parse-suggestions.ts
  </files>
  <action>
    The current `SUGGESTIONS_RAW_JSON_REGEX` is:
    ```
    /\n*(\[\s*\{[\s\S]*?"category"[\s\S]*?"text"[\s\S]*?\}\s*\])\s*$/
    ```

    This has issues:
    1. It uses `[\s\S]*?` which is lazy but can still match too broadly or fail on certain JSON structures
    2. It only anchors to end of string (`$`) but doesn't account for trailing newlines well in all cases
    3. The AI sometimes produces suggestion JSON with properties in different order (text before category)

    **Fix the regex and add a fallback:**

    Replace `SUGGESTIONS_RAW_JSON_REGEX` with a more robust pattern:
    ```ts
    const SUGGESTIONS_RAW_JSON_REGEX =
      /\n*(\[[\s\S]*?\{[\s\S]*?(?:"category"|"text")[\s\S]*?(?:"category"|"text")[\s\S]*?\}[\s\S]*?\])\s*$/;
    ```

    This handles both `category` before `text` and `text` before `category`.

    **Add a third fallback** after the code block and raw JSON checks in `parseSuggestions()`:
    After the existing two checks (code block and raw JSON), add a third catch-all that looks for any trailing JSON array containing objects with both "category" and "text" keys. Use a functional approach:

    ```ts
    // Fallback: try to find and strip any trailing JSON array with suggestion-like objects
    const trailingJsonMatch = text.match(/\n*(\[[\s\S]{10,500}\])\s*$/);
    if (trailingJsonMatch) {
      try {
        const parsed = JSON.parse(trailingJsonMatch[1]);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.every(
            (item: unknown) =>
              typeof item === "object" &&
              item !== null &&
              "category" in item &&
              "text" in item
          )
        ) {
          jsonString = trailingJsonMatch[1];
          contentWithoutSuggestions = text
            .replace(trailingJsonMatch[0], "")
            .trim();
        }
      } catch {
        // Not valid JSON, ignore
      }
    }
    ```

    Place this fallback BEFORE the `return { content: text, suggestions: [] }` line (the current else branch at line 38-39). Structure the flow as:
    1. Try code block format
    2. Try raw JSON regex
    3. Try trailing JSON array fallback (parse-based, not regex-based detection)
    4. If none match, return original text

    This ensures even if the regex misses a format variation, the parse-based fallback catches it.
  </action>
  <verify>
    Run `pnpm build` to confirm no TypeScript errors.
    Verify the function still correctly handles:
    - Code block suggestions (```suggestions ... ```)
    - Raw JSON at end of message
    - JSON with reversed key order (text before category)
    - Messages with no suggestions (returns original text)
    - Malformed JSON (returns original text)
  </verify>
  <done>
    - parseSuggestions reliably strips suggestion JSON in all known formats
    - Three-tier detection: code block -> regex -> parse-based fallback
    - No suggestion JSON leaks into PDF exports
    - Non-suggestion content is never accidentally stripped
  </done>
</task>

</tasks>

<verification>
1. `pnpm build` passes with zero errors
2. `pnpm lint` passes (or only pre-existing warnings)
3. Prop chain is complete: page.tsx -> ChatWithErrorBoundary -> Chat -> Messages -> PreviewMessage -> MessageActions (chatTitle)
4. Prop chain is complete: Messages -> MessageFullscreen (chatTitle)
5. Individual message PDF has conversation title line above executive name
6. All PDF filenames follow pattern: `{Topic}-{Executive}-{Timestamp}.pdf`
7. Conversation PDF uses actual chat topic from DB
</verification>

<success_criteria>
- All 3 PDF export paths produce filenames containing the conversation topic and a precise timestamp
- Individual message PDFs display the conversation topic as a title in the PDF header
- Suggestion JSON never appears in any PDF export, regardless of format variation
- Build and lint pass cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/4-fix-pdf-export-proper-filenames-with-con/4-SUMMARY.md`
</output>
