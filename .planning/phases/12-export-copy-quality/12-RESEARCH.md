# Phase 12: Export & Copy Quality - Research

**Researched:** 2026-02-11
**Domain:** Client-side PDF generation, clipboard API, markdown-to-text conversion
**Confidence:** HIGH

## Summary

Phase 12 addresses four concrete problems in the current export/copy system: (1) PDF exports contain HTML tags in the output, (2) users can only export individual messages not entire chat threads, (3) exported PDFs are excessively large because they use screenshot-based rendering (html2canvas produces PNG images embedded in PDFs), and (4) copying chat text puts raw markdown/HTML into the clipboard instead of clean text.

The root cause of problems 1 and 3 is the same: the current `lib/pdf-export.ts` uses `html2canvas` to screenshot the DOM to a canvas, then embeds that canvas as a PNG image inside the PDF via `jsPDF.addImage()`. This approach produces rasterized (non-searchable, non-selectable) PDFs that are 10-50x larger than text-based PDFs. A single-message PDF that should be 20KB ends up being 2-12MB. The fix is to replace the screenshot approach with jsPDF's native text rendering API (`doc.text()`, `doc.setFont()`, `doc.splitTextToSize()`), which produces vector text PDFs that are searchable, selectable, and dramatically smaller. The conversation thread export in `lib/conversation-export.ts` has the same html2canvas-based approach and needs the same fix.

For the copy/paste issue (problem 4), the current `handleCopy` in `components/message-actions.tsx` copies the raw `part.text` directly (which is markdown with `**bold**`, `# headers`, etc.). The fix is to strip markdown formatting before putting text on the clipboard, producing clean readable text. Additionally, native text selection in the chat window picks up HTML artifacts from the Streamdown renderer. CSS `user-select` and a custom copy event handler can address this.

**Primary recommendation:** Replace html2canvas+addImage PDF generation with jsPDF native text API for both single-message and thread exports. Write a markdown-to-jsPDF renderer that handles headers, bold, italic, lists, tables, code blocks, and blockquotes using jsPDF's `setFont`, `setFontSize`, `setTextColor`, and `splitTextToSize`. Add jspdf-autotable for table rendering. For copy, strip markdown before clipboard write.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jspdf | 4.1.0 (installed) | PDF document generation | Already in project, 2.6M weekly npm downloads, native text API produces small searchable PDFs |
| jspdf-autotable | 5.0.7 | PDF table rendering plugin | De facto standard for jsPDF tables, handles column widths, page breaks, styling automatically |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dompurify | 3.3.1 (installed) | HTML sanitization | Already used in conversation-export.ts, keep for any HTML processing |

### Remove After Migration
| Library | Action | Reason |
|---------|--------|--------|
| html2canvas | Remove from PDF export paths | Root cause of large file sizes and rendering artifacts. Keep only if used by strategy canvas (swot-board.tsx screenshot export) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom markdown-to-jsPDF | jspdf-md-renderer (npm) | Small package, low adoption (no significant npm downloads), custom solution gives more control for this specific use case |
| Custom markdown-to-jsPDF | @react-pdf/renderer | React-native PDF components, but requires rewriting rendering logic in JSX-PDF components; overkill when jsPDF is already installed |
| Custom markdown-to-jsPDF | pdfmake | JSON-declarative PDFs, great for complex layouts; but would require replacing jsPDF entirely (unnecessary migration) |

**Installation:**
```bash
pnpm add jspdf-autotable
```

Note: `jspdf` 4.1.0 is already installed. `jspdf-autotable` 5.0.7 is compatible with jsPDF 4.x.

## Architecture Patterns

### Current Architecture (to be replaced)

```
Message text (markdown)
    |
    v
markdownToHtml() -- converts markdown to inline-styled HTML
    |
    v
DOMPurify.sanitize() -- sanitize HTML
    |
    v
Inject into hidden DOM div (offscreen at -9999px)
    |
    v
html2canvas() -- screenshot div to <canvas>
    |
    v
canvas.toDataURL('image/png') -- convert to PNG data URI
    |
    v
jsPDF.addImage() -- embed PNG in PDF
    |
    v
RESULT: Large rasterized PDF (image-based, not text)
```

