import "server-only";

import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/server";

interface AICostRecord {
	userId: string | null;
	chatId: string | null;
	modelId: string;
	inputTokens: number;
	outputTokens: number;
	costUSD: number;
}

/**
 * Record an AI cost entry for a single chat response.
 * Non-blocking: logs a warning on failure but never throws.
 * Designed to be called inside after() so it doesn't block the response.
 */
export async function recordAICost(record: AICostRecord): Promise<void> {
	try {
		const supabase = createServiceClient();
		// biome-ignore lint: AICostLog not in generated types until pnpm gen:types
		const { error } = await (supabase.from as any)("AICostLog").insert({
			userId: record.userId,
			chatId: record.chatId,
			modelId: record.modelId,
			inputTokens: record.inputTokens,
			outputTokens: record.outputTokens,
			costUSD: record.costUSD,
			createdAt: new Date().toISOString(),
		});

		if (error) {
			logger.warn(
				{ err: error, userId: record.userId },
				"Failed to record AI cost (DB error)",
			);
			return;
		}

		logger.debug(
			{
				userId: record.userId,
				modelId: record.modelId,
				inputTokens: record.inputTokens,
				outputTokens: record.outputTokens,
				costUSD: record.costUSD,
			},
			"AI cost recorded",
		);
	} catch (err) {
		logger.warn({ err }, "Failed to record AI cost (non-blocking)");
	}
}

interface DailyCostTotal {
	totalCostUSD: number;
	totalInputTokens: number;
	totalOutputTokens: number;
	uniqueUsers: number;
	requestCount: number;
}

/**
 * Get the total AI cost for a single date (defaults to today).
 */
export async function getDailyAICostTotal(
	date?: Date,
): Promise<DailyCostTotal> {
	const targetDate = date ?? new Date();
	const dateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

	const supabase = createServiceClient();
	// biome-ignore lint: AICostLog not in generated types until pnpm gen:types
	const { data, error } = (await (supabase.from as any)("AICostLog")
		.select("userId, inputTokens, outputTokens, costUSD")
		.gte("createdAt", `${dateStr}T00:00:00.000Z`)
		.lt("createdAt", `${dateStr}T23:59:59.999Z`)) as {
		data: Array<{
			userId: string;
			inputTokens: number;
			outputTokens: number;
			costUSD: number;
		}> | null;
		error: any;
	};

	if (error) {
		logger.error({ err: error }, "Failed to query daily AI cost");
		throw error;
	}

	const rows = data ?? [];
	const uniqueUserIds = new Set(rows.map((r) => r.userId));

	return {
		totalCostUSD: rows.reduce((sum, r) => sum + Number(r.costUSD ?? 0), 0),
		totalInputTokens: rows.reduce((sum, r) => sum + (r.inputTokens ?? 0), 0),
		totalOutputTokens: rows.reduce((sum, r) => sum + (r.outputTokens ?? 0), 0),
		uniqueUsers: uniqueUserIds.size,
		requestCount: rows.length,
	};
}

interface MonthlyCostSummary extends DailyCostTotal {
	byModel: Array<{
		modelId: string;
		totalCostUSD: number;
		requestCount: number;
	}>;
}

/**
 * Get aggregated AI cost data for a given month.
 * Returns totals plus per-model breakdown.
 */
export async function getMonthlyCostSummary(
	year: number,
	month: number,
): Promise<MonthlyCostSummary> {
	// Build month date range
	const startDate = new Date(Date.UTC(year, month - 1, 1));
	const endDate = new Date(Date.UTC(year, month, 1)); // First day of next month

	const supabase = createServiceClient();
	// biome-ignore lint: AICostLog not in generated types until pnpm gen:types
	const { data, error } = (await (supabase.from as any)("AICostLog")
		.select("userId, modelId, inputTokens, outputTokens, costUSD")
		.gte("createdAt", startDate.toISOString())
		.lt("createdAt", endDate.toISOString())) as {
		data: Array<{
			userId: string;
			modelId: string;
			inputTokens: number;
			outputTokens: number;
			costUSD: number;
		}> | null;
		error: any;
	};

	if (error) {
		logger.error(
			{ err: error, year, month },
			"Failed to query monthly AI cost",
		);
		throw error;
	}

	const rows = data ?? [];
	const uniqueUserIds = new Set(rows.map((r) => r.userId));

	// Per-model breakdown
	const modelMap = new Map<
		string,
		{ totalCostUSD: number; requestCount: number }
	>();
	for (const row of rows) {
		const existing = modelMap.get(row.modelId) ?? {
			totalCostUSD: 0,
			requestCount: 0,
		};
		existing.totalCostUSD += Number(row.costUSD ?? 0);
		existing.requestCount += 1;
		modelMap.set(row.modelId, existing);
	}

	const byModel = Array.from(modelMap.entries()).map(([modelId, stats]) => ({
		modelId,
		...stats,
	}));

	return {
		totalCostUSD: rows.reduce((sum, r) => sum + Number(r.costUSD ?? 0), 0),
		totalInputTokens: rows.reduce((sum, r) => sum + (r.inputTokens ?? 0), 0),
		totalOutputTokens: rows.reduce((sum, r) => sum + (r.outputTokens ?? 0), 0),
		uniqueUsers: uniqueUserIds.size,
		requestCount: rows.length,
		byModel,
	};
}

