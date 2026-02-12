import { tool } from "ai";
import { z } from "zod";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;

interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

/**
 * Searches the web using Tavily API (if key available) or DuckDuckGo
 */
async function performWebSearch(query: string): Promise<SearchResult[]> {
	// Try Tavily first if API key is available (better for AI)
	if (TAVILY_API_KEY) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

			const response = await fetch("https://api.tavily.com/search", {
				method: "POST",
				signal: controller.signal,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					api_key: TAVILY_API_KEY,
					query,
					search_depth: "basic",
					max_results: 5,
					include_answer: true,
				}),
			});

			clearTimeout(timeoutId);

			if (response.ok) {
				const data = await response.json();
				const results: SearchResult[] = [];

				// Add the AI-generated answer if available
				if (data.answer) {
					results.push({
						title: "Quick Answer",
						url: "",
						snippet: data.answer,
					});
				}

				// Add search results
				if (data.results) {
					for (const result of data.results.slice(0, 5)) {
						results.push({
							title: result.title,
							url: result.url,
							snippet: result.content,
						});
					}
				}

				return results;
			}
		} catch {
			// Fall through to DuckDuckGo
		}
	}

	// Try Serper.dev (free tier: 2500 searches/month, Google results)
	if (SERPER_API_KEY) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

			const response = await fetch("https://google.serper.dev/search", {
				method: "POST",
				signal: controller.signal,
				headers: {
					"X-API-KEY": SERPER_API_KEY,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					q: query,
					num: 5,
				}),
			});

			clearTimeout(timeoutId);

			if (response.ok) {
				const data = await response.json();
				const results: SearchResult[] = [];

				// Add knowledge graph answer if available
				if (data.knowledgeGraph?.description) {
					results.push({
						title: data.knowledgeGraph.title || "Quick Answer",
						url: data.knowledgeGraph.website || "",
						snippet: data.knowledgeGraph.description,
					});
				}

				// Add answer box if available
				if (data.answerBox?.answer) {
					results.push({
						title: "Answer",
						url: data.answerBox.link || "",
						snippet: data.answerBox.answer,
					});
				}

				// Add organic search results
				if (data.organic) {
					for (const result of data.organic.slice(0, 5)) {
						results.push({
							title: result.title,
							url: result.link,
							snippet: result.snippet,
						});
					}
				}

				if (results.length > 0) {
					return results;
				}
			}
		} catch {
			// Fall through to DuckDuckGo
		}
	}

	// Fallback to DuckDuckGo Instant Answer API (free, no key needed)
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

		const encodedQuery = encodeURIComponent(query);
		const response = await fetch(
			`https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`,
			{
				signal: controller.signal,
				headers: {
					"User-Agent": "AlecciMedia/1.0",
				},
			},
		);

		clearTimeout(timeoutId);

		if (response.ok) {
			const data = await response.json();
			const results: SearchResult[] = [];

			// Abstract (main answer)
			if (data.Abstract) {
				results.push({
					title: data.Heading || "Answer",
					url: data.AbstractURL || "",
					snippet: data.Abstract,
				});
			}

			// Related topics
			if (data.RelatedTopics) {
				for (const topic of data.RelatedTopics.slice(0, 4)) {
					if (topic.Text && !topic.Topics) {
						results.push({
							title: topic.FirstURL?.split("/").pop() || "Related",
							url: topic.FirstURL || "",
							snippet: topic.Text,
						});
					}
				}
			}

			// If we got results, return them
			if (results.length > 0) {
				return results;
			}

			// If no instant answer, try HTML scraping as last resort
			return await scrapeWebSearch(query);
		}
	} catch {
		// Fall through to scraping
	}

	return await scrapeWebSearch(query);
}

/**
 * Scrapes DuckDuckGo HTML search results (fallback)
 */
async function scrapeWebSearch(query: string): Promise<SearchResult[]> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

		const encodedQuery = encodeURIComponent(query);
		const response = await fetch(
			`https://html.duckduckgo.com/html/?q=${encodedQuery}`,
			{
				signal: controller.signal,
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
				},
			},
		);

		clearTimeout(timeoutId);

		if (!response.ok) {
			return [];
		}

		const html = await response.text();
		const results: SearchResult[] = [];

		// Simple regex-based extraction (avoid heavy HTML parser dependency)
		const resultPattern =
			/<a class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([^<]*)/g;
		let match: RegExpExecArray | null = resultPattern.exec(html);

		while (match !== null && results.length < 5) {
			const [, url, title, snippet] = match;
			if (url && title) {
				results.push({
					title: decodeHTMLEntities(title.trim()),
					url: url.startsWith("//") ? `https:${url}` : url,
					snippet: decodeHTMLEntities(snippet?.trim() || ""),
				});
			}
			match = resultPattern.exec(html);
		}

		return results;
	} catch {
		return [];
	}
}

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ");
}

/**
 * Web search tool for AI to get real-time information
 */
export const webSearch = tool({
	description:
		"Search the web for current information, recent news, real-time data, or facts you're unsure about. Use this when users ask about current events, recent developments, prices, statistics, or anything that requires up-to-date information.",
	inputSchema: z.object({
		query: z
			.string()
			.describe("The search query. Be specific and include relevant context."),
	}),
	execute: async ({ query }) => {
		const results = await performWebSearch(query);

		if (results.length === 0) {
			return {
				success: false,
				message:
					"No search results found. Try rephrasing your query or providing more context.",
				results: [],
			};
		}

		return {
			success: true,
			message: `Found ${results.length} results for "${query}"`,
			results: results.map((r) => ({
				title: r.title,
				url: r.url,
				snippet: r.snippet.slice(0, 500), // Limit snippet length
			})),
		};
	},
});