### New Architecture

```
Message text (markdown)
    |
    v
parseMarkdownForPDF() -- parse markdown into structured blocks
    |
    v
renderBlocksToPDF(doc, blocks) -- render each block using jsPDF native API
    |
    v
  Headers  --> doc.setFontSize(20), doc.setFont('helvetica', 'bold'), doc.text()
  Body     --> doc.setFontSize(11), doc.setFont('helvetica', 'normal'), doc.splitTextToSize(), doc.text()
  Bold     --> doc.setFont('helvetica', 'bold')
  Italic   --> doc.setFont('helvetica', 'italic')
  Tables   --> doc.autoTable({ head, body, startY })
  Code     --> doc.setFont('courier', 'normal'), gray background rect
  Lists    --> bullet prefix + indented text
    |
    v
RESULT: Small vector-text PDF (searchable, selectable, ~10-50KB)
```

### Recommended File Structure
```
lib/
├── pdf-export.ts              # REWRITE: Single message export using native text API
├── conversation-export.ts     # REWRITE: Thread export using native text API
├── pdf/                       # NEW: PDF rendering utilities
│   ├── markdown-parser.ts     # Parse markdown string into block array
│   ├── pdf-renderer.ts        # Render blocks to jsPDF doc (core rendering engine)
│   ├── pdf-styles.ts          # Font sizes, colors, margins, spacing constants
│   └── pdf-thread-renderer.ts # Thread-specific rendering (header, message loop, footer)
├── clipboard-utils.ts         # NEW: Strip markdown for clean clipboard text
```

### Pattern 1: Markdown Block Parser
**What:** Parse markdown text into an array of typed blocks (heading, paragraph, list, table, codeblock, blockquote, hr)
**When to use:** Before PDF rendering, to separate the "what" from the "how"
**Example:**
```typescript
// lib/pdf/markdown-parser.ts
type PDFBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; segments: InlineSegment[] }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'codeblock'; language: string; code: string }
  | { type: 'blockquote'; text: string }
  | { type: 'hr' };

type InlineSegment =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'bolditalic'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; url: string }
  | { type: 'strikethrough'; text: string };

export function parseMarkdown(text: string): PDFBlock[] {
  // Split into lines, identify block types, parse inline formatting
  // Return structured array for renderer
}
```

### Pattern 2: PDF Renderer with Page Break Management
**What:** Render parsed blocks to jsPDF doc with automatic page breaks
**When to use:** Core rendering loop for all PDF exports
**Example:**
```typescript
// lib/pdf/pdf-renderer.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { STYLES } from './pdf-styles';

export function renderBlocksToPDF(doc: jsPDF, blocks: PDFBlock[], startY: number): number {
  let y = startY;

  for (const block of blocks) {
    // Check if we need a page break
    const estimatedHeight = estimateBlockHeight(doc, block);
    if (y + estimatedHeight > STYLES.pageHeight - STYLES.marginBottom) {
      doc.addPage();
      y = STYLES.marginTop;
    }

    switch (block.type) {
      case 'heading':
        y = renderHeading(doc, block, y);
        break;
      case 'paragraph':
        y = renderParagraph(doc, block, y);
        break;
      case 'table':
        doc.autoTable({
          head: [block.headers],
          body: block.rows,
          startY: y,
          margin: { left: STYLES.marginLeft },
          styles: { fontSize: 10, font: 'helvetica' },
        });
        y = (doc as any).lastAutoTable.finalY + STYLES.blockSpacing;
        break;
      // ... other block types
    }
  }

  return y; // Return final Y position
}
```

