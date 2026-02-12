import "server-only";

import {
	ChatSDKError,
	createClient,
	type DBMessage,
	dbRetryOptions,
	isJoinedMessage,
	type Json,
	type MessageReaction,
	type ReactionType,
	revalidateTag,
	type Vote,
	withRetry,
} from "./shared";

// ============================================
// MESSAGE QUERIES
// ============================================

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("Message_v2")
			.insert(messages)
			.select();

		if (error) throw error;

		// Invalidate message cache for affected chats
		const chatIds = [...new Set(messages.map((m) => m.chatId))];
		for (const chatId of chatIds) {
			revalidateTag(`chat-${chatId}`);
		}

		return data;
	} catch (_error) {
		throw new ChatSDKError("bad_request:database", "Failed to save messages");
	}
}

// Direct query for messages - unstable_cache removed due to Next.js 15 cookies() restriction
// The cookies() call in createClient() is not allowed inside unstable_cache
export async function getMessagesByChatId({
	id,
	limit,
}: {
	id: string;
	limit?: number;
}) {
	try {
		const supabase = await createClient();

		// Use bounded RPC to avoid fetching all messages for long conversations
		if (limit) {
			const { data, error } = await (supabase.rpc as any)(
				"get_bounded_messages",
				{ p_chat_id: id, p_max_messages: limit },
			);
			if (error) throw error;
			return (data as unknown as DBMessage[]) || [];
		}

		const { data, error } = await supabase
			.from("Message_v2")
			.select("*")
			.eq("chatId", id)
			.is("deletedAt", null)
			.order("createdAt", { ascending: true });

		if (error) throw error;
		return data || [];
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get messages by chat id",
		);
	}
}

export async function getMessageById({ id }: { id: string }) {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("Message_v2")
			.select("*")
			.eq("id", id)
			.is("deletedAt", null);

		if (error) throw error;
		return data || [];
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get message by id",
		);
	}
}

export async function deleteMessagesByChatIdAfterTimestamp({
	chatId,
	timestamp,
}: {
	chatId: string;
	timestamp: Date | string;
}) {
	try {
		return await withRetry(async () => {
			const supabase = await createClient();
			const isoTimestamp =
				typeof timestamp === "string" ? timestamp : timestamp.toISOString();
			const deletedAt = new Date().toISOString();

			// Get messages to soft delete (only non-deleted ones)
			const { data: messagesToDelete } = await supabase
				.from("Message_v2")
				.select("id")
				.eq("chatId", chatId)
				.gte("createdAt", isoTimestamp)
				.is("deletedAt", null);

			const messageIds = messagesToDelete?.map((m) => m.id) || [];

			if (messageIds.length > 0) {
				// Soft delete votes for these messages
				await supabase
					.from("Vote_v2")
					.update({ deletedAt })
					.eq("chatId", chatId)
					.in("messageId", messageIds);

				// Soft delete messages
				return await supabase
					.from("Message_v2")
					.update({ deletedAt })
					.eq("chatId", chatId)
					.in("id", messageIds);
			}
		}, dbRetryOptions);
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to delete messages by chat id after timestamp",
		);
	}
}

// ============================================
// VOTE QUERIES
// ============================================

export async function voteMessage({
	chatId,
	messageId,
	type,
}: {
	chatId: string;
	messageId: string;
	type: "up" | "down";
}) {
	try {
		const supabase = await createClient();

		// Use upsert pattern
		const { error } = await supabase.from("Vote_v2").upsert(
			{
				chatId,
				messageId,
				isUpvoted: type === "up",
			},
			{
				onConflict: "chatId,messageId",
			},
		);

		if (error) throw error;
	} catch (_error) {
		throw new ChatSDKError("bad_request:database", "Failed to vote message");
	}
}

export async function getVotesByChatId({
	id,
}: {
	id: string;
}): Promise<Vote[]> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("Vote_v2")
			.select("*")
			.eq("chatId", id)
			.is("deletedAt", null);

		if (error) throw error;
		return data || [];
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get votes by chat id",
		);
	}
}

// ============================================
// MESSAGE REACTION QUERIES
// ============================================

export async function addMessageReaction({
	messageId,
	userId,
	reactionType,
}: {
	messageId: string;
	userId: string;
	reactionType: ReactionType;
}) {
	try {
		const supabase = await createClient();

		// Insert directly -- unique constraint (messageId, userId, reactionType) prevents duplicates
		const { error } = await supabase.from("MessageReaction").insert({
			messageId,
			userId,
			reactionType,
		});

		// Silently handle unique constraint violations (reaction already exists)
		if (error && error.code === "23505") return;
		if (error) throw error;
	} catch (_error) {
		if (_error instanceof ChatSDKError) throw _error;
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to add message reaction",
		);
	}
}

