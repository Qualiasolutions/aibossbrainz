import { MessageSquare, Sparkles, TrendingUp, Users } from "lucide-react";
import { ConversationsPreview } from "@/components/admin/conversations-preview";
import {
	DashboardGrid,
	type WidgetConfig,
} from "@/components/admin/dashboard-grid";
import { ExecutiveBreakdown } from "@/components/admin/executive-breakdown";
import { RecentActivity } from "@/components/admin/recent-activity";
import { StatsCard } from "@/components/admin/stats-card";
import { SubscriptionStats } from "@/components/admin/subscription-stats";
import { SupportPreview } from "@/components/admin/support-preview";
import { UsersPreview } from "@/components/admin/users-preview";
import {
	type ActivityLogEntry,
	type AdminStats,
	type ConversationPreview,
	getAdminStats,
	getRecentActivity,
	getRecentConversations,
	getRecentSupportTickets,
	getRecentUsers,
	getSubscriptionStats,
	type SubscriptionStats as SubscriptionStatsType,
	type SupportTicketPreview,
	type UserPreview,
} from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

// Safe wrappers that return null on error
async function safeGetAdminStats(): Promise<AdminStats | null> {
	try {
		return await getAdminStats();
	} catch (error) {
		console.error("Failed to fetch admin stats:", error);
		return null;
	}
}

async function safeGetRecentActivity(
	limit: number,
): Promise<ActivityLogEntry[]> {
	try {
		return await getRecentActivity(limit);
	} catch (error) {
		console.error("Failed to fetch recent activity:", error);
		return [];
	}
}

async function safeGetSubscriptionStats(): Promise<SubscriptionStatsType | null> {
	try {
		return await getSubscriptionStats();
	} catch (error) {
		console.error("Failed to fetch subscription stats:", error);
		return null;
	}
}

async function safeGetRecentUsers(limit: number): Promise<UserPreview[]> {
	try {
		return await getRecentUsers(limit);
	} catch (error) {
		console.error("Failed to fetch recent users:", error);
		return [];
	}
}

async function safeGetRecentConversations(
	limit: number,
): Promise<ConversationPreview[]> {
	try {
		return await getRecentConversations(limit);
	} catch (error) {
		console.error("Failed to fetch recent conversations:", error);
		return [];
	}
}

async function safeGetRecentSupportTickets(
	limit: number,
): Promise<SupportTicketPreview[]> {
	try {
		return await getRecentSupportTickets(limit);
	} catch (error) {
		console.error("Failed to fetch support tickets:", error);
		return [];
	}
}

export default async function AdminDashboard() {
	// Fetch all data in parallel for performance with error handling
	const [
		stats,
		activity,
		subscriptionStats,
		recentUsers,
		recentConversations,
		recentTickets,
	] = await Promise.all([
		safeGetAdminStats(),
		safeGetRecentActivity(15),
		safeGetSubscriptionStats(),
		safeGetRecentUsers(5),
		safeGetRecentConversations(5),
		safeGetRecentSupportTickets(5),
	]);

	// If all queries failed, show fallback UI instead of redirecting
	// (redirecting to /admin would cause an infinite loop since this IS /admin)
	if (!stats && activity.length === 0 && !subscriptionStats) {
		return (
			<div className="p-4 md:p-6 lg:p-8">
				<div className="mb-6 lg:mb-8">
					<h1 className="text-2xl md:text-3xl font-bold text-neutral-900">Dashboard</h1>
					<p className="text-neutral-500 mt-1">Welcome back.</p>
				</div>
				<div className="flex flex-col items-center justify-center min-h-[400px] gap-4 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
					<p className="text-lg font-medium text-neutral-700">Unable to load dashboard data</p>
					<p className="text-sm text-neutral-500">There may be a temporary database issue. Please try refreshing.</p>
					<a href="/admin" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
						Refresh Dashboard
					</a>
				</div>
			</div>
		);
	}

	// Define all dashboard widgets
	const widgets: WidgetConfig[] = [
		// Row 1: Stats cards (4 small)
		{
			id: "total-users",
			title: "Total Users",
			size: "small",
			component: (
				<StatsCard
					title="Total Users"
					value={stats?.totalUsers ?? 0}
					change={`${stats?.activeUsers ?? 0} onboarded`}
					changeType="neutral"
					icon={Users}
				/>
			),
		},
		{
			id: "total-conversations",
			title: "Total Conversations",
			size: "small",
			component: (
				<StatsCard
					title="Total Conversations"
					value={stats?.totalChats ?? 0}
					icon={MessageSquare}
				/>
			),
		},
		{
			id: "total-messages",
			title: "Total Messages",
			size: "small",
			component: (
				<StatsCard
					title="Total Messages"
					value={(stats?.totalMessages ?? 0).toLocaleString()}
					change={`${stats?.messagesLast24h ?? 0} in last 24h`}
					changeType="positive"
					icon={Sparkles}
				/>
			),
		},
		{
			id: "weekly-messages",
			title: "7-Day Messages",
			size: "small",
			component: (
				<StatsCard
					title="7-Day Messages"
					value={(stats?.messagesLast7d ?? 0).toLocaleString()}
					icon={TrendingUp}
				/>
			),
		},
		// Row 2: Subscriptions and Executive breakdown (2 medium)
		{
			id: "subscriptions",
			title: "Subscriptions",
			size: "medium",
			component: (
				<SubscriptionStats
					stats={
						subscriptionStats ?? {
							trial: 0,
							monthly: 0,
							annual: 0,
							lifetime: 0,
							expired: 0,
							mrr: 0,
							activeSubscribers: 0,
						}
					}
				/>
			),
		},
		{
			id: "executive-usage",
			title: "Executive Usage",
			size: "medium",
			component: (
				<ExecutiveBreakdown
					breakdown={stats?.executiveBreakdown ?? []}
					topExecutive={stats?.topExecutive ?? null}
				/>
			),
		},
		// Row 3: Recent activity and Users preview (2 medium)
		{
			id: "recent-activity",
			title: "Recent Activity",
			size: "medium",
			component: <RecentActivity activity={activity} />,
		},
		{
			id: "recent-users",
			title: "Recent Users",
			size: "medium",
			component: <UsersPreview users={recentUsers} />,
		},
		// Row 4: Conversations and Support tickets (2 medium)
		{
			id: "recent-conversations",
			title: "Recent Conversations",
			size: "medium",
			component: <ConversationsPreview conversations={recentConversations} />,
		},
		{
			id: "support-tickets",
			title: "Support Tickets",
			size: "medium",
			component: <SupportPreview tickets={recentTickets} />,
		},
	];

	return (
		<div className="p-4 md:p-6 lg:p-8">
			{/* Header */}
			<div className="mb-6 lg:mb-8">
				<h1 className="text-2xl md:text-3xl font-bold text-neutral-900">Dashboard</h1>
				<p className="text-neutral-500 mt-1">
					Welcome back. Drag widgets to customize your view.
				</p>
			</div>

			{/* Draggable Dashboard Grid */}
			<DashboardGrid initialWidgets={widgets} />
		</div>
	);
}