### Pattern 3: Clean Clipboard Copy
**What:** Strip markdown formatting from text before clipboard write
**When to use:** All copy-to-clipboard actions in message-actions.tsx and message-fullscreen.tsx
**Example:**
```typescript
// lib/clipboard-utils.ts
export function stripMarkdownForClipboard(text: string): string {
  let result = text;

  // Remove code fences but keep content
  result = result.replace(/```[\w]*\n([\s\S]*?)```/g, '$1');

  // Remove inline code backticks
  result = result.replace(/`([^`]+)`/g, '$1');

  // Remove bold/italic markers
  result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');  // bold+italic
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1');        // bold
  result = result.replace(/\*([^*\n]+)\*/g, '$1');           // italic
  result = result.replace(/__([^_]+)__/g, '$1');             // bold
  result = result.replace(/(?<![a-zA-Z0-9])_([^_\n]+)_(?![a-zA-Z0-9])/g, '$1');  // italic

  // Remove strikethrough
  result = result.replace(/~~([^~]+)~~/g, '$1');

  // Convert links to "text (url)" format
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');

  // Remove heading markers
  result = result.replace(/^#{1,6}\s+/gm, '');

  // Remove blockquote markers
  result = result.replace(/^>\s+/gm, '');

  // Remove horizontal rules
  result = result.replace(/^[-*]{3,}$/gm, '---');

  // Clean up extra whitespace
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}
```

### Anti-Patterns to Avoid
- **Using html2canvas for text content:** Produces rasterized images instead of text. PDFs are 10-50x larger, not searchable, and not accessible. The ONLY valid use case for html2canvas in this codebase is the strategy canvas screenshot export (SWOT board), which is inherently visual.
- **Mixing html2canvas and native text approaches:** Don't try to render "some parts" as images and "some parts" as text. Go fully native text for the PDF export paths.
- **Embedding custom fonts in jsPDF:** jsPDF's built-in fonts (Helvetica, Times, Courier) cover all needs. Custom font embedding increases bundle size and adds complexity. Use Helvetica for body text, Courier for code blocks.
- **Building a full markdown-to-HTML-to-PDF pipeline:** The existing `markdownToHtml()` function was needed for the html2canvas approach. The new approach should go markdown -> structured blocks -> jsPDF native calls. Don't parse markdown to HTML then try to parse HTML.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF table rendering | Custom table positioning with doc.text() and doc.line() | jspdf-autotable | Column width calculation, cell wrapping, page break handling, styling are deceptively complex; autotable handles all edge cases |
| PDF page break detection | Simple Y-position check | Careful height estimation per block type | Block height depends on text wrapping, which depends on font size and available width; must estimate before rendering, not after |
| Markdown parsing | Full custom regex parser | Line-by-line block parser with inline segment parser | Don't try to handle every edge case of markdown; handle the subset AI actually produces (headers, bold, italic, lists, tables, code, blockquotes) |
| HTML stripping for clipboard | Regex on HTML strings | Use element.innerText or strip markdown at source | The message text in `part.text` is markdown, not HTML. Strip markdown formatting, don't try to strip HTML |

**Key insight:** The existing `markdownToHtml()` in `conversation-export.ts` (270+ lines) demonstrates how complex markdown-to-HTML conversion gets. The new markdown-to-jsPDF approach should be simpler because jsPDF's text API is more constrained -- no need to handle arbitrary HTML styling.

## Common Pitfalls

### Pitfall 1: Y-Position Drift Causing Text Overlap
**What goes wrong:** Text renders on top of other text because the Y-position tracker gets out of sync with actual rendered content height.
**Why it happens:** `doc.splitTextToSize()` returns N lines, but the actual rendered height depends on font size, line height multiplier, and spacing between paragraphs. If you calculate `y += lines.length * fontSize` but forget the line height factor (typically 1.15-1.5x), content overlaps.
**How to avoid:** Define a `lineHeight` constant (e.g., `fontSize * 1.4`) and use it consistently. After every text block, add `blockSpacing` (e.g., 8mm). Test with long multi-page conversations.
**Warning signs:** Text overlapping in generated PDFs, especially on page 2+.

### Pitfall 2: splitTextToSize Returns Wrong Widths for Bold Text
**What goes wrong:** Text wrapping is calculated with one font but rendered with another (e.g., calculated with normal weight but rendered bold, which is wider).
**Why it happens:** `doc.splitTextToSize()` uses the currently set font to calculate text widths. If you call it before calling `doc.setFont('helvetica', 'bold')`, the line breaks are wrong.
**How to avoid:** Always set the font BEFORE calling `splitTextToSize()`. The font must match what will be used for rendering.
**Warning signs:** Bold text overflowing the page margin, or wrapping at unexpected points.

### Pitfall 3: Page Break Mid-Heading
**What goes wrong:** A heading renders at the bottom of a page with its body text on the next page.
**Why it happens:** The page break check only verifies there's room for the heading text itself, not for the heading plus at least a few lines of body text.
**How to avoid:** When estimating heading height for page break purposes, add a minimum "keep-with-next" padding (e.g., 40mm) to ensure some body text follows the heading on the same page.
**Warning signs:** Orphaned headings at page bottoms.

### Pitfall 4: Table Exceeds Page Width
**What goes wrong:** AI-generated markdown tables can have many columns or wide content, causing text to overflow the PDF page boundaries.
**Why it happens:** jspdf-autotable auto-sizes columns, but if the total content width exceeds the page, it overflows.
**How to avoid:** Set `tableWidth: 'auto'` or `tableWidth: 'wrap'` in autotable options. Set `styles: { overflow: 'linebreak' }` to wrap long cell content. Set max column width percentages.
**Warning signs:** Truncated table content or text running off the right edge.

### Pitfall 5: Clipboard Copy Gets Markdown Source Instead of Clean Text
**What goes wrong:** Users copy message text and paste `**bold text** with [links](url)` into emails or documents.
**Why it happens:** The current `handleCopy` in `message-actions.tsx` copies `textFromParts` directly, which is the raw markdown source from `part.text`.
**How to avoid:** Run the text through `stripMarkdownForClipboard()` before calling `copyToClipboard()`. This removes `**`, `#`, `` ` ``, `[](url)`, etc.
**Warning signs:** Pasted text contains asterisks, hash marks, or bracket-URL patterns.

### Pitfall 6: Native Text Selection Copies HTML Artifacts
**What goes wrong:** When users manually select text in the chat (drag to highlight), the clipboard gets HTML artifacts from Streamdown's rendered DOM (span tags, class names, etc.).
**Why it happens:** Streamdown renders markdown to rich HTML elements. Browser's native selection includes the DOM structure.
**How to avoid:** Add a `copy` event listener on the message container that intercepts the native copy and writes cleaned text to the clipboard. Or, ensure the Streamdown rendering produces clean DOM that copies well (this is largely handled by browsers for standard HTML elements like `<strong>`, `<em>`, `<p>`).
**Warning signs:** Pasted text includes CSS class names, HTML tag fragments, or Streamdown component internals.

## Code Examples

Verified patterns from official sources:

### Single Message PDF Export (Native Text)
```typescript
// lib/pdf-export.ts (rewritten)
import jsPDF from 'jspdf';
import { parseMarkdown } from './pdf/markdown-parser';
import { renderBlocksToPDF } from './pdf/pdf-renderer';
import { STYLES } from './pdf/pdf-styles';

export async function exportToPDF(
  text: string,
  filename: string,
  executiveName: string,
  executiveRole: string,
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = STYLES.marginTop;

  // Header: Executive name and role
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(26, 26, 26);
  doc.text(executiveName, STYLES.marginLeft, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(executiveRole, STYLES.marginLeft, y);
  y += 5;

  // Divider line
  doc.setDrawColor(229, 229, 229);
  doc.line(STYLES.marginLeft, y, STYLES.pageWidth - STYLES.marginRight, y);
  y += 10;

  // Parse and render content
  const blocks = parseMarkdown(text);
  y = renderBlocksToPDF(doc, blocks, y);

  // Footer
  y += 10;
  doc.setDrawColor(229, 229, 229);
  doc.line(STYLES.marginLeft, y, STYLES.pageWidth - STYLES.marginRight, y);
  y += 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(153, 153, 153);
  doc.text(
    `Generated by AI Bossy Brainz on ${new Date().toLocaleDateString()}`,
    STYLES.marginLeft,
    y,
  );

  doc.save(`${filename}.pdf`);
}
```

### PDF Style Constants
```typescript
// lib/pdf/pdf-styles.ts
export const STYLES = {
  // Page dimensions (A4 in mm)
  pageWidth: 210,
  pageHeight: 297,

  // Margins
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 15,
  marginRight: 15,

  // Content width
  get contentWidth() { return this.pageWidth - this.marginLeft - this.marginRight; },

  // Font sizes
  h1Size: 18,
  h2Size: 15,
  h3Size: 13,
  bodySize: 11,
  codeSize: 10,
  footerSize: 9,

  // Line height multipliers
  lineHeight: 1.4,

  // Spacing (mm)
  blockSpacing: 6,
  listIndent: 8,
  codeBlockPadding: 4,
  quoteIndent: 10,

  // Colors (RGB tuples)
  textColor: [26, 26, 26] as const,
  headingColor: [26, 26, 26] as const,
  mutedColor: [100, 100, 100] as const,
  codeBackground: [245, 245, 245] as const,
  quoteBarColor: [209, 213, 219] as const,
  linkColor: [37, 99, 235] as const,
  dividerColor: [229, 229, 229] as const,
} as const;
```

### Thread Export with Message Loop
```typescript
// lib/conversation-export.ts (rewritten, key part)
export async function exportConversationToPDF(
  messages: ChatMessage[],
  chatTitle: string,
  botType: BotType,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable'); // Side-effect: adds autoTable to jsPDF

  const doc = new jsPDF('p', 'mm', 'a4');
  const personality = BOT_PERSONALITIES[botType];
  let y = STYLES.marginTop;

  // Title page header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(chatTitle, STYLES.marginLeft, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...STYLES.mutedColor);
  doc.text(
    `Conversation with ${personality.name} | ${new Date().toLocaleDateString()}`,
    STYLES.marginLeft,
    y,
  );
  y += 12;

  // Render each message
  for (const message of messages) {
    const text = message.parts
      ?.filter(p => p.type === 'text')
      .map(p => p.text)
      .join('\n')
      .trim();
    if (!text) continue;

    const isUser = message.role === 'user';
    const msgBotType = (message.metadata?.botType as BotType) || botType;
    const msgPersonality = BOT_PERSONALITIES[msgBotType];

    // Check page break for speaker header + some content
    if (y + 30 > STYLES.pageHeight - STYLES.marginBottom) {
      doc.addPage();
      y = STYLES.marginTop;
    }

    // Speaker name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(isUser ? 51 : 185, isUser ? 51 : 28, isUser ? 51 : 28);
    doc.text(isUser ? 'You' : msgPersonality.name, STYLES.marginLeft, y);
    y += 6;

    // Message content
    doc.setTextColor(...STYLES.textColor);
    const blocks = parseMarkdown(text);
    y = renderBlocksToPDF(doc, blocks, y);
    y += STYLES.blockSpacing * 2; // Extra spacing between messages
  }

  // Footer on last page
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...STYLES.mutedColor);
  doc.text(
    `Generated by AI Bossy Brainz | ${new Date().toLocaleDateString()}`,
    STYLES.marginLeft,
    STYLES.pageHeight - 15,
  );

  const filename = `${personality.name.split(' ')[0]}-conversation-${new Date().toISOString().split('T')[0]}`;
  doc.save(`${filename}.pdf`);
}
```

### Copy Handler with Markdown Stripping
```typescript
// In message-actions.tsx handleCopy
import { stripMarkdownForClipboard } from '@/lib/clipboard-utils';

const handleCopy = async () => {
  if (!textFromParts) {
    toast.error("There's no text to copy!");
    return;
  }

  const cleanText = stripMarkdownForClipboard(textFromParts);
  await copyToClipboard(cleanText);
  setIsCopied(true);
  toast.success("Copied to clipboard!");

  setTimeout(() => {
    setIsCopied(false);
  }, 2000);
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| html2canvas + addImage (screenshot PDF) | jsPDF native text API | 2023-2024 shift in best practices | 10-50x smaller files, searchable text, accessible PDFs |
| react-markdown for rendering | Streamdown (Vercel) | 2025 | Streaming-optimized markdown rendering, built on hardened-react-markdown |
| document.execCommand('copy') | navigator.clipboard.writeText() | 2020+ | Async, promise-based, standard across all modern browsers |

**Deprecated/outdated:**
- `html2canvas` for text PDF export: Still maintained but fundamentally wrong tool for text PDFs. It screenshots DOM to canvas (useful for visual/chart screenshots), not for document generation.
- `document.execCommand('copy')`: Deprecated. Use Clipboard API instead. Already using Clipboard API in this codebase via `useCopyToClipboard` from usehooks-ts.

## Open Questions

1. **Keep html2canvas in project?**
   - What we know: `components/strategy-canvas/swot-board.tsx` uses html2canvas for screenshotting the SWOT board (a visual canvas, not text). This is a legitimate use case.
   - What's unclear: Are there other visual export paths that need html2canvas?
   - Recommendation: Keep html2canvas as a dependency but remove it from all text/message export paths. Only the strategy canvas should use it.

2. **How complex is AI-generated markdown in practice?**
   - What we know: AI messages include headers, bold, italic, lists, tables, code blocks, blockquotes. The existing `markdownToHtml()` handles all of these.
   - What's unclear: Are there edge cases like nested lists, multi-paragraph list items, or deeply nested formatting?
   - Recommendation: Build the parser to handle the same subset as the existing `markdownToHtml()`. If edge cases appear in testing, handle them incrementally.

3. **Should "Copy" produce markdown or stripped text?**
   - What we know: EXPORT-04 says "Copy/paste from chat produces clean text without HTML markup." The current copy gives raw markdown.
   - What's unclear: Whether users want clean formatted text (no markdown syntax) or markdown-formatted text (useful for pasting into markdown editors).
   - Recommendation: Default to stripped plain text (clean). This matches the requirement. Power users who want markdown can select text manually.

## Sources

### Primary (HIGH confidence)
- **jsPDF official docs** - https://artskydj.github.io/jsPDF/docs/jsPDF.html - text API, font methods, splitTextToSize, addPage
- **jsPDF GitHub** - https://github.com/parallax/jsPDF - 30.4K stars, 2.6M weekly downloads, version 4.1.0
- **jspdf-autotable GitHub** - https://github.com/simonbengtsson/jsPDF-AutoTable - version 5.0.7, table rendering API, hooks
- **Streamdown GitHub** - https://github.com/vercel/streamdown - Vercel's markdown renderer used in this codebase
- **MDN Clipboard API** - https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write - write() and writeText() methods
- **Codebase analysis** - Direct reading of lib/pdf-export.ts, lib/conversation-export.ts, components/message-actions.tsx, components/message-fullscreen.tsx, components/chat.tsx, components/chat/chat-header.tsx

### Secondary (MEDIUM confidence)
- **PDF generation comparison** - https://dmitriiboikov.com/posts/2025/01/pdf-generation-comarison/ - Library comparison article
- **Nutrient PDF libraries guide** - https://www.nutrient.io/blog/javascript-pdf-libraries/ - Comprehensive overview
- **npm-compare** - https://npm-compare.com/@react-pdf/renderer,jspdf,pdfmake,react-pdf - Download/star comparisons

### Tertiary (LOW confidence)
- **jspdf-md-renderer** - https://github.com/JeelGajera/jspdf-md-renderer - Small project, low adoption, not recommended but exists as reference
- **@ezpaarse-project/jspdf-md** - https://www.npmjs.com/package/@ezpaarse-project/jspdf-md - No other projects using it, low confidence in maintenance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - jsPDF already installed and working, jspdf-autotable is the de facto table plugin with millions of weekly downloads
- Architecture: HIGH - The markdown-to-native-text approach is well-documented and the standard solution to the exact "html2canvas makes huge PDFs" problem
- Pitfalls: HIGH - These are well-known jsPDF issues documented across GitHub issues and community resources
- Copy/clipboard: HIGH - Clipboard API is mature and already used in the codebase

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable domain, no fast-moving dependencies)
