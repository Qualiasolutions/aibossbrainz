/**
 * Core PDF rendering engine.
 * Takes parsed markdown blocks and renders them to a jsPDF document
 * using native text API calls (not screenshots).
 * Handles page breaks, font switching, and consistent Y-position tracking.
 */
import type jsPDF from "jspdf";

import type { InlineSegment, ListItem, PDFBlock } from "./markdown-parser";
import { STYLES } from "./pdf-styles";

// Minimum remaining space (mm) after a heading before forcing a page break.
// Prevents orphaned headings at the bottom of a page.
const KEEP_WITH_NEXT = 30;

// Point-to-mm conversion factor (1pt ≈ 0.3528mm)
const PT_TO_MM = 0.3528;

/**
 * Render an array of PDFBlocks to a jsPDF document.
 * Returns the final Y position after all content is rendered.
 */
export function renderBlocksToPDF(
  doc: jsPDF,
  blocks: PDFBlock[],
  startY: number,
): number {
  let y = startY;

  for (const block of blocks) {
    const estimatedHeight = estimateBlockHeight(doc, block);

    // Page break check
    if (y + estimatedHeight > STYLES.pageHeight - STYLES.marginBottom) {
      doc.addPage();
      y = STYLES.marginTop;
    }

    switch (block.type) {
      case "heading":
        y = renderHeading(doc, block, y);
        break;
      case "paragraph":
        y = renderParagraph(doc, block.segments, y);
        break;
      case "list":
        y = renderList(doc, block, y);
        break;
      case "table":
        y = renderTable(doc, block, y);
        break;
      case "codeblock":
        y = renderCodeBlock(doc, block, y);
        break;
      case "blockquote":
        y = renderBlockquote(doc, block, y);
        break;
      case "hr":
        y = renderHorizontalRule(doc, y);
        break;
    }
  }

  return y;
}

// --- Block renderers ---

function renderHeading(
  doc: jsPDF,
  block: Extract<PDFBlock, { type: "heading" }>,
  y: number,
): number {
  const sizeMap = {
    1: STYLES.h1Size,
    2: STYLES.h2Size,
    3: STYLES.h3Size,
  };
  const fontSize = sizeMap[block.level];

  // Heading needs keep-with-next space
  const headingHeight =
    fontSize * PT_TO_MM * STYLES.lineHeight + KEEP_WITH_NEXT;
  if (y + headingHeight > STYLES.pageHeight - STYLES.marginBottom) {
    doc.addPage();
    y = STYLES.marginTop;
  }

  doc.setFont("helvetica", "normal", "bold");
  doc.setFontSize(fontSize);
  doc.setTextColor(...STYLES.headingColor);

  const lines = doc.splitTextToSize(block.text, STYLES.contentWidth);
  doc.text(lines, STYLES.marginLeft, y);

  const lineHeightMm = fontSize * PT_TO_MM * STYLES.lineHeight;
  y += lines.length * lineHeightMm + STYLES.blockSpacing;

  return y;
}

function renderParagraph(
  doc: jsPDF,
  segments: InlineSegment[],
  y: number,
): number {
  // For simple paragraphs with mixed inline formatting, we render
  // segment-by-segment on a line, handling wrapping manually.
  const fontSize = STYLES.bodySize;
  const lineHeightMm = fontSize * PT_TO_MM * STYLES.lineHeight;
  const maxWidth = STYLES.contentWidth;

  // Flatten segments into renderable chunks with their font settings
  const chunks = segmentsToChunks(segments);

  // Wrap chunks across lines
  const wrappedLines = wrapChunks(doc, chunks, maxWidth, fontSize);

  for (const line of wrappedLines) {
    // Page break check per line
    if (y + lineHeightMm > STYLES.pageHeight - STYLES.marginBottom) {
      doc.addPage();
      y = STYLES.marginTop;
    }

    let x = STYLES.marginLeft;
    for (const chunk of line) {
      applyChunkFont(doc, chunk, fontSize);
      doc.text(chunk.text, x, y);
      x += doc.getTextWidth(chunk.text);
    }
    y += lineHeightMm;
  }

  y += STYLES.blockSpacing;
  return y;
}

