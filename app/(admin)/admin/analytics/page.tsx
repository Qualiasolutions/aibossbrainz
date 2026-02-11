import { Activity, MessageSquare, TrendingUp, Users } from "lucide-react";
import { ExecutiveBreakdown } from "@/components/admin/executive-breakdown";
import { StatsCard } from "@/components/admin/stats-card";
import { getAdminStats, getAllUsers } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [stats, users] = await Promise.all([getAdminStats(), getAllUsers()]);

  // Calculate additional metrics
  const avgMessagesPerUser =
    stats.totalUsers > 0
      ? Math.round(stats.totalMessages / stats.totalUsers)
      : 0;
  const avgMessagesPerChat =
    stats.totalChats > 0
      ? Math.round(stats.totalMessages / stats.totalChats)
      : 0;
  const conversionRate =
    stats.totalUsers > 0
      ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
      : 0;

  // Calculate daily message trend (last 7 days)
  const last7dAvg =
    stats.messagesLast7d > 0 ? Math.round(stats.messagesLast7d / 7) : 0;

  // User engagement breakdown
  const activeUsersWithChats = users.filter((u) => u.chatCount > 0).length;
  const usersWithManyMessages = users.filter((u) => u.messageCount > 10).length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Analytics</h1>
        <p className="text-neutral-500 mt-1">
          Platform usage statistics and insights.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Avg Messages/User"
          value={avgMessagesPerUser}
          icon={Users}
        />
        <StatsCard
          title="Avg Messages/Chat"
          value={avgMessagesPerChat}
          icon={MessageSquare}
        />
        <StatsCard
          title="Onboarding Rate"
          value={`${conversionRate}%`}
          change={`${stats.activeUsers} of ${stats.totalUsers} users`}
          changeType="neutral"
          icon={TrendingUp}
        />
        <StatsCard
          title="Daily Avg (7d)"
          value={last7dAvg}
          change="messages per day"
          changeType="neutral"
          icon={Activity}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Executive Usage */}
        <ExecutiveBreakdown
          breakdown={stats.executiveBreakdown}
          topExecutive={stats.topExecutive}
        />

        {/* User Engagement */}
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-neutral-900">
              User Engagement
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Engagement Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-2xl font-bold text-neutral-900">
                  {activeUsersWithChats}
                </p>
                <p className="text-sm text-neutral-500">Users with chats</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-2xl font-bold text-neutral-900">
                  {usersWithManyMessages}
                </p>
                <p className="text-sm text-neutral-500">
                  Power users (10+ msgs)
                </p>
              </div>
            </div>

            {/* Engagement Bars */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-neutral-600">
                    Users with conversations
                  </span>
                  <span className="text-sm text-neutral-900 font-medium">
                    {stats.totalUsers > 0
                      ? Math.round(
                          (activeUsersWithChats / stats.totalUsers) * 100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                    style={{
                      width: `${stats.totalUsers > 0 ? (activeUsersWithChats / stats.totalUsers) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-neutral-600">
                    Power users (10+ messages)
                  </span>
                  <span className="text-sm text-neutral-900 font-medium">
                    {stats.totalUsers > 0
                      ? Math.round(
                          (usersWithManyMessages / stats.totalUsers) * 100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-full"
                    style={{
                      width: `${stats.totalUsers > 0 ? (usersWithManyMessages / stats.totalUsers) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Users */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Top Users by Activity
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                  Chats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                  Messages
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users
                .sort((a, b) => b.messageCount - a.messageCount)
                .slice(0, 10)
                .map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-neutral-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {user.displayName || "No name"}
                        </p>
                        <p className="text-xs text-neutral-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {user.companyName || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {user.chatCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {user.messageCount}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
