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
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.describe("Post date in YYYY-MM-DD format"),
	scheduledTime: z
		.string()
		.regex(/^\d{2}:\d{2}$/)
		.optional()
		.describe(
			"Suggested posting time in HH:MM format (24-hour). Use platform best practices: LinkedIn 10:00-12:00, Instagram 11:00-14:00, TikTok 18:00-22:00",
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
}: ContentCalendarProps) =>
	tool({
		description: `Create social media posts and add them to the user's Content Calendar.

Use this tool whenever users ask for social media content, posts, a content calendar, posting schedule, or any social media planning.

**CRITICAL USAGE RULES:**
1. For 1-2 posts: Show the full post content inline in your response AND call this tool to save them
2. For 3+ posts or calendar/schedule requests: Call this tool to save all posts, then tell the user "I've added X posts to your Content Calendar — click the calendar icon in the top bar to review them"
3. ALWAYS call this tool — never just describe posts without saving them

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
				const sanitizedPosts = posts.map((post) => ({
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
					scheduledDate: post.scheduledDate,
					scheduledTime: post.scheduledTime || null,
					status: "draft" as const,
					botType: botType as "alexandria" | "kim" | "collaborative" | null,
					focusMode: focusMode || null,
					metadata: {},
				}));

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
				logger.error(
					{ err: error, postCount: posts.length },
					"Content calendar tool unexpected error",
				);
				return {
					success: false,
					message:
						"An unexpected error occurred while saving posts. Please try again.",
				};
			}
		},
	});
