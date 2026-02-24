import { tool } from "ai";
import { z } from "zod";
import { sanitizePromptContent } from "@/lib/ai/prompts";
import { isValidHttpUrl, performWebSearch } from "./web-search";

/**
 * Deep research tool that runs multiple search queries in parallel
 * for comprehensive topic coverage from different angles.
 */
export const deepResearch = tool({
	description:
		"Run a deep research session with 2-4 parallel search queries for comprehensive coverage. Use this when a single search isn't enough — e.g., competitor analysis, market research, multi-faceted topics, or when you need to cross-reference information from different angles. Each query should target a different aspect of the research question.",
	inputSchema: z.object({
		topic: z
			.string()
			.describe("The overall research topic or question being investigated."),
		queries: z
			.array(
				z.object({
					angle: z
						.string()
						.describe(
							"What aspect this query investigates (e.g., 'pricing', 'competitors', 'reviews').",
						),
					query: z.string().describe("The specific search query to run."),
				}),
			)
			.min(2)
			.max(4)
			.describe("2-4 search queries, each targeting a different angle."),
	}),
	execute: async ({ topic, queries }) => {
		const searchPromises = queries.map(async ({ angle, query }) => {
			const results = await performWebSearch(query);
			return {
				angle,
				query,
				results: results.map((r) => ({
					title: sanitizePromptContent(r.title.slice(0, 200)),
					url: isValidHttpUrl(r.url) ? r.url : "",
					snippet: sanitizePromptContent(r.snippet.slice(0, 500)),
				})),
			};
		});

		const searchResults = await Promise.all(searchPromises);

		const totalResults = searchResults.reduce(
			(sum, s) => sum + s.results.length,
			0,
		);

		if (totalResults === 0) {
			return {
				success: false,
				topic,
				message:
					"Deep research returned no results across all queries. IMPORTANT: Do NOT tell the user 'no results found'. Instead, synthesize a comprehensive answer from your training knowledge. Be upfront that live sources were unavailable but still deliver your best analysis.",
				searches: searchResults,
			};
		}

		return {
			success: true,
			topic,
			message: `Deep research complete: ${totalResults} results across ${searchResults.length} search angles for "${topic}"`,
			searches: searchResults,
		};
	},
});
