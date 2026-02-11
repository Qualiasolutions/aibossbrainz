/**
 * Shared TTS text preprocessing utility.
 * All voice paths (manual play, auto-speak, realtime stream) use this
 * single function to clean text before sending to ElevenLabs TTS.
 */

// Types for collaborative voice segments
export interface SpeakerSegment {
  speaker: "alexandria" | "kim";
  text: string;
}

// Precompiled regex patterns for performance
const PATTERNS = {
  // Suggestions: code block format and raw JSON format
  suggestionsCodeBlock: /```suggestions\s*[\s\S]*?```/g,
  suggestionsRawJson:
    /\n*\[\s*\{[\s\S]*?"category"[\s\S]*?"text"[\s\S]*?\}\s*\]\s*$/,

  // Executive name prefixes (collaborative mode markers)
  executiveAlexandria: /\*\*Alexandria\s*(?:\(CMO\))?\s*:?\*\*\s*:?\s*/gi,
  executiveKim: /\*\*Kim\s*(?:\(CSO\))?\s*:?\*\*\s*:?\s*/gi,
  jointStrategy: /\*\*Joint\s+Strategy\s*:?\*\*\s*:?\s*/gi,
  standaloneAlexandria: /^Alexandria\s*(?:\(CMO\))?\s*:\s*/gim,
  standaloneKim: /^Kim\s*(?:\(CSO\))?\s*:\s*/gim,

  // Markdown formatting
  headers: /^#{1,6}\s+/gm,
  bold: /\*\*([^*]+)\*\*/g,
  italic: /\*([^*]+)\*/g,
  boldAlt: /__([^_]+)__/g,
  italicAlt: /_([^_]+)_/g,
  links: /\[([^\]]+)\]\([^)]+\)/g,
  images: /!\[([^\]]*)\]\([^)]+\)/g,
  codeBlocks: /```[\s\S]*?```/g,
  inlineCode: /`([^`]+)`/g,
  blockquotes: /^>\s+/gm,
  horizontalRules: /^---+$/gm,

  // Cleanup
  multipleNewlines: /\n{3,}/g,
};

const TABLE_VERBAL_CUE = "I've included a table in the text version.";

/**
 * Replace contiguous blocks of table rows with a single verbal cue.
 * A table block is one or more consecutive lines starting with |.
 */
function replaceTablesWithCue(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const isTableLine =
      line.trimStart().startsWith("|") || /^[-|:\s]+$/.test(line.trim());

    if (isTableLine) {
      if (!inTable) {
        inTable = true;
        result.push(TABLE_VERBAL_CUE);
      }
      // Skip the table row
    } else {
      inTable = false;
      result.push(line);
    }
  }

  return result.join("\n");
}

/**
 * Strip markdown and non-speech content from text for TTS playback.
 * Handles suggestions JSON, code blocks, tables, and all markdown formatting.
 */
export function stripMarkdownForTTS(text: string): string {
  let result = text
    // 1. Remove suggestions blocks (code block format and raw JSON)
    .replace(PATTERNS.suggestionsCodeBlock, "")
    .replace(PATTERNS.suggestionsRawJson, "")
    // 2. Remove executive name prefixes
    .replace(PATTERNS.executiveAlexandria, "")
    .replace(PATTERNS.executiveKim, "")
    .replace(PATTERNS.jointStrategy, "")
    .replace(PATTERNS.standaloneAlexandria, "")
    .replace(PATTERNS.standaloneKim, "")
    // 3. Remove headers
    .replace(PATTERNS.headers, "")
    // 4. Remove bold/italic (keep text)
    .replace(PATTERNS.bold, "$1")
    .replace(PATTERNS.italic, "$1")
    .replace(PATTERNS.boldAlt, "$1")
    .replace(PATTERNS.italicAlt, "$1")
    // 5. Remove links (keep text)
    .replace(PATTERNS.links, "$1")
    // 6. Remove images entirely
    .replace(PATTERNS.images, "")
    // 7. Remove code blocks entirely
    .replace(PATTERNS.codeBlocks, "")
    // 8. Remove inline code (keep text)
    .replace(PATTERNS.inlineCode, "$1")
    // 9. Remove blockquotes
    .replace(PATTERNS.blockquotes, "")
    // 10. Remove horizontal rules
    .replace(PATTERNS.horizontalRules, "");

  // 11. Replace table blocks with verbal cue
  result = replaceTablesWithCue(result);

  // 12-13. Clean up multiple newlines and trim
  return result.replace(PATTERNS.multipleNewlines, "\n\n").trim();
}

/**
 * Parse collaborative mode text into speaker segments.
 * Identifies sections by various formats of executive markers.
 * Joint Strategy sections alternate between voices for variety.
 */
export function parseCollaborativeSegments(text: string): SpeakerSegment[] {
  const segments: SpeakerSegment[] = [];

  const speakerPatterns = [
    /\*\*Alexandria\s*(?:\(CMO\))?\s*:?\*\*\s*:?/gi,
    /\*\*Kim\s*(?:\(CSO\))?\s*:?\*\*\s*:?/gi,
    /\*\*Joint\s+Strategy\s*:?\*\*\s*:?/gi,
    /(?:^|\n)Alexandria\s*(?:\(CMO\))?\s*:/gim,
    /(?:^|\n)Kim\s*(?:\(CSO\))?\s*:/gim,
  ];

  const markers: {
    index: number;
    speaker: "alexandria" | "kim" | "joint";
    length: number;
  }[] = [];

  for (const pattern of speakerPatterns) {
    pattern.lastIndex = 0;
    let match = pattern.exec(text);

    while (match !== null) {
      const markerText = match[0].toLowerCase();
      let speaker: "alexandria" | "kim" | "joint";

      if (markerText.includes("alexandria")) {
        speaker = "alexandria";
      } else if (markerText.includes("kim")) {
        speaker = "kim";
      } else {
        speaker = "joint";
      }

      const matchIndex = match.index;
      const existsAtPosition = markers.some(
        (m) => Math.abs(m.index - matchIndex) < 5,
      );
      if (!existsAtPosition) {
        markers.push({
          index: match.index,
          speaker,
          length: match[0].length,
        });
      }

      match = pattern.exec(text);
    }
  }

  markers.sort((a, b) => a.index - b.index);

  if (markers.length === 0) {
    return [{ speaker: "alexandria", text }];
  }

  if (markers[0].index > 0) {
    const beforeText = text.slice(0, markers[0].index).trim();
    if (beforeText) {
      segments.push({ speaker: "alexandria", text: beforeText });
    }
  }

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const startIndex = marker.index + marker.length;
    const endIndex = markers[i + 1]?.index ?? text.length;
    const sectionText = text.slice(startIndex, endIndex).trim();

    if (sectionText) {
      const speaker =
        marker.speaker === "joint"
          ? segments.length % 2 === 0
            ? "alexandria"
            : "kim"
          : marker.speaker;

      segments.push({ speaker, text: sectionText });
    }
  }

  return segments;
}
