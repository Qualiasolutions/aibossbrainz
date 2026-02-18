import "server-only";

import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/server";

interface AICostRecord {
	userId: string;
	chatId: string;
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
