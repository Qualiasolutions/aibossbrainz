import { tool } from "ai";
import { z } from "zod";
import { sanitizePromptContent } from "@/lib/ai/prompts";
import type { Session } from "@/lib/artifacts/server";
import { createContentCalendarPosts } from "@/lib/db/queries";
import { logger } from "@/lib/logger";

type ContentCalendarProps = {
	session: Session;
	chatId: string;
	botType: string;
	focusMode?: string;
};

/**
 * Normalize a date string to YYYY-MM-DD format.
 * Handles: "2026-03-15", "2026-3-15", "March 15, 2026", "03/15/2026", etc.
 */
function normalizeDate(input: string): string {
	// Already in YYYY-MM-DD format
	if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

	// Single-digit month/day: 2026-3-15 → 2026-03-15
	const paddedMatch = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
	if (paddedMatch) {
		const [, year, month, day] = paddedMatch;
		return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
	}

	// Fallback: try Date.parse() for natural formats (March 15, 2026)
	const parsed = new Date(input);
	if (!Number.isNaN(parsed.getTime())) {
		const year = parsed.getFullYear();
		const month = String(parsed.getMonth() + 1).padStart(2, "0");
		const day = String(parsed.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	throw new Error(
		`Invalid date format: "${input}". Use YYYY-MM-DD (e.g., 2026-03-15).`,
	);
}

/**
 * Normalize a time string to HH:MM (24-hour) format.
 * Handles: "09:30", "9:30", "10:00 AM", "3:30 PM", etc.
 */
function normalizeTime(input: string): string {
	// Already in HH:MM format
	if (/^\d{2}:\d{2}$/.test(input)) return input;

	// Single-digit hour: 9:30 → 09:30
	const paddedMatch = input.match(/^(\d{1,2}):(\d{2})$/);
	if (paddedMatch) {
		const [, hour, minute] = paddedMatch;
		return `${hour.padStart(2, "0")}:${minute}`;
	}

	// 12-hour format: 10:00 AM → 10:00, 3:30 PM → 15:30
	const ampmMatch = input.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
	if (ampmMatch) {
		const [, hour, minute, period] = ampmMatch;
		let hourNum = Number.parseInt(hour, 10);
		if (period.toUpperCase() === "PM" && hourNum !== 12) hourNum += 12;
		if (period.toUpperCase() === "AM" && hourNum === 12) hourNum = 0;
		return `${String(hourNum).padStart(2, "0")}:${minute}`;
	}

	throw new Error(
		`Invalid time format: "${input}". Use HH:MM 24-hour (e.g., 14:30) or HH:MM AM/PM.`,
	);
}

const socialPostSchema = z.object({
	platform: z
		.enum(["linkedin", "instagram", "tiktok", "facebook", "twitter", "generic"])
		.describe("Social media platform for this post"),
	caption: z
		.string()
		.max(2200)
		.describe(
			"Post caption with platform-appropriate length and tone. LinkedIn: professional, 1300 chars. Instagram: storytelling, 2200 chars. TikTok: casual/short. Twitter: 280 chars max. Facebook: conversational.",
		),
	hashtags: z
		.array(z.string())
		.max(30)
		.describe(
			"Relevant hashtags WITHOUT # prefix (e.g., ['marketing', 'growth']). LinkedIn: 3-5, Instagram: 15-30, TikTok: 3-5, Twitter: 1-2, Facebook: 3-5.",
		),
	visualSuggestion: z
		.string()
		.max(500)
		.optional()
		.describe(
			"Professional description of what image, video, or graphic to create. Be specific about composition, style, and mood.",
		),
	scheduledDate: z
		.string()
		.describe(
			"Post date in YYYY-MM-DD format (e.g., 2026-03-15). Other date formats are also accepted and will be normalized.",
		),
	scheduledTime: z
		.string()
		.optional()
		.describe(
			"Suggested posting time in HH:MM 24-hour format (e.g., 14:00). Use platform best practices: LinkedIn 10:00-12:00, Instagram 11:00-14:00, TikTok 18:00-22:00",
		),
});

const contentCalendarSchema = z.object({
	action: z
		.enum(["create"])
		.describe("Action to perform - create adds posts to the calendar"),
	posts: z
		.array(socialPostSchema)
		.min(1)
		.max(30)
		.describe("Social media posts to add to the calendar"),
});

type ContentCalendarInput = z.infer<typeof contentCalendarSchema>;

export const contentCalendar = ({
	session,
	chatId,
	botType,
	focusMode,
}: ContentCalendarProps) => {
	const today = new Date().toISOString().split("T")[0];
	return tool({
		description: `Create social media posts and add them to the user's Content Calendar.

**TODAY'S DATE: ${today}** — All scheduled dates MUST be ${today} or later. Never use past dates.

Use this tool whenever users ask for social media content, posts, a content calendar, posting schedule, or any social media planning.

**CRITICAL USAGE RULES:**
1. ALWAYS call this tool to save posts — never just describe posts without saving them
2. NEVER show the full post content (captions, hashtags, visual suggestions) inline in your chat response. The posts are saved to the Content Calendar and the user will review them there.
3. In your chat response, briefly discuss your strategic approach (as the executive persona), then confirm: "I've added X posts to your Content Calendar — click the calendar icon in the top bar to review and edit them."
4. Keep the chat response concise — the value is in the calendar, not in repeating content in chat.
5. Schedule posts starting from today (${today}) or future dates. NEVER use dates before today.

**Platform Guidelines:**
- LinkedIn: Professional, thought leadership, 1300 chars, 3-5 hashtags
- Instagram: Visual storytelling, 2200 chars, 15-30 hashtags, carousel/reel ideas
- TikTok: Casual/trendy, short caption, 3-5 trending hashtags, video hook description
- Facebook: Conversational, community focus, 3-5 hashtags
- Twitter/X: Concise (280 chars max), punchy, 1-2 hashtags
- Generic: Cross-platform adaptable format

**Visual Suggestions:** Always describe what image/video to create — composition, style, color palette, mood. Be specific enough for a designer or AI image tool to produce it.

Call this tool ONCE with all posts in the posts array.`,
		inputSchema: contentCalendarSchema,
		execute: async ({ action, posts }: ContentCalendarInput) => {
			if (!session?.user?.id) {
				return {
					success: false,
					message: "User must be logged in to save content calendar posts.",
				};
			}

			if (action !== "create" || !posts || posts.length === 0) {
				return {
					success: false,
					message: "Invalid action or missing posts.",
				};
			}

			try {
				const sanitizedPosts = posts.map((post, index) => {
					let normalizedDate: string;
					let normalizedTime: string | null;

					try {
						normalizedDate = normalizeDate(post.scheduledDate);
					} catch {
						throw new Error(
							`Post ${index + 1}: invalid scheduledDate "${post.scheduledDate}". Use YYYY-MM-DD format.`,
						);
					}

					try {
						normalizedTime = post.scheduledTime
							? normalizeTime(post.scheduledTime)
							: null;
					} catch {
						throw new Error(
							`Post ${index + 1}: invalid scheduledTime "${post.scheduledTime}". Use HH:MM 24-hour format.`,
						);
					}

					return {
						userId: session.user!.id,
						chatId,
						platform: post.platform,
						caption: sanitizePromptContent(post.caption),
						hashtags: post.hashtags.map((tag) =>
							sanitizePromptContent(tag.replace(/^#/, "")),
						),
						visualSuggestion: post.visualSuggestion
							? sanitizePromptContent(post.visualSuggestion)
							: null,
						scheduledDate: normalizedDate,
						scheduledTime: normalizedTime,
						status: "draft" as const,
						botType: botType as "alexandria" | "kim" | "collaborative" | null,
						focusMode: focusMode || null,
						metadata: {},
					};
				});

				const created = await createContentCalendarPosts(sanitizedPosts);

				// Group by platform for summary
				const platformCounts: Record<string, number> = {};
				for (const p of created) {
					platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
				}

				const platformSummary = Object.entries(platformCounts)
					.map(([platform, count]) => `${count} ${platform}`)
					.join(", ");

				return {
					success: true,
					postsCreated: created.length,
					platformSummary,
					posts: created.map((p) => ({
						id: p.id,
						platform: p.platform,
						date: p.scheduledDate,
					})),
					message: `Added ${created.length} post(s) to your Content Calendar (${platformSummary}).`,
				};
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				logger.error(
					{ err: error, postCount: posts.length, errorMessage },
					"Content calendar tool error",
				);
				return {
					success: false,
					message: `Failed to save posts: ${errorMessage}`,
				};
			}
		},
	});
};
