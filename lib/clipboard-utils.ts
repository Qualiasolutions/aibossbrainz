/**
 * Clipboard utilities for copying clean text from chat messages.
 *
 * Strips markdown formatting so users get readable text when
 * pasting into emails, documents, or other plain-text contexts.
 */

/**
 * Strip markdown formatting from text for clean clipboard copy.
 *
 * Processing order matters:
 * 1. Code fences (preserve content, remove markers)
 * 2. Inline code (preserve content, remove backticks)
 * 3. Bold+italic (***) before bold (**) before italic (*)
 * 4. Underscore variants (__bold__, _italic_)
 * 5. Strikethrough (~~text~~)
 * 6. Links [text](url) -> text (url)
 * 7. Headings (# markers)
 * 8. Blockquotes (> markers)
 * 9. Horizontal rules (normalize to ---)
 * 10. Whitespace cleanup
 */
export function stripMarkdownForClipboard(text: string): string {
	let result = text;

	// Remove code fences but keep content
	result = result.replace(/```[\w]*\n([\s\S]*?)```/g, "$1");

	// Remove inline code backticks
	result = result.replace(/`([^`]+)`/g, "$1");

	// Remove bold+italic markers (must come before bold and italic)
	result = result.replace(/\*\*\*([^*]+)\*\*\*/g, "$1");

	// Remove bold markers
	result = result.replace(/\*\*([^*]+)\*\*/g, "$1");

	// Remove italic markers (not mid-word asterisks)
	result = result.replace(/\*([^*\n]+)\*/g, "$1");

	// Remove underscore bold
	result = result.replace(/__([^_]+)__/g, "$1");

	// Remove underscore italic (word-boundary aware)
	result = result.replace(/(?<![a-zA-Z0-9])_([^_\n]+)_(?![a-zA-Z0-9])/g, "$1");

	// Remove strikethrough
	result = result.replace(/~~([^~]+)~~/g, "$1");

	// Convert links to "text (url)" format
	result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

	// Remove heading markers
	result = result.replace(/^#{1,6}\s+/gm, "");

	// Remove blockquote markers
	result = result.replace(/^>\s+/gm, "");

	// Normalize horizontal rules
	result = result.replace(/^[-*]{3,}$/gm, "---");

	// Clean up excessive whitespace (3+ newlines -> 2)
	result = result.replace(/\n{3,}/g, "\n\n");

	return result.trim();
}
