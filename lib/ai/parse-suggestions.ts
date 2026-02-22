import type { Suggestion, SuggestionCategory } from "./suggestions-config";

const SUGGESTIONS_CODE_BLOCK_REGEX = /```suggestions\s*([\s\S]*?)```/;
// Matches raw JSON array with category/text objects at end of message (handles both key orders)
const SUGGESTIONS_RAW_JSON_REGEX =
	/\n*(\[[\s\S]*?\{[\s\S]*?(?:"category"|"text")[\s\S]*?(?:"category"|"text")[\s\S]*?\}[\s\S]*?\])\s*$/;
const VALID_CATEGORIES: SuggestionCategory[] = [
	"deep-dive",
	"pivot",
	"action",
	"clarify",
];

export type ParsedContent = {
	content: string;
	suggestions: Suggestion[];
};

export function parseSuggestions(text: string): ParsedContent {
	// Try code block format first
	let match = text.match(SUGGESTIONS_CODE_BLOCK_REGEX);
	let jsonString: string | null = null;
	let contentWithoutSuggestions = text;

	if (match) {
		jsonString = match[1].trim();
		contentWithoutSuggestions = text
			.replace(SUGGESTIONS_CODE_BLOCK_REGEX, "")
			.trim();
	} else {
		// Try raw JSON format
		match = text.match(SUGGESTIONS_RAW_JSON_REGEX);
		if (match) {
			jsonString = match[1].trim();
			contentWithoutSuggestions = text
				.replace(SUGGESTIONS_RAW_JSON_REGEX, "")
				.trim();
		} else {
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
								"text" in item,
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

			if (!jsonString) {
				return { content: text, suggestions: [] };
			}
		}
	}

	try {
		const parsed = JSON.parse(jsonString);

		if (!Array.isArray(parsed)) {
			return { content: contentWithoutSuggestions, suggestions: [] };
		}

		const suggestions: Suggestion[] = parsed
			.filter(
				(item): item is { category: string; text: string } =>
					typeof item === "object" &&
					item !== null &&
					typeof item.category === "string" &&
					typeof item.text === "string" &&
					VALID_CATEGORIES.includes(item.category as SuggestionCategory),
			)
			.slice(0, 4)
			.map((item, index) => ({
				id: `suggestion-${Date.now()}-${index}`,
				text: item.text.slice(0, 100), // Max 100 chars
				category: item.category as SuggestionCategory,
			}));

		return { content: contentWithoutSuggestions, suggestions };
	} catch {
		return { content: contentWithoutSuggestions, suggestions: [] };
	}
}

export function hasSuggestionsBlock(text: string): boolean {
	return (
		SUGGESTIONS_CODE_BLOCK_REGEX.test(text) ||
		SUGGESTIONS_RAW_JSON_REGEX.test(text)
	);
}
