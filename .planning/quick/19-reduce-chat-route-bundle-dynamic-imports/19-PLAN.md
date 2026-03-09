# Plan: 19 — Reduce chat route bundle via dynamic imports

**Mode:** quick
**Created:** 2026-03-09

## Analysis

Bundle analyzer shows these monsters loading on chat routes:

| Module | Parsed Size | Imported By |
|--------|------------|-------------|
| exceljs | 910KB | (ghost — not directly used in chat, but bundled) |
| @shikijs/langs (many) | 760KB+ total | react-syntax-highlighter chain |
| @shikijs/engine-oniguruma | 607KB | react-syntax-highlighter chain |
| cytoscape | 419KB | (likely strategy canvas) |
| jsPDF | 322KB | conversation-export (already lazy) |
| katex | 259KB | (math rendering) |
| html2canvas | 192KB | (already lazy in swot-board) |
| codemirror | 183KB | artifacts/code/client → code-editor |
| prosemirror | 93KB+ | artifacts/text/client → text-editor |
| highlight.js | 110KB | react-syntax-highlighter |

The Artifact component is already `dynamic()` in chat.tsx — good. But it statically imports all 4 artifact type clients (code, text, sheet, image), which pull in CodeMirror, ProseMirror, papaparse, and SyntaxHighlighter at chunk-split time.

Key insight: `Messages` and `MultimodalInput` are still static imports in chat.tsx. Messages → message.tsx statically imports search-results, weather, document, document-preview, etc.

## Task 1: Dynamic import Messages and MultimodalInput in chat.tsx

**What:** Convert `Messages` and `MultimodalInput` from static to dynamic imports
**Files:** `components/chat.tsx`
**Done when:** Both use `next/dynamic` with ssr: false

## Task 2: Dynamic import heavy sub-components in message.tsx

**What:** Convert `DocumentToolResult`, `DocumentPreview`, `MessageEditor`, `MessageReasoning`, `WebSearchResults`, `DeepResearchResults`, `Weather` from static to dynamic imports
**Files:** `components/message.tsx`
**Done when:** Only light components remain static

## Task 3: Lazy-load artifact type registrations in artifact.tsx

**What:** The 4 artifact clients (code, text, sheet, image) are imported statically in artifact.tsx. Convert to dynamic imports so CodeMirror/ProseMirror/papaparse only load when artifact panel opens.
**Files:** `components/artifact.tsx`
**Done when:** Artifact clients load on-demand, not at page load

## Verification

- `pnpm build` passes
- `/new` and `/chat/[id]` First Load JS < 800KB (from 1.06MB)
- No visible loading regressions on chat page
