import "server-only";

import { logger } from "@/lib/logger";

import {
	ChatSDKError,
	type ContentCalendar,
	type ContentCalendarInsert,
	type ContentStatus,
	createClient,
} from "./shared";

// ============================================
// CONTENT CALENDAR QUERIES
// ============================================

// Helper: get untyped Supabase client for ContentCalendar table
// (table not yet in auto-generated database.types.ts — regenerate after migration)
async function getClient() {
	const supabase = await createClient();
	return supabase as any;
}

/**
 * Get posts for a specific month
 */
export async function getContentCalendarByMonth({
	userId,
	year,
	month,
}: {
	userId: string;
	year: number;
	month: number; // 1-12
}): Promise<ContentCalendar[]> {
	try {
		const supabase = await getClient();

		const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
		const lastDay = new Date(year, month, 0).getDate();
		const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

		const { data, error } = await supabase
			.from("ContentCalendar")
			.select("*")
			.eq("userId", userId)
			.is("deletedAt", null)
			.gte("scheduledDate", startDate)
			.lte("scheduledDate", endDate)
			.order("scheduledDate", { ascending: true })
			.order("scheduledTime", { ascending: true });

		if (error) throw error;
		return (data as ContentCalendar[]) || [];
	} catch (error) {
		logger.error(
			{ err: error, userId, year, month },
			"Failed to get content calendar by month",
		);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to fetch content calendar",
		);
	}
}

/**
 * Get posts for a specific date
 */
export async function getContentCalendarByDate({
	userId,
	date,
}: {
	userId: string;
	date: string; // YYYY-MM-DD
}): Promise<ContentCalendar[]> {
	try {
		const supabase = await getClient();

		const { data, error } = await supabase
			.from("ContentCalendar")
			.select("*")
			.eq("userId", userId)
			.eq("scheduledDate", date)
			.is("deletedAt", null)
			.order("scheduledTime", { ascending: true });

		if (error) throw error;
		return (data as ContentCalendar[]) || [];
	} catch (error) {
		logger.error(
			{ err: error, userId, date },
			"Failed to get content calendar by date",
		);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to fetch content calendar for date",
		);
	}
}

/**
 * Batch create multiple posts
 */
export async function createContentCalendarPosts(
	posts: ContentCalendarInsert[],
): Promise<ContentCalendar[]> {
	try {
		const supabase = await getClient();

		const { data, error } = await supabase
			.from("ContentCalendar")
			.insert(posts)
			.select();

		if (error) throw error;
		return (data as ContentCalendar[]) || [];
	} catch (error) {
		logger.error(
			{ err: error, count: posts.length },
			"Failed to batch create content calendar posts",
		);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to create social media posts",
		);
	}
}

/**
 * Update post status
 */
export async function updateContentCalendarStatus({
	postId,
	userId,
	status,
}: {
	postId: string;
	userId: string;
	status: ContentStatus;
}): Promise<void> {
	try {
		const supabase = await getClient();

		const { error } = await supabase
			.from("ContentCalendar")
			.update({ status, updatedAt: new Date().toISOString() })
			.eq("id", postId)
			.eq("userId", userId)
			.is("deletedAt", null);

		if (error) throw error;
	} catch (error) {
		logger.error(
			{ err: error, postId, status },
			"Failed to update content calendar status",
		);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update post status",
		);
	}
}

/**
 * Soft delete a post
 */
export async function deleteContentCalendarPost({
	postId,
	userId,
}: {
	postId: string;
	userId: string;
}): Promise<void> {
	try {
		const supabase = await getClient();

		const { error } = await supabase
			.from("ContentCalendar")
			.update({ deletedAt: new Date().toISOString() })
			.eq("id", postId)
			.eq("userId", userId);

		if (error) throw error;
	} catch (error) {
		logger.error(
			{ err: error, postId },
			"Failed to delete content calendar post",
		);
		throw new ChatSDKError("bad_request:database", "Failed to delete post");
	}
}
