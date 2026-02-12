/**
 * Shared PDF style constants for jsPDF native text rendering.
 * Used by both single-message and thread PDF exports.
 */
export const STYLES = {
	// Page dimensions (A4 in mm)
	pageWidth: 210,
	pageHeight: 297,

	// Margins (mm)
	marginTop: 20,
	marginBottom: 20,
	marginLeft: 15,
	marginRight: 15,

	// Content width (computed)
	contentWidth: 210 - 15 - 15,

	// Font sizes (pt)
	h1Size: 18,
	h2Size: 15,
	h3Size: 13,
	bodySize: 11,
	codeSize: 10,
	footerSize: 9,

	// Line height multiplier
	lineHeight: 1.4,

	// Spacing (mm)
	blockSpacing: 6,
	listIndent: 8,
	codeBlockPadding: 4,
	quoteIndent: 10,

	// Colors (RGB tuples)
	textColor: [26, 26, 26] as [number, number, number],
	headingColor: [26, 26, 26] as [number, number, number],
	mutedColor: [100, 100, 100] as [number, number, number],
	codeBackground: [245, 245, 245] as [number, number, number],
	quoteBarColor: [209, 213, 219] as [number, number, number],
	linkColor: [37, 99, 235] as [number, number, number],
	dividerColor: [229, 229, 229] as [number, number, number],
} as const;
