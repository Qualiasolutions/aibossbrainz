import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AnalyticsSummary {
  totalChats: number;
  totalMessages: number;
  totalTokens: number;
  voiceMinutes: number;
  exportCount: number;
  averageMessagesPerChat: number;
}

export interface DailyAnalytics {
  date: string;
  messageCount: number;
  tokenUsage: number;
  chatCount: number;
}

export interface TopicBreakdown {
  topic: string | null;
  count: number;
  color: string | null;
}

/**
 * Get analytics summary for a user over a date range
 * Uses optimized Postgres function to avoid N+1 queries
 */
export async function getAnalyticsSummary(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<AnalyticsSummary> {
  try {
    const supabase = await createClient();

    // Use RPC to get chat and message counts in a single query
    // Cast to avoid type errors - function exists in DB but not in generated types
    const { data: summaryData } = (await (supabase.rpc as Function)(
      "get_user_analytics_summary",
      {
        p_user_id: userId,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
      },
    )) as { data: Array<{ chat_count: number; message_count: number }> | null };

    const summary = summaryData?.[0] || { chat_count: 0, message_count: 0 };

    // Get aggregated analytics from UserAnalytics table
    const { data: analyticsData } = await supabase
      .from("UserAnalytics")
      .select("tokenUsage, voiceMinutes, exportCount")
      .eq("userId", userId)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString());

    const analytics = analyticsData || [];
    const totalTokens = analytics.reduce(
      (sum, a) => sum + (Number(a.tokenUsage) || 0),
      0,
    );
    const voiceMinutes = analytics.reduce(
      (sum, a) => sum + (Number(a.voiceMinutes) || 0),
      0,
    );
    const exportCount = analytics.reduce(
      (sum, a) => sum + (Number(a.exportCount) || 0),
      0,
    );

    const totalChats = Number(summary.chat_count) || 0;
    const totalMessages = Number(summary.message_count) || 0;

    return {
      totalChats,
      totalMessages,
      totalTokens,
      voiceMinutes,
      exportCount,
      averageMessagesPerChat: totalChats > 0 ? totalMessages / totalChats : 0,
    };
  } catch (error) {
    console.error("Failed to get analytics summary:", error);
    return {
      totalChats: 0,
      totalMessages: 0,
      totalTokens: 0,
      voiceMinutes: 0,
      exportCount: 0,
      averageMessagesPerChat: 0,
    };
  }
}

/**
 * Get daily analytics for charting
 */
export async function getDailyAnalytics(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<DailyAnalytics[]> {
  try {
    const supabase = await createClient();

    // Get user's chats
    const { data: userChats } = await supabase
      .from("Chat")
      .select("id, createdAt")
      .eq("userId", userId)
      .gte("createdAt", startDate.toISOString())
      .lte("createdAt", endDate.toISOString());

    const chatIds = userChats?.map((c) => c.id) || [];

    // Get messages for these chats
    let messages: { createdAt: string }[] = [];
    if (chatIds.length > 0) {
      const { data } = await supabase
        .from("Message_v2")
        .select("createdAt")
        .in("chatId", chatIds)
        .gte("createdAt", startDate.toISOString())
        .lte("createdAt", endDate.toISOString());
      messages = data || [];
    }

    // Group by date
    const dailyData = new Map<
      string,
      { messageCount: number; chatCount: number }
    >();

    // Count messages by date
    for (const msg of messages) {
      const date = msg.createdAt.split("T")[0];
      const existing = dailyData.get(date) || { messageCount: 0, chatCount: 0 };
      existing.messageCount++;
      dailyData.set(date, existing);
    }

    // Count chats by date
    for (const chat of userChats || []) {
      const date = chat.createdAt.split("T")[0];
      const existing = dailyData.get(date) || { messageCount: 0, chatCount: 0 };
      existing.chatCount++;
      dailyData.set(date, existing);
    }

    // Convert to array and sort
    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        messageCount: data.messageCount,
        tokenUsage: 0,
        chatCount: data.chatCount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Failed to get daily analytics:", error);
    return [];
  }
}

/**
 * Get topic breakdown for the user
 */
export async function getTopicBreakdown(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<TopicBreakdown[]> {
  try {
    const supabase = await createClient();

    const { data: chats } = await supabase
      .from("Chat")
      .select("topic, topicColor")
      .eq("userId", userId)
      .gte("createdAt", startDate.toISOString())
      .lte("createdAt", endDate.toISOString());

    // Group by topic
    const topicCounts = new Map<
      string,
      { count: number; color: string | null }
    >();

    for (const chat of chats || []) {
      const topic = chat.topic || "Uncategorized";
      const existing = topicCounts.get(topic) || {
        count: 0,
        color: chat.topicColor,
      };
      existing.count++;
      topicCounts.set(topic, existing);
    }

    // Convert to array and sort by count
    return Array.from(topicCounts.entries())
      .map(([topic, data]) => ({
        topic: topic === "Uncategorized" ? null : topic,
        count: data.count,
        color: data.color,
      }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("Failed to get topic breakdown:", error);
    return [];
  }
}

/**
 * Record analytics for a user action
 */
export async function recordAnalytics(
  userId: string,
  type: "message" | "token" | "voice" | "export",
  value: number = 1,
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  try {
    const supabase = await createClient();

    // Check if record exists for today
    const { data: existing } = await supabase
      .from("UserAnalytics")
      .select("*")
      .eq("userId", userId)
      .eq("date", todayStr)
      .limit(1);

    if (existing && existing.length > 0) {
      const record = existing[0];
      const updates: Record<string, number> = {};

      if (type === "message") {
        updates.messageCount = (Number(record.messageCount) || 0) + value;
      } else if (type === "token") {
        updates.tokenUsage = (Number(record.tokenUsage) || 0) + value;
      } else if (type === "voice") {
        updates.voiceMinutes = (Number(record.voiceMinutes) || 0) + value;
      } else if (type === "export") {
        updates.exportCount = (Number(record.exportCount) || 0) + value;
      }

      await supabase
        .from("UserAnalytics")
        .update({ ...updates, updatedAt: new Date().toISOString() })
        .eq("id", record.id);
    } else {
      await supabase.from("UserAnalytics").insert({
        userId,
        date: todayStr,
        messageCount: type === "message" ? value : 0,
        tokenUsage: type === "token" ? value : 0,
        voiceMinutes: type === "voice" ? value : 0,
        exportCount: type === "export" ? value : 0,
      });
    }
  } catch (error) {
    console.error("Failed to record analytics:", error);
    // Don't throw - analytics recording shouldn't break the main flow
  }
}

/**
 * Get recent activity for a user
 */
export async function getRecentActivity(
  userId: string,
  limit: number = 10,
): Promise<
  { id: string; title: string; createdAt: Date; topic: string | null }[]
> {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from("Chat")
      .select("id, title, createdAt, topic")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(limit);

    return (data || []).map((chat) => ({
      ...chat,
      createdAt: new Date(chat.createdAt),
    }));
  } catch (error) {
    console.error("Failed to get recent activity:", error);
    return [];
  }
}
