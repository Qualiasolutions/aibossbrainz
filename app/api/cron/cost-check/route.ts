import { type NextRequest, NextResponse } from "next/server";
import { getDailyAICostTotal, getTopUserCosts } from "@/lib/cost/tracker";
import { sendAdminNotification } from "@/lib/email/admin-notifications";
import { logger } from "@/lib/logger";

const DAILY_COST_THRESHOLD_USD =
	Number(process.env.AI_DAILY_COST_THRESHOLD_USD) || 10;

// Flag users spending more than 10x the per-user average
const ANOMALY_MULTIPLIER = 10;

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

		// COST-04: Per-user anomaly detection
		const topUsers = await getTopUserCosts();
		let anomalousUsers: Array<{
			userId: string;
			costUSD: number;
			requestCount: number;
		}> = [];

		if (daily.uniqueUsers > 0 && topUsers.length > 0) {
			const avgCostPerUser = daily.totalCostUSD / daily.uniqueUsers;
			const anomalyThreshold = avgCostPerUser * ANOMALY_MULTIPLIER;

			anomalousUsers = topUsers
				.filter((u) => u.totalCostUSD > anomalyThreshold)
				.map((u) => ({
					userId: u.userId,
					costUSD: u.totalCostUSD,
					requestCount: u.requestCount,
				}));

			if (anomalousUsers.length > 0) {
				const userDetails = anomalousUsers
					.map(
						(u) =>
							`- User ${u.userId}: $${u.costUSD.toFixed(4)} (${u.requestCount} requests)`,
					)
					.join("\n");

				await sendAdminNotification({
					subject: `AI Per-User Anomaly Alert: ${anomalousUsers.length} user(s) flagged`,
					message: `${anomalousUsers.length} user(s) spending >${ANOMALY_MULTIPLIER}x the average daily cost ($${avgCostPerUser.toFixed(4)}/user).\n\n${userDetails}`,
					type: "alert",
				});

				logger.warn(
					{
						anomalousUsers: anomalousUsers.length,
						avgCostPerUser,
						anomalyThreshold,
					},
					"Per-user cost anomalies detected - admin notified",
				);
			}
		}

		return NextResponse.json({
			success: true,
			...daily,
			thresholdUSD: DAILY_COST_THRESHOLD_USD,
			thresholdExceeded: daily.totalCostUSD > DAILY_COST_THRESHOLD_USD,
			topUsers: topUsers.slice(0, 5),
			anomalousUsers,
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