export async function removeMessageReaction({
	messageId,
	userId,
	reactionType,
}: {
	messageId: string;
	userId: string;
	reactionType?: ReactionType;
}) {
	try {
		const supabase = await createClient();
		let query = supabase
			.from("MessageReaction")
			.delete()
			.eq("messageId", messageId)
			.eq("userId", userId);

		// When reactionType is provided, only remove that specific reaction
		// When omitted, remove all reactions for this user on this message
		if (reactionType) {
			query = query.eq("reactionType", reactionType);
		}

		await query;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to remove message reaction",
		);
	}
}

export async function getMessageReactions({
	messageId,
}: {
	messageId: string;
}): Promise<MessageReaction[]> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("MessageReaction")
			.select("*")
			.eq("messageId", messageId);

		if (error) throw error;
		return data || [];
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get message reactions",
		);
	}
}

export async function getMessageReactionCounts({
	messageId,
}: {
	messageId: string;
}): Promise<Record<string, number>> {
	try {
		const supabase = await createClient();

		// Use SQL GROUP BY instead of fetching all rows and counting in JS
		const { data, error } = await supabase.rpc("get_reaction_counts", {
			p_message_id: messageId,
		});

		if (error) {
			// Fallback to client-side counting if RPC doesn't exist yet
			const reactions = await getMessageReactions({ messageId });
			const counts: Record<string, number> = {};
			for (const r of reactions) {
				counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
			}
			return counts;
		}

		const counts: Record<string, number> = {};
		for (const row of data || []) {
			counts[row.reaction_type] = Number(row.count);
		}
		return counts;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get message reaction counts",
		);
	}
}

export async function getUserReactionForMessage({
	messageId,
	userId,
}: {
	messageId: string;
	userId: string;
}): Promise<MessageReaction[]> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("MessageReaction")
			.select("*")
			.eq("messageId", messageId)
			.eq("userId", userId);

		if (error) throw error;
		return data || [];
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get user reaction for message",
		);
	}
}

// Get all reactions by type for a user with message and chat details
// Uses a single JOIN query instead of 3 sequential queries (fixes N+1)
export async function getUserReactionsByType({
	userId,
	reactionType,
}: {
	userId: string;
	reactionType: ReactionType;
}): Promise<
	{
		id: string;
		messageId: string;
		reactionType: string;
		createdAt: string;
		message: {
			id: string;
			chatId: string;
			parts: Json;
			role: string;
			botType: string | null;
			createdAt: string;
		} | null;
		chat: {
			id: string;
			title: string;
			topic: string | null;
			topicColor: string | null;
		} | null;
	}[]
> {
	try {
		const supabase = await createClient();

		// Single query with JOINs via Supabase's foreign key relationship syntax
		const { data, error } = await supabase
			.from("MessageReaction")
			.select(
				`
        id,
        messageId,
        reactionType,
        createdAt,
        message:Message_v2!messageId (
          id,
          chatId,
          parts,
          role,
          botType,
          createdAt,
          deletedAt,
          chat:Chat!chatId (
            id,
            title,
            topic,
            topicColor,
            deletedAt
          )
        )
      `,
			)
			.eq("userId", userId)
			.eq("reactionType", reactionType)
			.order("createdAt", { ascending: false });

		if (error) throw error;
		if (!data || data.length === 0) return [];

		// Transform to expected format, filtering out soft-deleted messages/chats
		// Uses type guards instead of unsafe `as` assertions for runtime safety
		return data
			.filter((r) => {
				// Validate message structure at runtime
				if (!isJoinedMessage(r.message)) return false;
				const msg = r.message;
				// Exclude if message is deleted or chat is deleted
				if (msg.deletedAt) return false;
				if (msg.chat?.deletedAt) return false;
				return true;
			})
			.map((r) => {
				// Type guard already validated in filter, safe to use
				const msg = isJoinedMessage(r.message) ? r.message : null;

				return {
					id: r.id,
					messageId: r.messageId,
					reactionType: r.reactionType,
					createdAt: r.createdAt || new Date().toISOString(),
					message: msg
						? {
								id: msg.id,
								chatId: msg.chatId,
								parts: msg.parts,
								role: msg.role,
								botType: msg.botType,
								createdAt: msg.createdAt,
							}
						: null,
					chat: msg?.chat
						? {
								id: msg.chat.id,
								title: msg.chat.title,
								topic: msg.chat.topic,
								topicColor: msg.chat.topicColor,
							}
						: null,
				};
			});
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get user reactions by type",
		);
	}
}