interface UserDailyCost {
	userId: string;
	totalCostUSD: number;
	requestCount: number;
	totalInputTokens: number;
	totalOutputTokens: number;
}

/**
 * Get the total AI cost for a specific user on a specific date (defaults to today).
 */
export async function getUserDailyCost(
	userId: string,
	date?: Date,
): Promise<UserDailyCost> {
	const targetDate = date ?? new Date();
	const dateStr = targetDate.toISOString().split("T")[0];

	const supabase = createServiceClient();
	// biome-ignore lint: AICostLog not in generated types until pnpm gen:types
	const { data, error } = (await (supabase.from as any)("AICostLog")
		.select("inputTokens, outputTokens, costUSD")
		.eq("userId", userId)
		.gte("createdAt", `${dateStr}T00:00:00.000Z`)
		.lt("createdAt", `${dateStr}T23:59:59.999Z`)) as {
		data: Array<{
			inputTokens: number;
			outputTokens: number;
			costUSD: number;
		}> | null;
		error: any;
	};

	if (error) {
		logger.error(
			{ err: error, userId },
			"Failed to query user daily AI cost",
		);
		throw error;
	}

	const rows = data ?? [];
	return {
		userId,
		totalCostUSD: rows.reduce((sum, r) => sum + Number(r.costUSD ?? 0), 0),
		requestCount: rows.length,
		totalInputTokens: rows.reduce((sum, r) => sum + (r.inputTokens ?? 0), 0),
		totalOutputTokens: rows.reduce((sum, r) => sum + (r.outputTokens ?? 0), 0),
	};
}

/**
 * Get the top users by daily cost, sorted descending.
 * Used by the cost-check cron to detect per-user spending anomalies.
 */
export async function getTopUserCosts(
	date?: Date,
	limit = 20,
): Promise<UserDailyCost[]> {
	const targetDate = date ?? new Date();
	const dateStr = targetDate.toISOString().split("T")[0];

	const supabase = createServiceClient();
	// biome-ignore lint: AICostLog not in generated types until pnpm gen:types
	const { data, error } = (await (supabase.from as any)("AICostLog")
		.select("userId, inputTokens, outputTokens, costUSD")
		.not("userId", "is", null)
		.gte("createdAt", `${dateStr}T00:00:00.000Z`)
		.lt("createdAt", `${dateStr}T23:59:59.999Z`)) as {
		data: Array<{
			userId: string;
			inputTokens: number;
			outputTokens: number;
			costUSD: number;
		}> | null;
		error: any;
	};

	if (error) {
		logger.error({ err: error }, "Failed to query top user costs");
		throw error;
	}

	const rows = data ?? [];

	// Aggregate per user
	const userMap = new Map<
		string,
		{ totalCostUSD: number; requestCount: number; totalInputTokens: number; totalOutputTokens: number }
	>();
	for (const row of rows) {
		const existing = userMap.get(row.userId) ?? {
			totalCostUSD: 0,
			requestCount: 0,
			totalInputTokens: 0,
			totalOutputTokens: 0,
		};
		existing.totalCostUSD += Number(row.costUSD ?? 0);
		existing.requestCount += 1;
		existing.totalInputTokens += row.inputTokens ?? 0;
		existing.totalOutputTokens += row.outputTokens ?? 0;
		userMap.set(row.userId, existing);
	}

	// Sort by cost descending and take top N
	return Array.from(userMap.entries())
		.map(([userId, stats]) => ({ userId, ...stats }))
		.sort((a, b) => b.totalCostUSD - a.totalCostUSD)
		.slice(0, limit);
}
