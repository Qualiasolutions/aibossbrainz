import "server-only";

import { logger } from "@/lib/logger";

import {
	type BotType,
	ChatSDKError,
	createClient,
	type ExecutiveMemory,
} from "./shared";

// ============================================
// EXECUTIVE MEMORY QUERIES
// ============================================

export async function getExecutiveMemory({
	userId,
}: {
	userId: string;
}): Promise<ExecutiveMemory[]> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("ExecutiveMemory")
			.select("*")
			.eq("userId", userId)
			.order("preferenceScore", { ascending: false });

		if (error) throw error;
		return data || [];
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get executive memory",
		);
	}
}

export async function updateExecutiveMemory({
	userId,
	executive,
	topic,
}: {
	userId: string;
	executive: BotType;
	topic?: string;
}) {
	try {
		const supabase = await createClient();

		// Try RPC function first for atomic operation (avoids race conditions)
		const { error: rpcError } = await supabase.rpc("upsert_executive_memory", {
			p_user_id: userId,
			p_executive: executive,
			p_topic: topic,
		});

		// If RPC succeeds, we're done
		if (!rpcError) return;

		// Fallback to direct query if RPC doesn't exist (42883) or fails
		if (rpcError.code !== "42883") {
			logger.warn(
				{ err: rpcError, userId, executive },
				"ExecutiveMemory RPC failed, using fallback",
			);
		}

		// Optimized fallback: select only needed fields
		const { data: existing } = await supabase
			.from("ExecutiveMemory")
			.select("id, messageCount, topTopics")
			.eq("userId", userId)
			.eq("executive", executive)
			.limit(1)
			.single();

		if (existing) {
			const currentCount = (existing.messageCount as number) || 0;
			const currentTopics = (existing.topTopics as string[]) || [];
			const newTopics = topic
				? [...new Set([...currentTopics, topic])].slice(-10)
				: currentTopics;

			await supabase
				.from("ExecutiveMemory")
				.update({
					messageCount: currentCount + 1,
					topTopics: newTopics,
					lastUsed: new Date().toISOString(),
					preferenceScore: currentCount + 1,
					updatedAt: new Date().toISOString(),
				})
				.eq("id", existing.id);
		} else {
			await supabase.from("ExecutiveMemory").insert({
				userId,
				executive,
				messageCount: 1,
				topTopics: topic ? [topic] : [],
				lastUsed: new Date().toISOString(),
				preferenceScore: 1,
			});
		}
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update executive memory",
		);
	}
}

export async function getExecutiveStats({
	userId,
}: {
	userId: string;
}): Promise<{
	total: number;
	breakdown: { executive: string; count: number; percentage: number }[];
	preferred: string | null;
}> {
	try {
		const memories = await getExecutiveMemory({ userId });
		const total = memories.reduce(
			(sum, m) => sum + ((m.messageCount as number) || 0),
			0,
		);

		const breakdown = memories.map((m) => ({
			executive: m.executive,
			count: (m.messageCount as number) || 0,
			percentage:
				total > 0
					? Math.round((((m.messageCount as number) || 0) / total) * 100)
					: 0,
		}));

		const preferred = memories.length > 0 ? memories[0].executive : null;

		return { total, breakdown, preferred };
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get executive stats",
		);
	}
}
