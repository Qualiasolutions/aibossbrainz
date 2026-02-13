import "server-only";

import {
	type AppUsage,
	ChatSDKError,
	createClient,
	dbRetryOptions,
	type Json,
	type VisibilityType,
	withRetry,
} from "./shared";

// ============================================
// CHAT QUERIES
// ============================================

export async function saveChat({
	id,
	userId,
	title,
	visibility,
}: {
	id: string;
	userId: string;
	title: string;
	visibility: VisibilityType;
}) {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("Chat")
			.insert({
				id,
				createdAt: new Date().toISOString(),
				userId,
				title,
				visibility,
			})
			.select();

		if (error) throw error;
		return data;
	} catch (error) {
		console.error("saveChat error:", error);
		throw new ChatSDKError("bad_request:database", "Failed to save chat");
	}
}

export async function updateChatTitle({
	chatId,
	title,
}: {
	chatId: string;
	title: string;
}) {
	try {
		const supabase = await createClient();
		const { error } = await supabase
			.from("Chat")
			.update({ title })
			.eq("id", chatId);

		if (error) throw error;
	} catch (_error) {
		// Non-critical - title update failure shouldn't break the chat
		console.warn("Failed to update chat title:", chatId);
	}
}

export async function deleteChatById({ id }: { id: string }) {
	try {
		return await withRetry(async () => {
			const supabase = await createClient();
			const deletedAt = new Date().toISOString();

			// Soft delete related records in parallel for better performance
			await Promise.all([
				supabase.from("Vote_v2").update({ deletedAt }).eq("chatId", id),
				supabase.from("Message_v2").update({ deletedAt }).eq("chatId", id),
				supabase.from("Stream").update({ deletedAt }).eq("chatId", id),
			]);

			// Soft delete the chat (after related records to maintain referential integrity)
			const { data, error } = await supabase
				.from("Chat")
				.update({ deletedAt })
				.eq("id", id)
				.select();

			if (error) throw error;
			return data?.[0];
		}, dbRetryOptions);
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to delete chat by id",
		);
	}
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
	try {
		return await withRetry(async () => {
			const supabase = await createClient();
			const deletedAt = new Date().toISOString();

			// Get all chat IDs for this user (only non-deleted)
			const { data: userChats } = await supabase
				.from("Chat")
				.select("id")
				.eq("userId", userId)
				.is("deletedAt", null);

			if (!userChats || userChats.length === 0) {
				return { deletedCount: 0 };
			}

			const chatIds = userChats.map((c) => c.id);

			// Soft delete related records in parallel for better performance
			await Promise.all([
				supabase.from("Vote_v2").update({ deletedAt }).in("chatId", chatIds),
				supabase.from("Message_v2").update({ deletedAt }).in("chatId", chatIds),
				supabase.from("Stream").update({ deletedAt }).in("chatId", chatIds),
			]);

			// Soft delete chats (after related records)
			const { data: deletedChats } = await supabase
				.from("Chat")
				.update({ deletedAt })
				.eq("userId", userId)
				.is("deletedAt", null)
				.select();

			return { deletedCount: deletedChats?.length || 0 };
		}, dbRetryOptions);
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to delete all chats by user id",
		);
	}
}

export async function getChatsByUserId({
	id,
	limit,
	startingAfter,
	endingBefore,
}: {
	id: string;
	limit: number;
	startingAfter: string | null;
	endingBefore: string | null;
}) {
	try {
		const supabase = await createClient();
		const extendedLimit = limit + 1;

		let query = supabase
			.from("Chat")
			.select("*")
			.eq("userId", id)
			.is("deletedAt", null)
			.order("createdAt", { ascending: false })
			.limit(extendedLimit);

		if (startingAfter) {
			const { data: selectedChat } = await supabase
				.from("Chat")
				.select("createdAt")
				.eq("id", startingAfter)
				.single();

			if (!selectedChat) {
				throw new ChatSDKError(
					"not_found:database",
					`Chat with id ${startingAfter} not found`,
				);
			}

			query = query.gt("createdAt", selectedChat.createdAt);
		} else if (endingBefore) {
			const { data: selectedChat } = await supabase
				.from("Chat")
				.select("createdAt")
				.eq("id", endingBefore)
				.single();

			if (!selectedChat) {
				throw new ChatSDKError(
					"not_found:database",
					`Chat with id ${endingBefore} not found`,
				);
			}

			query = query.lt("createdAt", selectedChat.createdAt);
		}

		const { data: filteredChats, error } = await query;

		if (error) throw error;

		const chats = filteredChats || [];
		const hasMore = chats.length > limit;

		return {
			chats: hasMore ? chats.slice(0, limit) : chats,
			hasMore,
		};
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get chats by user id",
		);
	}
}

