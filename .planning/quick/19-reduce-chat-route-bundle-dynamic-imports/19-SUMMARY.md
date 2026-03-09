---
phase: quick
plan: 19
subsystem: performance
tags: [bundle-optimization, dynamic-imports, next-dynamic, code-splitting]
dependency_graph:
  requires: []
  provides: [chat-bundle-reduction]
  affects: [chat.tsx, message.tsx, artifact.tsx, data-stream-handler]
tech_stack:
  added: []
  patterns: [next/dynamic ssr:false, client component wrapper for server pages]
key_files:
  created:
    - components/data-stream-handler-wrapper.tsx
  modified:
    - components/chat.tsx
    - components/message.tsx
    - app/(chat)/new/page.tsx
    - app/(chat)/chat/[id]/page.tsx
decisions:
  - DataStreamHandlerWrapper pattern chosen over refactoring artifactDefinitions (less invasive, same effect)
  - Messages gets spinner loading state (content area needs visual feedback)
  - MultimodalInput gets null loading state (below-fold input, instant load)
  - Heavy message sub-components all get null loading (conditional renders, not visible on load)
metrics:
  duration: "3 minutes"
  completed: "2026-03-10"
  tasks_completed: 3
  tasks_total: 3
---

# Quick Task 19: Reduce Chat Route Bundle via Dynamic Imports Summary

**One-liner:** Dynamic imports across chat.tsx, message.tsx, and artifact chain reduced /new and /chat/[id] First Load JS from 1.06MB to 429KB (59% reduction).

## Bundle Before / After

| Route | Before | After | Reduction |
|-------|--------|-------|-----------|
| `/new` | 1.06 MB | 429 kB | -631 KB (-59%) |
| `/chat/[id]` | 1.06 MB | 429 kB | -631 KB (-59%) |

**Target was <800KB. Achieved 429KB.**

## Tasks Completed

### Task 1 — Dynamic import Messages and MultimodalInput in chat.tsx

**Commit:** `0f3cf8d`

Converted both static imports to `next/dynamic` with `ssr: false`:
- `Messages` — gets a centered spinner loading state (main content area needs visual feedback)
- `MultimodalInput` — gets `loading: () => null` (input area loads fast enough)

These two components transitively pull in most of the chat UI tree.

### Task 2 — Dynamic import heavy sub-components in message.tsx

**Commit:** `2a88c44`

Converted 7 heavy components to `next/dynamic (ssr: false, loading: null)`:
- `DocumentToolResult` — document tool output
- `DocumentPreview` — document preview panel
- `MessageEditor` — only used in edit mode (rare)
- `MessageReasoning` — only for reasoning model responses
- `WebSearchResults` — tool output only
- `DeepResearchResults` — tool output only
- `Weather` — tool output only

Kept static (lightweight UI, rendered on every message): `EnhancedChatMessage`, `MessageActions`, `MessageSuggestions`, `PreviewAttachment`, all elements/*.

### Task 3 — Lazy-load artifact type registrations

**Commit:** `2c7fa99`

**Root cause discovered:** The main bundle bloat came from a static import chain:
```
page.tsx → DataStreamHandler → artifactDefinitions → codeArtifact/textArtifact/sheetArtifact/imageArtifact → CodeMirror/ProseMirror/papaparse
```

Even though `Artifact` component itself was already dynamically imported in `chat.tsx`, `DataStreamHandler` was imported statically from both page files, pulling the entire artifact client tree into the first-load bundle.

**Solution:** Created `components/data-stream-handler-wrapper.tsx` — a client component that wraps `DataStreamHandler` with `next/dynamic (ssr: false)`. Both `/new` and `/chat/[id]` pages now import the wrapper instead.

This is safe: `DataStreamHandler` returns `null` (no UI) and only activates during active AI streaming — never at page mount.

## Deviations from Plan

### Deviation: Task 3 approach changed

**Plan said:** Check if CodeMirror/ProseMirror are already isolated to the Artifact chunk. If yes, skip.

**Found:** They were NOT isolated. `DataStreamHandler` (statically imported from pages) was the culprit — not `artifact.tsx` itself. The artifact clients were pulled into the main bundle via the data-stream-handler import chain, bypassing the `dynamic()` wrapper on `Artifact`.

**Fix applied:** Rule 1 (auto-fix) — created `DataStreamHandlerWrapper` instead of modifying `artifact.tsx` internals. This is the minimal-risk fix that breaks the chain without restructuring `artifactDefinitions` (which is used synchronously by artifact.tsx, toolbar.tsx, artifact-actions.tsx).

## Self-Check: PASSED

- FOUND: components/data-stream-handler-wrapper.tsx
- FOUND: 19-SUMMARY.md
- FOUND commit 0f3cf8d: feat(quick-19): dynamic import Messages and MultimodalInput
- FOUND commit 2a88c44: feat(quick-19): dynamic import heavy sub-components in message.tsx
- FOUND commit 2c7fa99: feat(quick-19): lazy-load artifact type registrations via DataStreamHandlerWrapper
- Build passed: pnpm build exits 0, /new and /chat/[id] at 429kB (target was <800KB)
