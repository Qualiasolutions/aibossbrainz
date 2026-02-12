import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import type { ArtifactKind } from "@/components/artifact";
import { ChatSDKError } from "../../errors";
import { withRetry } from "../../resilience";
import { createClient, createServiceClient } from "../../supabase/server";
import type {
	BotType,
	CanvasType,
	Chat,
	ConversationSummary,
	DBMessage,
	Document,
	ExecutiveMemory,
	Json,
	MessageReaction,
	ReactionType,
	StrategyCanvas,
	Suggestion,
	User,
	VisibilityType,
	Vote,
} from "../../supabase/types";
import type { AppUsage } from "../../usage";

// Database-specific retry options for transient failures
export const dbRetryOptions = {
	maxRetries: 3,
	initialDelay: 500,
	maxDelay: 5000,
	backoffMultiplier: 2,
	retryableErrors: (error: unknown) => {
		if (error instanceof Error) {
			const message = error.message.toLowerCase();
			return (
				message.includes("network") ||
				message.includes("timeout") ||
				message.includes("connection") ||
				message.includes("econnreset") ||
				message.includes("econnrefused") ||
				message.includes("pgrst") ||
				message.includes("socket")
			);
		}
		return false;
	},
};

// ============================================
// TYPE GUARDS FOR JOIN QUERY RESULTS
// ============================================

export interface JoinedChat {
	id: string;
	title: string;
	topic: string | null;
	topicColor: string | null;
	deletedAt: string | null;
}

export interface JoinedMessage {
	id: string;
	chatId: string;
	parts: Json;
	role: string;
	botType: string | null;
	createdAt: string;
	deletedAt: string | null;
	chat: JoinedChat | null;
}

export function isJoinedChat(obj: unknown): obj is JoinedChat {
	if (obj === null || typeof obj !== "object") return false;
	const chat = obj as Record<string, unknown>;
	return (
		typeof chat.id === "string" &&
		typeof chat.title === "string" &&
		(chat.topic === null || typeof chat.topic === "string") &&
		(chat.topicColor === null || typeof chat.topicColor === "string")
	);
}

export function isJoinedMessage(obj: unknown): obj is JoinedMessage {
	if (obj === null || typeof obj !== "object") return false;
	const msg = obj as Record<string, unknown>;
	return (
		typeof msg.id === "string" &&
		typeof msg.chatId === "string" &&
		msg.parts !== undefined &&
		typeof msg.role === "string" &&
		(msg.botType === null || typeof msg.botType === "string") &&
		typeof msg.createdAt === "string" &&
		(msg.chat === null || isJoinedChat(msg.chat))
	);
}

// Re-export utilities for domain modules
export {
	revalidateTag,
	unstable_cache,
	ChatSDKError,
	withRetry,
	createClient,
	createServiceClient,
};

// Re-export types
export type {
	ArtifactKind,
	AppUsage,
	BotType,
	CanvasType,
	Chat,
	ConversationSummary,
	DBMessage,
	Document,
	ExecutiveMemory,
	Json,
	MessageReaction,
	ReactionType,
	StrategyCanvas,
	Suggestion,
	User,
	VisibilityType,
	Vote,
};
