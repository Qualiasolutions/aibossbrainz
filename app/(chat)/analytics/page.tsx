import {
	getAnalyticsSummary,
	getDailyAnalytics,
	getRecentActivity,
	getTopicBreakdown,
} from "@/lib/analytics/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AnalyticsClient from "./analytics-client";

export default async function AnalyticsPage({
	searchParams,
}: {
	searchParams: Promise<{ range?: string }>;
}) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const params = await searchParams;
	const range = Number.parseInt(params.range || "30", 10);
	const validRange = [7, 30, 90].includes(range) ? range : 30;

	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - validRange);

	// Fetch all analytics data in parallel on the server
	const [summary, daily, topics, recentActivityRaw] = await Promise.all([
		getAnalyticsSummary(user.id, startDate, endDate),
		getDailyAnalytics(user.id, startDate, endDate),
		getTopicBreakdown(user.id, startDate, endDate),
		getRecentActivity(user.id, 10),
	]);

	// Serialize Date objects to strings for the client component
	const recentActivity = recentActivityRaw.map((item) => ({
		...item,
		createdAt:
			item.createdAt instanceof Date
				? item.createdAt.toISOString()
				: String(item.createdAt),
	}));

	const data = {
		summary,
		daily,
		topics,
		recentActivity,
		range: validRange,
		startDate: startDate.toISOString(),
		endDate: endDate.toISOString(),
	};

	return <AnalyticsClient data={data} />;
}
