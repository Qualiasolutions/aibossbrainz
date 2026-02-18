import {
	getAnalyticsSummary,
	getDailyAnalytics,
	getRecentActivity,
	getTopicBreakdown,
} from "@/lib/analytics/queries";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return new ChatSDKError("unauthorized:api").toResponse();
		}

		const { searchParams } = new URL(request.url);
		const range = searchParams.get("range") || "30"; // Default 30 days

		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - Number.parseInt(range, 10));

		// Fetch all analytics data in parallel
		const [summary, daily, topics, recentActivity] = await Promise.all([
			getAnalyticsSummary(user.id, startDate, endDate),
			getDailyAnalytics(user.id, startDate, endDate),
			getTopicBreakdown(user.id, startDate, endDate),
			getRecentActivity(user.id, 10),
		]);

		return new Response(
			JSON.stringify({
				summary,
				daily,
				topics,
				recentActivity,
				range: Number.parseInt(range, 10),
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			}),
			{
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "private, max-age=300", // 5 min cache
				},
			},
		);
	} catch (error) {
		logger.error({ err: error }, "Analytics API error");

		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}

		return new ChatSDKError("bad_request:api").toResponse();
	}
}
