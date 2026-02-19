import "server-only";

import { logger } from "@/lib/logger";

import {
	type CanvasType,
	ChatSDKError,
	type ConversationSummary,
	createClient,
	type Json,
	type StrategyCanvas,
} from "./shared";

// ============================================
// STRATEGY CANVAS QUERIES
// ============================================

export async function getStrategyCanvas({
	userId,
	canvasType,
	canvasId,
}: {
	userId: string;
	canvasType?: CanvasType;
	canvasId?: string;
}): Promise<StrategyCanvas | null> {
	try {
		const supabase = await createClient();

		if (canvasId) {
			const { data, error } = await supabase
				.from("StrategyCanvas")
				.select("*")
				.eq("id", canvasId)
				.eq("userId", userId)
				.is("deletedAt", null)
				.single();

			if (error && error.code !== "PGRST116") throw error;
			return data || null;
		}

		// Get default canvas for type
		if (!canvasType) {
			return null;
		}

		const { data, error } = await supabase
			.from("StrategyCanvas")
			.select("*")
			.eq("userId", userId)
			.eq("canvasType", canvasType)
			.eq("isDefault", true)
			.is("deletedAt", null)
			.single();

		if (error && error.code !== "PGRST116") throw error;
		return data || null;
	} catch (error) {
		logger.error({ err: error }, "Failed to get strategy canvas");
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get strategy canvas",
		);
	}
}

export async function getAllUserCanvases({
	userId,
}: {
	userId: string;
}): Promise<StrategyCanvas[]> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("StrategyCanvas")
			.select("*")
			.eq("userId", userId)
			.is("deletedAt", null)
			.order("updatedAt", { ascending: false });

		if (error) throw error;
		return data || [];
	} catch (error) {
		logger.error({ err: error }, "Failed to get user canvases");
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get user canvases",
		);
	}
}

export async function saveStrategyCanvas({
	userId,
	canvasType,
	name,
	data,
	canvasId,
	isDefault = true,
}: {
	userId: string;
	canvasType: CanvasType;
	name?: string;
	data: Json;
	canvasId?: string;
	isDefault?: boolean;
}): Promise<string | null> {
	try {
		const supabase = await createClient();

		// If setting as default, unset other defaults first
		if (isDefault) {
			await supabase
				.from("StrategyCanvas")
				.update({ isDefault: false })
				.eq("userId", userId)
				.eq("canvasType", canvasType);
		}

		if (canvasId) {
			// Update existing
			const { error } = await supabase
				.from("StrategyCanvas")
				.update({
					data,
					name,
					isDefault,
					updatedAt: new Date().toISOString(),
				})
				.eq("id", canvasId)
				.eq("userId", userId);

			if (error) throw error;
			return canvasId;
		}

		// Create new
		const { data: newCanvas, error } = await supabase
			.from("StrategyCanvas")
			.insert({
				userId,
				canvasType,
				name:
					name ||
					`${canvasType.toUpperCase()} - ${new Date().toLocaleDateString()}`,
				data,
				isDefault,
			})
			.select("id")
			.single();

		if (error) throw error;
		return newCanvas?.id || null;
	} catch (error) {
		logger.error({ err: error }, "Failed to save strategy canvas");
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to save strategy canvas",
		);
	}
}

export async function deleteStrategyCanvas({
	userId,
	canvasId,
}: {
	userId: string;
	canvasId: string;
}) {
	try {
		const supabase = await createClient();
		const { error } = await supabase
			.from("StrategyCanvas")
			.update({ deletedAt: new Date().toISOString() })
			.eq("id", canvasId)
			.eq("userId", userId);

		if (error) throw error;
	} catch (error) {
		logger.error({ err: error }, "Failed to delete strategy canvas");
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to delete strategy canvas",
		);
	}
}

// ============================================
// CONVERSATION SUMMARY QUERIES
// ============================================

export async function saveConversationSummary({
	userId,
	chatId,
	summary,
	topics,
	keyInsights,
	importance = 5,
}: {
	userId: string;
	chatId: string;
	summary: string;
	topics: string[];
	keyInsights?: Json;
	importance?: number;
}) {
	try {
		const supabase = await createClient();
		const { error } = await supabase.from("ConversationSummary").insert({
			userId,
			chatId,
			summary,
			topics,
			keyInsights: keyInsights || [],
			importance,
		});

		if (error) throw error;
	} catch (error) {
		logger.error({ err: error }, "Failed to save conversation summary");
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to save conversation summary",
		);
	}
}

export async function getRecentConversationSummaries({
	userId,
	limit = 3,
}: {
	userId: string;
	limit?: number;
}): Promise<ConversationSummary[]> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("ConversationSummary")
			.select("*")
			.eq("userId", userId)
			.is("deletedAt", null)
			.order("createdAt", { ascending: false })
			.limit(limit);

		if (error) throw error;
		return data || [];
	} catch (error) {
		logger.error({ err: error }, "Failed to get recent summaries");
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get recent summaries",
		);
	}
}

export async function getRelevantConversationHistory({
	userId,
	topics,
	limit = 5,
}: {
	userId: string;
	topics?: string[];
	limit?: number;
}): Promise<ConversationSummary[]> {
	try {
		const supabase = await createClient();

		let query = supabase
			.from("ConversationSummary")
			.select("*")
			.eq("userId", userId)
			.is("deletedAt", null)
			.order("importance", { ascending: false })
			.order("createdAt", { ascending: false })
			.limit(limit);

		// Topic filtering using array overlap if topics provided
		if (topics && topics.length > 0) {
			query = query.overlaps("topics", topics);
		}

		const { data, error } = await query;
		if (error) throw error;
		return data || [];
	} catch (error) {
		logger.error({ err: error }, "Failed to get conversation history");
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get conversation history",
		);
	}
}