function renderList(
  doc: jsPDF,
  block: Extract<PDFBlock, { type: "list" }>,
  y: number,
): number {
  const fontSize = STYLES.bodySize;
  const lineHeightMm = fontSize * PT_TO_MM * STYLES.lineHeight;

  for (let idx = 0; idx < block.items.length; idx++) {
    const item = block.items[idx];
    const prefix = block.ordered ? `${idx + 1}. ` : "\u2022 ";

    // Page break check per item
    if (y + lineHeightMm > STYLES.pageHeight - STYLES.marginBottom) {
      doc.addPage();
      y = STYLES.marginTop;
    }

    // Render bullet/number prefix
    doc.setFont("helvetica", "normal", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(...STYLES.textColor);
    doc.text(prefix, STYLES.marginLeft, y);

    // Render item text with inline formatting
    const itemWidth = STYLES.contentWidth - STYLES.listIndent;
    const chunks = segmentsToChunks(item.segments);
    const wrappedLines = wrapChunks(doc, chunks, itemWidth, fontSize);

    for (let lineIdx = 0; lineIdx < wrappedLines.length; lineIdx++) {
      if (lineIdx > 0) {
        // Page break check for continuation lines
        if (y + lineHeightMm > STYLES.pageHeight - STYLES.marginBottom) {
          doc.addPage();
          y = STYLES.marginTop;
        }
      }

      let x = STYLES.marginLeft + STYLES.listIndent;
      for (const chunk of wrappedLines[lineIdx]) {
        applyChunkFont(doc, chunk, fontSize);
        doc.text(chunk.text, x, y);
        x += doc.getTextWidth(chunk.text);
      }

      if (lineIdx < wrappedLines.length - 1) {
        y += lineHeightMm;
      }
    }

    y += lineHeightMm;
  }

  y += STYLES.blockSpacing;
  return y;
}

function renderTable(
  doc: jsPDF,
  block: Extract<PDFBlock, { type: "table" }>,
  y: number,
): number {
  // Use jspdf-autotable for table rendering (v5 adds autoTable to prototype via side-effect import)
  const docWithPlugin = doc as jsPDF & Record<string, unknown>;
  if (typeof docWithPlugin.autoTable === "function") {
    (docWithPlugin.autoTable as (opts: Record<string, unknown>) => void)({
      head: [block.headers],
      body: block.rows,
      startY: y,
      margin: { left: STYLES.marginLeft, right: STYLES.marginRight },
      styles: {
        fontSize: 10,
        font: "helvetica",
        overflow: "linebreak",
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [243, 244, 246],
        textColor: [26, 26, 26],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
    });

    // Read the final Y position from autoTable
    const lastTable = docWithPlugin.lastAutoTable as
      | { finalY: number }
      | undefined;
    y = (lastTable?.finalY ?? y + 20) + STYLES.blockSpacing;
  } else {
    // Fallback: render as plain text if autoTable not loaded
    doc.setFont("helvetica", "normal", "bold");
    doc.setFontSize(STYLES.bodySize);
    doc.setTextColor(...STYLES.textColor);
    const headerText = block.headers.join(" | ");
    doc.text(headerText, STYLES.marginLeft, y);
    y += STYLES.bodySize * PT_TO_MM * STYLES.lineHeight;

    doc.setFont("helvetica", "normal", "normal");
    for (const row of block.rows) {
      const rowText = row.join(" | ");
      doc.text(rowText, STYLES.marginLeft, y);
      y += STYLES.bodySize * PT_TO_MM * STYLES.lineHeight;
    }
    y += STYLES.blockSpacing;
  }

  return y;
}

function renderCodeBlock(
  doc: jsPDF,
  block: Extract<PDFBlock, { type: "codeblock" }>,
  y: number,
): number {
  const fontSize = STYLES.codeSize;
  const lineHeightMm = fontSize * PT_TO_MM * STYLES.lineHeight;
  const padding = STYLES.codeBlockPadding;

  // Set courier font BEFORE splitTextToSize (pitfall #2)
  doc.setFont("courier", "normal", "normal");
  doc.setFontSize(fontSize);

  const codeLines = block.code.split("\n");
  const allWrapped: string[] = [];
  for (const codeLine of codeLines) {
    if (codeLine === "") {
      allWrapped.push("");
    } else {
      const wrapped = doc.splitTextToSize(
        codeLine,
        STYLES.contentWidth - padding * 2,
      );
      allWrapped.push(...wrapped);
    }
  }

  const blockHeight = allWrapped.length * lineHeightMm + padding * 2;

  // Page break check for entire code block (if it fits on a page)
  if (
    blockHeight <
    STYLES.pageHeight - STYLES.marginTop - STYLES.marginBottom
  ) {
    if (y + blockHeight > STYLES.pageHeight - STYLES.marginBottom) {
      doc.addPage();
      y = STYLES.marginTop;
    }
  }

  // Draw background rect
  doc.setFillColor(...STYLES.codeBackground);
  doc.roundedRect(
    STYLES.marginLeft,
    y - padding,
    STYLES.contentWidth,
    blockHeight,
    2,
    2,
    "F",
  );

  // Render code lines
  doc.setFont("courier", "normal", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...STYLES.textColor);

  let codeY = y + padding;
  for (const line of allWrapped) {
    // Page break within long code blocks
    if (codeY + lineHeightMm > STYLES.pageHeight - STYLES.marginBottom) {
      doc.addPage();
      codeY = STYLES.marginTop + padding;
      // Draw continuation background
      const remainingLines = allWrapped.length - allWrapped.indexOf(line);
      const remainHeight = remainingLines * lineHeightMm + padding * 2;
      doc.setFillColor(...STYLES.codeBackground);
      doc.roundedRect(
        STYLES.marginLeft,
        codeY - padding,
        STYLES.contentWidth,
        Math.min(
          remainHeight,
          STYLES.pageHeight - STYLES.marginTop - STYLES.marginBottom,
        ),
        2,
        2,
        "F",
      );
    }

    doc.text(line, STYLES.marginLeft + padding, codeY);
    codeY += lineHeightMm;
  }

  y = codeY + padding + STYLES.blockSpacing;
  return y;
}

function renderBlockquote(
  doc: jsPDF,
  block: Extract<PDFBlock, { type: "blockquote" }>,
  y: number,
): number {
  const fontSize = STYLES.bodySize;
  const lineHeightMm = fontSize * PT_TO_MM * STYLES.lineHeight;
  const quoteWidth = STYLES.contentWidth - STYLES.quoteIndent;

  doc.setFont("helvetica", "normal", "italic");
  doc.setFontSize(fontSize);
  doc.setTextColor(...STYLES.mutedColor);

  const lines = doc.splitTextToSize(block.text, quoteWidth);

  // Draw left bar
  const barX = STYLES.marginLeft + 2;
  const barStartY = y - 2;
  const barHeight = lines.length * lineHeightMm + 4;
  doc.setDrawColor(...STYLES.quoteBarColor);
  doc.setLineWidth(1);
  doc.line(barX, barStartY, barX, barStartY + barHeight);

  // Render text
  for (const line of lines) {
    if (y + lineHeightMm > STYLES.pageHeight - STYLES.marginBottom) {
      doc.addPage();
      y = STYLES.marginTop;
    }
    doc.text(line, STYLES.marginLeft + STYLES.quoteIndent, y);
    y += lineHeightMm;
  }

  y += STYLES.blockSpacing;
  // Reset text color
  doc.setTextColor(...STYLES.textColor);
  return y;
}

function renderHorizontalRule(doc: jsPDF, y: number): number {
  y += 3;
  doc.setDrawColor(...STYLES.dividerColor);
  doc.setLineWidth(0.5);
  doc.line(STYLES.marginLeft, y, STYLES.pageWidth - STYLES.marginRight, y);
  y += 3 + STYLES.blockSpacing;
  return y;
}

// --- Inline rendering helpers ---

type RenderChunk = {
  text: string;
  fontStyle: "normal" | "bold" | "italic" | "bolditalic";
  fontFamily: "helvetica" | "courier";
  color?: [number, number, number];
  underline?: boolean;
};

function segmentsToChunks(segments: InlineSegment[]): RenderChunk[] {
  const chunks: RenderChunk[] = [];

  for (const seg of segments) {
    switch (seg.type) {
      case "text":
        chunks.push({
          text: seg.text,
          fontStyle: "normal",
          fontFamily: "helvetica",
        });
        break;
      case "bold":
        chunks.push({
          text: seg.text,
          fontStyle: "bold",
          fontFamily: "helvetica",
        });
        break;
      case "italic":
        chunks.push({
          text: seg.text,
          fontStyle: "italic",
          fontFamily: "helvetica",
        });
        break;
      case "bolditalic":
        chunks.push({
          text: seg.text,
          fontStyle: "bolditalic",
          fontFamily: "helvetica",
        });
        break;
      case "code":
        chunks.push({
          text: seg.text,
          fontStyle: "normal",
          fontFamily: "courier",
        });
        break;
      case "link":
        chunks.push({
          text: seg.text,
          fontStyle: "normal",
          fontFamily: "helvetica",
          color: [...STYLES.linkColor],
          underline: true,
        });
        break;
      case "strikethrough":
        // jsPDF doesn't have native strikethrough, render as normal text
        chunks.push({
          text: seg.text,
          fontStyle: "normal",
          fontFamily: "helvetica",
          color: [...STYLES.mutedColor],
        });
        break;
    }
  }

  return chunks;
}

function applyChunkFont(
  doc: jsPDF,
  chunk: RenderChunk,
  fontSize: number,
): void {
  doc.setFont(chunk.fontFamily, "normal", chunk.fontStyle);
  doc.setFontSize(fontSize);
  doc.setTextColor(...(chunk.color ?? STYLES.textColor));
}

/**
 * Word-wrap chunks across multiple lines, respecting the max width.
 * Returns an array of lines, where each line is an array of RenderChunks.
 */
function wrapChunks(
  doc: jsPDF,
  chunks: RenderChunk[],
  maxWidth: number,
  fontSize: number,
): RenderChunk[][] {
  const lines: RenderChunk[][] = [[]];
  let currentLineWidth = 0;

  for (const chunk of chunks) {
    applyChunkFont(doc, chunk, fontSize);

    const words = chunk.text.split(/(\s+)/);

    for (const word of words) {
      if (word === "") continue;

      const wordWidth = doc.getTextWidth(word);

      if (
        currentLineWidth + wordWidth > maxWidth &&
        currentLineWidth > 0 &&
        word.trim() !== ""
      ) {
        // Start a new line
        lines.push([]);
        currentLineWidth = 0;
      }

      // Add word to current line
      const currentLine = lines[lines.length - 1];
      currentLine.push({
        ...chunk,
        text: word,
      });
      currentLineWidth += wordWidth;
    }
  }

  return lines;
}

// --- Height estimation ---

function estimateBlockHeight(doc: jsPDF, block: PDFBlock): number {
  switch (block.type) {
    case "heading": {
      const sizeMap = { 1: STYLES.h1Size, 2: STYLES.h2Size, 3: STYLES.h3Size };
      const fontSize = sizeMap[block.level];
      doc.setFont("helvetica", "normal", "bold");
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(block.text, STYLES.contentWidth);
      return (
        lines.length * fontSize * PT_TO_MM * STYLES.lineHeight +
        STYLES.blockSpacing +
        KEEP_WITH_NEXT
      );
    }
    case "paragraph": {
      // Rough estimate: treat all text as body size
      const fullText = block.segments.map((s) => s.text).join("");
      doc.setFont("helvetica", "normal", "normal");
      doc.setFontSize(STYLES.bodySize);
      const lines = doc.splitTextToSize(fullText, STYLES.contentWidth);
      return (
        lines.length * STYLES.bodySize * PT_TO_MM * STYLES.lineHeight +
        STYLES.blockSpacing
      );
    }
    case "list": {
      const lineHeightMm = STYLES.bodySize * PT_TO_MM * STYLES.lineHeight;
      return block.items.length * lineHeightMm + STYLES.blockSpacing;
    }
    case "table": {
      // Rough: header + rows * ~8mm each
      return (block.rows.length + 1) * 8 + STYLES.blockSpacing;
    }
    case "codeblock": {
      const codeLines = block.code.split("\n");
      const lineHeightMm = STYLES.codeSize * PT_TO_MM * STYLES.lineHeight;
      return (
        codeLines.length * lineHeightMm +
        STYLES.codeBlockPadding * 2 +
        STYLES.blockSpacing
      );
    }
    case "blockquote": {
      doc.setFont("helvetica", "normal", "italic");
      doc.setFontSize(STYLES.bodySize);
      const lines = doc.splitTextToSize(
        block.text,
        STYLES.contentWidth - STYLES.quoteIndent,
      );
      return (
        lines.length * STYLES.bodySize * PT_TO_MM * STYLES.lineHeight +
        STYLES.blockSpacing
      );
    }
    case "hr":
      return 6 + STYLES.blockSpacing;
    default:
      return 10;
  }
}
