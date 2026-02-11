/**
 * Markdown parser for PDF rendering.
 * Converts markdown text into structured block arrays that the PDF renderer can consume.
 * Handles the subset of markdown that AI actually produces: headers, bold, italic,
 * lists, tables, code blocks, blockquotes, and horizontal rules.
 */

// --- Block types ---

export type PDFBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; segments: InlineSegment[] }
  | { type: "list"; ordered: boolean; items: ListItem[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "codeblock"; language: string; code: string }
  | { type: "blockquote"; text: string }
  | { type: "hr" };

export type ListItem = {
  text: string;
  segments: InlineSegment[];
};

export type InlineSegment =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "bolditalic"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; text: string; url: string }
  | { type: "strikethrough"; text: string };

// --- Main parser ---

export function parseMarkdown(text: string): PDFBlock[] {
  const lines = text.split("\n");
  const blocks: PDFBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Code fences (```)
    if (line.trim().startsWith("```")) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      // Skip closing fence
      if (i < lines.length) i++;
      blocks.push({
        type: "codeblock",
        language,
        code: codeLines.join("\n"),
      });
      continue;
    }

    // Horizontal rules (--- or *** or ___ with 3+ chars, standalone line)
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Headings (# ## ###)
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({ type: "heading", level, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    // Tables (detect header row + separator row)
    if (line.includes("|") && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (
        nextLine &&
        /^\|?[\s\-:|]+\|[\s\-:|]*$/.test(nextLine) &&
        nextLine.includes("-")
      ) {
        const headers = parseTableRow(line);
        // Skip separator line
        i += 2;
        const rows: string[][] = [];
        while (i < lines.length && lines[i].includes("|")) {
          const row = parseTableRow(lines[i]);
          if (row.length > 0) {
            rows.push(row);
          }
          i++;
        }
        blocks.push({ type: "table", headers, rows });
        continue;
      }
    }

    // Blockquotes (> text)
    if (line.trimStart().startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("> ")) {
        quoteLines.push(lines[i].trimStart().slice(2));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    // Unordered list items (- item or * item, but not ---)
    if (/^\s*[-*]\s+/.test(line) && !/^[-*]{3,}/.test(line.trim())) {
      const items: ListItem[] = [];
      while (
        i < lines.length &&
        /^\s*[-*]\s+/.test(lines[i]) &&
        !/^[-*]{3,}/.test(lines[i].trim())
      ) {
        const itemText = lines[i].replace(/^\s*[-*]\s+/, "");
        items.push({ text: itemText, segments: parseInline(itemText) });
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    // Ordered list items (1. item)
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: ListItem[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*\d+\.\s+/, "");
        items.push({ text: itemText, segments: parseInline(itemText) });
        i++;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    // Paragraph (everything else) -- collect consecutive non-empty lines
    // that don't match other block types
    const paraLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (l.trim() === "") break;
      if (l.trim().startsWith("```")) break;
      if (/^#{1,3}\s+/.test(l)) break;
      if (/^[-*_]{3,}\s*$/.test(l.trim())) break;
      if (l.trimStart().startsWith("> ")) break;
      if (/^\s*[-*]\s+/.test(l) && !/^[-*]{3,}/.test(l.trim())) break;
      if (/^\s*\d+\.\s+/.test(l)) break;
      // Check if this starts a table
      if (
        l.includes("|") &&
        i + 1 < lines.length &&
        lines[i + 1] &&
        /^\|?[\s\-:|]+\|[\s\-:|]*$/.test(lines[i + 1]) &&
        lines[i + 1].includes("-")
      ) {
        break;
      }
      paraLines.push(l);
      i++;
    }

    if (paraLines.length > 0) {
      const fullText = paraLines.join(" ");
      blocks.push({ type: "paragraph", segments: parseInline(fullText) });
    }
  }

  return blocks;
}

// --- Inline parser ---

export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // Regex to match inline formatting in order of specificity:
  // 1. Bold+italic (***text*** or ___text___)
  // 2. Bold (**text** or __text__)
  // 3. Italic (*text* or _text_ but not inside words for _)
  // 4. Strikethrough (~~text~~)
  // 5. Inline code (`code`)
  // 6. Links [text](url)
  const pattern =
    /(\*\*\*(.+?)\*\*\*|___(.+?)___|\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|(?<![a-zA-Z0-9])_(.+?)_(?![a-zA-Z0-9])|~~(.+?)~~|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }

    if (match[2] != null || match[3] != null) {
      // Bold+italic
      segments.push({
        type: "bolditalic",
        text: (match[2] ?? match[3]) as string,
      });
    } else if (match[4] != null || match[5] != null) {
      // Bold
      segments.push({ type: "bold", text: (match[4] ?? match[5]) as string });
    } else if (match[6] != null || match[7] != null) {
      // Italic
      segments.push({
        type: "italic",
        text: (match[6] ?? match[7]) as string,
      });
    } else if (match[8] != null) {
      // Strikethrough
      segments.push({ type: "strikethrough", text: match[8] });
    } else if (match[9] != null) {
      // Inline code
      segments.push({ type: "code", text: match[9] });
    } else if (match[10] != null && match[11] != null) {
      // Link
      segments.push({ type: "link", text: match[10], url: match[11] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    segments.push({ type: "text", text: text.slice(lastIndex) });
  }

  // If nothing was parsed, return a single text segment
  if (segments.length === 0) {
    segments.push({ type: "text", text });
  }

  return segments;
}

// --- Helpers ---

function parseTableRow(row: string): string[] {
  return row
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}
