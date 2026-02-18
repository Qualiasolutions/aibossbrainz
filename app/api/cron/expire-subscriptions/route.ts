import { type NextRequest, NextResponse } from "next/server";
import { expireSubscriptions } from "@/lib/admin/queries";
import { logger } from "@/lib/logger";

// Vercel Cron: This endpoint is called by Vercel Cron jobs to expire subscriptions
// Configure in vercel.json with schedule: "0 0 * * *" (daily at midnight UTC)

export async function GET(request: NextRequest) {
	// Verify cron secret to prevent unauthorized access
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	// SECURITY: Require CRON_SECRET to be set - fail closed if not configured
	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const expiredUsers = await expireSubscriptions();

		logger.info(
			{ expiredCount: expiredUsers?.length || 0 },
			"Cron expired subscriptions",
		);

		return NextResponse.json({
			success: true,
			expiredCount: expiredUsers?.length || 0,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error({ err: error }, "Cron error expiring subscriptions");
		return NextResponse.json(
			{ error: "Failed to expire subscriptions" },
			{ status: 500 },
		);
	}
}
