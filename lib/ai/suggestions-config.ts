import type { BotType } from "@/lib/bot-personalities";

export type SuggestionCategory =
	| "deep-dive" // Go deeper on current topic
	| "pivot" // Related but different angle
	| "action" // Actionable next step
	| "clarify"; // Ask for clarification

export type Suggestion = {
	id: string;
	text: string;
	category: SuggestionCategory;
};

export type SuggestionsConfig = {
	maxSuggestions: number;
	categories: SuggestionCategory[];
};

export const SUGGESTIONS_CONFIG: Record<BotType, SuggestionsConfig> = {
	alexandria: {
		maxSuggestions: 3,
		categories: ["deep-dive", "pivot", "action"],
	},
	kim: {
		maxSuggestions: 3,
		categories: ["deep-dive", "action", "pivot"],
	},
	collaborative: {
		maxSuggestions: 4,
		categories: ["deep-dive", "pivot", "action", "clarify"],
	},
};

export const CATEGORY_PROMPTS: Record<SuggestionCategory, string> = {
	"deep-dive": "A question to explore this topic more deeply",
	pivot: "A related question from a different angle",
	action: "A request for an actionable next step or deliverable",
	clarify: "A clarifying question about something mentioned",
};
