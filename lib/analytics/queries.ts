import "server-only";

import { logger } from "@/lib/logger";
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
		const { data: summaryData } = (await (
			supabase.rpc as unknown as (
				...args: unknown[]
			) => Promise<{ data: unknown }>
		)("get_user_analytics_summary", {
			p_user_id: userId,
			p_start_date: startDate.toISOString(),
			p_end_date: endDate.toISOString(),
		})) as {
			data: Array<{ chat_count: number; message_count: number }> | null;
		};

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
		logger.error({ err: error, userId }, "Failed to get analytics summary");
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

		// Single RPC call replaces 2 queries + client-side grouping
		const { data } = (await (
			supabase.rpc as unknown as (
				...args: unknown[]
			) => Promise<{ data: unknown }>
		)("get_daily_analytics", {
			p_user_id: userId,
			p_start_date: startDate.toISOString(),
			p_end_date: endDate.toISOString(),
		})) as {
			data: Array<{
				day: string;
				message_count: number;
				chat_count: number;
			}> | null;
		};

		return (data || []).map((row) => ({
			date: row.day,
			messageCount: Number(row.message_count) || 0,
			tokenUsage: 0,
			chatCount: Number(row.chat_count) || 0,
		}));
	} catch (error) {
		logger.error({ err: error, userId }, "Failed to get daily analytics");
		return [];
	}
}

/**
 * Get topic breakdown for the user.
 * Tries RPC first (single GROUP BY query), falls back to client-side grouping.
 */
export async function getTopicBreakdown(
	userId: string,
	startDate: Date,
	endDate: Date,
): Promise<TopicBreakdown[]> {
	try {
		const supabase = await createClient();

		// Try RPC first
		const { data: rpcData, error } = (await (
			supabase.rpc as unknown as (
				...args: unknown[]
			) => Promise<{ data: unknown; error: unknown }>
		)("get_topic_breakdown", {
			p_user_id: userId,
			p_start_date: startDate.toISOString(),
			p_end_date: endDate.toISOString(),
		})) as {
			data: Array<{
				topic: string;
				color: string | null;
				count: number;
			}> | null;
			error: { code?: string } | null;
		};

		if (!error && rpcData) {
			return rpcData.map((row) => ({
				topic: row.topic === "Uncategorized" ? null : row.topic,
				count: Number(row.count),
				color: row.color,
			}));
		}

		// Fallback: client-side grouping
		const { data: chats } = await supabase
			.from("Chat")
			.select("topic, topicColor")
			.eq("userId", userId)
			.is("deletedAt", null)
			.gte("createdAt", startDate.toISOString())
			.lte("createdAt", endDate.toISOString());

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

		return Array.from(topicCounts.entries())
			.map(([topic, data]) => ({
				topic: topic === "Uncategorized" ? null : topic,
				count: data.count,
				color: data.color,
			}))
			.sort((a, b) => b.count - a.count);
	} catch (error) {
		logger.error({ err: error, userId }, "Failed to get topic breakdown");
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

		// Atomic upsert via RPC — avoids read-modify-write race condition
		await (
			supabase.rpc as unknown as (
				...args: unknown[]
			) => Promise<{ error: unknown }>
		)("record_user_analytics", {
			p_user_id: userId,
			p_date: todayStr,
			p_message_count: type === "message" ? value : 0,
			p_token_usage: type === "token" ? value : 0,
			p_voice_minutes: type === "voice" ? value : 0,
			p_export_count: type === "export" ? value : 0,
		});
	} catch (error) {
		logger.error(
			{ err: error, userId, type, value },
			"Failed to record analytics",
		);
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
			.is("deletedAt", null)
			.order("createdAt", { ascending: false })
			.limit(limit);

		return (data || []).map((chat) => ({
			...chat,
			createdAt: new Date(chat.createdAt),
		}));
	} catch (error) {
		logger.error({ err: error, userId }, "Failed to get recent activity");
		return [];
	}
}
