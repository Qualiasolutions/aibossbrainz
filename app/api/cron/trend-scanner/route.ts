import { type NextRequest, NextResponse } from "next/server";
import { performWebSearch } from "@/lib/ai/tools/web-search";
import { clearKnowledgeBaseCache } from "@/lib/ai/knowledge-base";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Topics to scan — rotated each run so we don't hit the same queries every time
const SCAN_TOPICS: Array<{
	query: string;
	botType: "alexandria" | "kim" | "shared";
}> = [
	// Alexandria (CMO) topics
	{
		query: "latest social media marketing trends this week 2026",
		botType: "alexandria",
	},
	{
		query: "new Instagram algorithm changes update 2026",
		botType: "alexandria",
	},
	{
		query: "TikTok marketing strategy what's working now 2026",
		botType: "alexandria",
	},
	{
		query: "latest content marketing trends and best practices 2026",
		botType: "alexandria",
	},
	{
		query: "email marketing benchmarks and trends 2026",
		botType: "alexandria",
	},
	{
		query: "brand strategy trends consumer behavior shifts 2026",
		botType: "alexandria",
	},
	{
		query: "AI marketing tools latest developments 2026",
		botType: "alexandria",
	},
	{
		query: "LinkedIn organic reach strategies what's working 2026",
		botType: "alexandria",
	},

	// Kim (CSO) topics
	{
		query: "B2B sales trends and strategies 2026",
		botType: "kim",
	},
	{
		query: "cold outreach what's working in sales 2026",
		botType: "kim",
	},
	{
		query: "sales technology tools AI for sales teams 2026",
		botType: "kim",
	},
	{
		query: "enterprise sales cycle changes and buyer behavior 2026",
		botType: "kim",
	},
	{
		query: "revenue operations trends and best practices 2026",
		botType: "kim",
	},
	{
		query: "pricing strategy trends SaaS and services 2026",
		botType: "kim",
	},

	// Shared topics
	{
		query: "small business growth strategies and trends 2026",
		botType: "shared",
	},
	{
		query: "startup funding and business model trends 2026",
		botType: "shared",
	},
];

// Pick N random topics per run to avoid scanning everything every time
const TOPICS_PER_RUN = 4;

// Max age for trend entries before auto-cleanup
const MAX_TREND_AGE_DAYS = 7;

/**
 * Distill search results into a concise knowledge entry using LLM
 */
async function distillTrend(
	topic: string,
	searchResults: Array<{ title: string; url: string; snippet: string }>,
): Promise<{ title: string; content: string } | null> {
	if (!OPENROUTER_API_KEY || searchResults.length === 0) return null;

	const searchContext = searchResults
		.map(
			(r) => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`,
		)
		.join("\n\n");

	const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${OPENROUTER_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: "google/gemini-2.5-flash",
			messages: [
				{
					role: "system",
					content: `You distill web search results into concise, actionable knowledge entries for business executives. Write in first person as if you are a marketing/sales expert sharing insights. Be specific with data points, dates, and actionable takeaways. No fluff. Max 300 words.`,
				},
				{
					role: "user",
					content: `Topic: ${topic}\n\nSearch Results:\n${searchContext}\n\nDistill this into a single knowledge entry. Include a clear title and the key insights with specific details, stats, and actionable recommendations. If the search results are too generic or outdated, return SKIP.`,
				},
			],
			temperature: 0.3,
			max_tokens: 1000,
		}),
	});

	if (!res.ok) return null;

	const data = (await res.json()) as {
		choices: Array<{ message: { content: string } }>;
	};
	const content = data.choices[0]?.message?.content;
	if (!content || content.trim() === "SKIP") return null;

	// Extract title from first line if it looks like one
	const lines = content.trim().split("\n");
	let title = topic;
	let body = content.trim();

	if (
		lines[0] &&
		lines[0].length < 100 &&
		(lines[0].startsWith("#") || lines[0].startsWith("**"))
	) {
		title = lines[0].replace(/^[#*\s]+/, "").replace(/[*]+$/, "").trim();
		body = lines.slice(1).join("\n").trim();
	}

	return { title, content: body };
}

export async function GET(request: NextRequest) {
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const supabase = createServiceClient();

		// Step 1: Clean up old trend entries (older than MAX_TREND_AGE_DAYS)
		const cutoff = new Date(
			Date.now() - MAX_TREND_AGE_DAYS * 24 * 60 * 60 * 1000,
		).toISOString();
		const { count: deletedCount } = await supabase
			.from("knowledge_base_content")
			.delete({ count: "exact" })
			.eq("source", "trend_scanner")
			.lt("created_at", cutoff);

		if (deletedCount && deletedCount > 0) {
			logger.info(
				{ deletedCount },
				"Cleaned up expired trend entries",
			);
		}

		// Step 2: Pick random topics for this run
		const shuffled = [...SCAN_TOPICS].sort(() => Math.random() - 0.5);
		const selectedTopics = shuffled.slice(0, TOPICS_PER_RUN);

		let ingested = 0;
		let skipped = 0;

		for (const topic of selectedTopics) {
			try {
				// Search the web
				const results = await performWebSearch(topic.query);

				if (results.length === 0) {
					skipped++;
					continue;
				}

				// Distill into a knowledge entry
				const entry = await distillTrend(topic.query, results);

				if (!entry) {
					skipped++;
					continue;
				}

				// Check for duplicate (same title in last 24h)
				const oneDayAgo = new Date(
					Date.now() - 24 * 60 * 60 * 1000,
				).toISOString();
				const { data: existing } = await supabase
					.from("knowledge_base_content")
					.select("id")
					.eq("source", "trend_scanner")
					.eq("title", entry.title)
					.gte("created_at", oneDayAgo)
					.limit(1);

				if (existing && existing.length > 0) {
					skipped++;
					continue;
				}

				// Insert
				const { error: insertError } = await supabase
					.from("knowledge_base_content")
					.insert({
						title: entry.title,
						source: "trend_scanner",
						source_id: `trend_${Date.now()}`,
						bot_type: topic.botType,
						content: entry.content,
						metadata: {
							query: topic.query,
							resultCount: results.length,
							scannedAt: new Date().toISOString(),
						},
					});

				if (insertError) {
					logger.error(
						{ error: insertError.message, topic: topic.query },
						"Failed to insert trend entry",
					);
				} else {
					ingested++;
				}
			} catch (topicError) {
				logger.error(
					{
						error:
							topicError instanceof Error
								? topicError.message
								: String(topicError),
						topic: topic.query,
					},
					"Failed to process trend topic",
				);
				skipped++;
			}
		}

		// Clear KB cache so new trends are picked up immediately
		if (ingested > 0) {
			clearKnowledgeBaseCache();
		}

		logger.info(
			{
				ingested,
				skipped,
				deletedExpired: deletedCount || 0,
				topicsScanned: selectedTopics.length,
			},
			"Trend scanner completed",
		);

		return NextResponse.json({
			success: true,
			ingested,
			skipped,
			deletedExpired: deletedCount || 0,
		});
	} catch (error) {
		logger.error(
			{
				error:
					error instanceof Error ? error.message : String(error),
			},
			"Trend scanner failed",
		);
		return NextResponse.json(
			{ error: "Trend scanner failed" },
			{ status: 500 },
		);
	}
}
