import { tool } from "ai";
import { z } from "zod";
import type { UserType } from "@/lib/ai/entitlements";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { sanitizePromptContent } from "@/lib/ai/prompts";
import { isValidHttpUrl, performWebSearch } from "./web-search";

// H-4: In-process deep research execution counter (resets on deploy)
// Primary rate limiting happens at the chat route level; this is a cost safety net
const DEEP_RESEARCH_MAX_PER_HOUR = 100;
let deepResearchCounter = 0;
let deepResearchWindowStart = Date.now();

function checkGlobalDeepResearchLimit(): boolean {
	const now = Date.now();
	if (now - deepResearchWindowStart > 60 * 60 * 1000) {
		deepResearchCounter = 0;
		deepResearchWindowStart = now;
	}
	deepResearchCounter++;
	return deepResearchCounter <= DEEP_RESEARCH_MAX_PER_HOUR;
}

// MED-9: Per-user daily deep research counter (in-memory, resets on deploy)
// Provides per-user entitlement enforcement alongside the global safety net
const userDailyCounters = new Map<string, { count: number; date: string }>();

function checkPerUserLimit(userId: string, maxPerDay: number): boolean {
	const today = new Date().toISOString().split("T")[0];
	const entry = userDailyCounters.get(userId);

	if (!entry || entry.date !== today) {
		userDailyCounters.set(userId, { count: 1, date: today });
		return true;
	}

	entry.count++;
	return entry.count <= maxPerDay;
}

/**
 * Creates a deep research tool with per-user entitlement enforcement (MED-9).
 * The factory function accepts user context and returns a tool that checks:
 * 1. Per-user daily limit based on subscription tier
 * 2. Global in-process hourly limit as a secondary safety net
 */
export function createDeepResearch({
	userId,
	userType,
}: { userId: string; userType: UserType }) {
	const maxPerDay =
		entitlementsByUserType[userType]?.maxDeepResearchPerDay ?? 5;

	return tool({
		description:
			"Run a deep research session with 2-4 parallel search queries for comprehensive coverage. Use this when a single search isn't enough — e.g., competitor analysis, market research, multi-faceted topics, or when you need to cross-reference information from different angles. Each query should target a different aspect of the research question.",
		inputSchema: z.object({
			topic: z
				.string()
				.max(500)
				.describe(
					"The overall research topic or question being investigated.",
				),
			queries: z
				.array(
					z.object({
						angle: z
							.string()
							.max(200)
							.describe(
								"What aspect this query investigates (e.g., 'pricing', 'competitors', 'reviews').",
							),
						query: z
							.string()
							.max(500)
							.describe("The specific search query to run."),
					}),
				)
				.min(2)
				.max(4)
				.describe("2-4 search queries, each targeting a different angle."),
		}),
		execute: async ({ topic, queries }) => {
			// MED-9: Check per-user entitlement limit first
			if (!checkPerUserLimit(userId, maxPerDay)) {
				return {
					success: false,
					topic,
					message: `You've reached your daily deep research limit (${maxPerDay} per day). Please try again tomorrow or upgrade your plan for more.`,
					searches: [],
				};
			}

			// Secondary global safety net
			if (!checkGlobalDeepResearchLimit()) {
				return {
					success: false,
					topic,
					message:
						"Deep research is temporarily rate limited. Please try again in a few minutes.",
					searches: [],
				};
			}

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
}