export async function getChatById({ id }: { id: string }) {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("Chat")
			.select("*")
			.eq("id", id)
			.is("deletedAt", null)
			.single();

		if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
		return data || null;
	} catch (error) {
		console.error("getChatById error:", error);
		throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
	}
}

// ============================================
// CHAT UPDATES
// ============================================

export async function updateChatVisiblityById({
	chatId,
	visibility,
}: {
	chatId: string;
	visibility: "private" | "public";
}) {
	try {
		const supabase = await createClient();
		const { error } = await supabase
			.from("Chat")
			.update({ visibility })
			.eq("id", chatId);

		if (error) throw error;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update chat visibility by id",
		);
	}
}

export async function updateChatLastContextById({
	chatId,
	context,
}: {
	chatId: string;
	context: AppUsage;
}) {
	try {
		const supabase = await createClient();
		// Cast AppUsage to Json - safe because AppUsage is a plain object with JSON-serializable values
		await supabase
			.from("Chat")
			.update({ lastContext: context as unknown as Json })
			.eq("id", chatId);
	} catch (error) {
		console.warn("Failed to update lastContext for chat", chatId, error);
	}
}

export async function updateChatPinStatus({
	chatId,
	isPinned,
}: {
	chatId: string;
	isPinned: boolean;
}) {
	try {
		const supabase = await createClient();
		const { error } = await supabase
			.from("Chat")
			.update({ isPinned })
			.eq("id", chatId);

		if (error) throw error;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update chat pin status",
		);
	}
}

export async function updateChatTopic({
	chatId,
	topic,
	topicColor,
}: {
	chatId: string;
	topic: string | null;
	topicColor: string | null;
}) {
	try {
		const supabase = await createClient();
		const { error } = await supabase
			.from("Chat")
			.update({ topic, topicColor })
			.eq("id", chatId);

		if (error) throw error;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update chat topic",
		);
	}
}

// ============================================
// BATCH STATS QUERIES
// ============================================

export interface ChatStats {
	messageCount: number;
	primaryBot: string;
}

export async function getChatStatsForChats(
	chatIds: string[],
): Promise<Map<string, ChatStats>> {
	const result = new Map<string, ChatStats>();
	if (chatIds.length === 0) return result;

	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("Message_v2")
			.select("chatId, botType")
			.in("chatId", chatIds)
			.is("deletedAt", null);

		if (error) throw error;

		// Group by chatId and count botTypes
		const grouped = new Map<string, Record<string, number>>();
		const counts = new Map<string, number>();

		for (const row of data ?? []) {
			const chatId = row.chatId;
			counts.set(chatId, (counts.get(chatId) || 0) + 1);

			if (!grouped.has(chatId)) grouped.set(chatId, {});
			const botCounts = grouped.get(chatId)!;
			const bot = row.botType || "collaborative";
			botCounts[bot] = (botCounts[bot] || 0) + 1;
		}

		for (const chatId of chatIds) {
			const botCounts = grouped.get(chatId) || {};
			const primaryBot =
				Object.entries(botCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
				"collaborative";
			result.set(chatId, {
				messageCount: counts.get(chatId) || 0,
				primaryBot,
			});
		}

		return result;
	} catch (_error) {
		return result;
	}
}

// ============================================
// ANALYTICS QUERIES
// ============================================

export async function getMessageCountByUserId({
	id,
	differenceInHours,
}: {
	id: string;
	differenceInHours: number;
}) {
	try {
		const supabase = await createClient();
		const cutoffTime = new Date(
			Date.now() - differenceInHours * 60 * 60 * 1000,
		).toISOString();

		// Use RPC function to count messages in a single query (fixes N+1)
		const { data, error } = await supabase.rpc("get_user_message_count", {
			p_user_id: id,
			p_cutoff_time: cutoffTime,
		});

		if (error) throw error;
		return data || 0;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get message count by user id",
		);
	}
}

// ============================================
// STREAM QUERIES
// ============================================

export async function createStreamId({
	streamId,
	chatId,
}: {
	streamId: string;
	chatId: string;
}) {
	try {
		const supabase = await createClient();
		const { error } = await supabase.from("Stream").insert({
			id: streamId,
			chatId,
			createdAt: new Date().toISOString(),
		});

		if (error) throw error;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to create stream id",
		);
	}
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("Stream")
			.select("id")
			.eq("chatId", chatId)
			.is("deletedAt", null)
			.order("createdAt", { ascending: true });

		if (error) throw error;
		return (data || []).map(({ id }) => id);
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get stream ids by chat id",
		);
	}
}
