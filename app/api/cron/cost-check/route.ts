import { type NextRequest, NextResponse } from "next/server";
import { getDailyAICostTotal } from "@/lib/cost/tracker";
import { sendAdminNotification } from "@/lib/email/admin-notifications";
import { logger } from "@/lib/logger";

const DAILY_COST_THRESHOLD_USD =
	Number(process.env.AI_DAILY_COST_THRESHOLD_USD) || 10;

export async function GET(request: NextRequest) {
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const daily = await getDailyAICostTotal();

		logger.info(
			{
				totalCostUSD: daily.totalCostUSD,
				requestCount: daily.requestCount,
				uniqueUsers: daily.uniqueUsers,
			},
			"Daily AI cost check completed",
		);

		if (daily.totalCostUSD > DAILY_COST_THRESHOLD_USD) {
			await sendAdminNotification({
				subject: `AI Daily Spend Alert: $${daily.totalCostUSD.toFixed(4)}`,
				message: `Daily AI spend ($${daily.totalCostUSD.toFixed(4)}) exceeded threshold ($${DAILY_COST_THRESHOLD_USD}).\n\nRequests: ${daily.requestCount}\nUnique users: ${daily.uniqueUsers}\nInput tokens: ${daily.totalInputTokens}\nOutput tokens: ${daily.totalOutputTokens}`,
				type: "alert",
			});
			logger.warn(
				{
					dailyCost: daily.totalCostUSD,
					threshold: DAILY_COST_THRESHOLD_USD,
				},
				"AI daily cost threshold exceeded - admin notified",
			);
		}

		return NextResponse.json({
			success: true,
			...daily,
			thresholdUSD: DAILY_COST_THRESHOLD_USD,
			thresholdExceeded: daily.totalCostUSD > DAILY_COST_THRESHOLD_USD,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error({ err: error }, "Daily cost check cron failed");
		return NextResponse.json(
			{ error: "Failed to check costs" },
			{ status: 500 },
		);
	}
}
