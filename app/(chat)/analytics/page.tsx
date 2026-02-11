"use client";

import {
  BarChart3,
  Calendar,
  FileText,
  Loader2,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnalyticsSummary {
  totalChats: number;
  totalMessages: number;
  totalTokens: number;
  voiceMinutes: number;
  exportCount: number;
  averageMessagesPerChat: number;
}

interface DailyAnalytics {
  date: string;
  messageCount: number;
  tokenUsage: number;
  chatCount: number;
}

interface TopicBreakdown {
  topic: string | null;
  count: number;
  color: string | null;
}

interface RecentActivity {
  id: string;
  title: string;
  createdAt: string;
  topic: string | null;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  daily: DailyAnalytics[];
  topics: TopicBreakdown[];
  recentActivity: RecentActivity[];
  range: number;
  startDate: string;
  endDate: string;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/analytics?range=${range}`);
        if (!response.ok) {
          throw new Error("Failed to fetch analytics");
        }
        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (err) {
        console.error("Analytics fetch error:", err);
        setError("Failed to load analytics. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [range]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Calculate max for chart scaling
  const maxMessages = data?.daily.length
    ? Math.max(...data.daily.map((d) => d.messageCount), 1)
    : 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-50/80">
      {/* Header */}
      <header className="border-stone-200/60 border-b bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              className="flex items-center gap-2 font-semibold text-stone-800"
              href="/new"
            >
              <BarChart3 className="size-5 text-rose-500" />
              <span>Analytics Dashboard</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                className={cn(
                  "h-8 rounded-lg px-3 text-sm",
                  range === days
                    ? "bg-rose-500 text-white hover:bg-rose-600"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200",
                )}
                onClick={() => setRange(days)}
                variant="ghost"
              >
                {days}d
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-rose-500" />
          </div>
        ) : error ? (
          <div className="flex h-96 flex-col items-center justify-center gap-4">
            <p className="text-stone-500">{error}</p>
            <Button onClick={() => setRange(range)} variant="outline">
              Retry
            </Button>
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                color="from-rose-500 to-pink-500"
                icon={<MessageSquare className="size-5" />}
                subtitle={`${data.summary.averageMessagesPerChat.toFixed(1)} avg per chat`}
                title="Total Messages"
                value={formatNumber(data.summary.totalMessages)}
              />
              <MetricCard
                color="from-blue-500 to-indigo-500"
                icon={<FileText className="size-5" />}
                subtitle={`Last ${range} days`}
                title="Conversations"
                value={formatNumber(data.summary.totalChats)}
              />
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Daily Activity Chart */}
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-stone-800">
                  <Calendar className="size-4" />
                  Daily Activity
                </h3>

                {data.daily.length > 0 ? (
                  <div className="h-64">
                    <div className="flex h-full items-end gap-1">
                      {data.daily.slice(-14).map((day, _idx) => (
                        <div
                          key={day.date}
                          className="group relative flex flex-1 flex-col items-center"
                        >
                          <div
                            className="w-full rounded-t bg-gradient-to-t from-rose-500 to-rose-400 transition-all hover:from-rose-600 hover:to-rose-500"
                            style={{
                              height: `${(day.messageCount / maxMessages) * 100}%`,
                              minHeight: day.messageCount > 0 ? "4px" : "0",
                            }}
                          />
                          <span className="mt-2 text-stone-400 text-xs">
                            {formatDate(day.date).split(" ")[1]}
                          </span>

                          {/* Tooltip */}
                          <div className="pointer-events-none absolute bottom-full mb-2 hidden rounded-lg bg-stone-900 px-2 py-1 text-white text-xs group-hover:block">
                            {day.messageCount} messages
                            <br />
                            {formatDate(day.date)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center text-stone-400">
                    No activity data available
                  </div>
                )}
              </div>

              {/* Topics Breakdown */}
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-semibold text-stone-800">
                  Topics Breakdown
                </h3>

                {data.topics.length > 0 ? (
                  <div className="space-y-3">
                    {data.topics.slice(0, 8).map((topic, _idx) => {
                      const totalTopics = data.topics.reduce(
                        (sum, t) => sum + t.count,
                        0,
                      );
                      const percentage = (topic.count / totalTopics) * 100;

                      return (
                        <div key={topic.topic || "uncategorized"}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm text-stone-700">
                              <span
                                className={cn(
                                  "size-2.5 rounded-full",
                                  topic.color || "bg-gray-400",
                                )}
                              />
                              {topic.topic || "Uncategorized"}
                            </span>
                            <span className="text-sm text-stone-500">
                              {topic.count}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                topic.color || "bg-gray-400",
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center text-stone-400">
                    No topic data available
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-semibold text-stone-800">
                Recent Conversations
              </h3>

              {data.recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {data.recentActivity.map((activity) => (
                    <Link
                      key={activity.id}
                      className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-stone-50"
                      href={`/chat/${activity.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare className="size-4 text-stone-400" />
                        <span className="line-clamp-1 text-stone-700">
                          {activity.title}
                        </span>
                        {activity.topic && (
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-500 text-xs">
                            {activity.topic}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-stone-400">
                        {formatDate(activity.createdAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center text-stone-400">
                  No recent conversations
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-stone-500">{title}</p>
          <p className="mt-2 font-bold text-3xl text-stone-900">{value}</p>
          <p className="mt-1 text-sm text-stone-400">{subtitle}</p>
        </div>
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-xl bg-gradient-to-br text-white",
            color,
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
