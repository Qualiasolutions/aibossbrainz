import { type NextRequest, NextResponse } from "next/server";
import { apiRequestLogger } from "@/lib/api-logging";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// Tables to purge, ordered children-first to respect FK constraints
const TABLES_IN_ORDER = [
	"SupportTicketMessage",
	"Vote_v2",
	"Stream",
	"Suggestion",
	"Message_v2",
	"ConversationSummary",
	"Document",
	"StrategyCanvas",
	"SupportTicket",
	"Chat",
	"User",
] as const;

const BATCH_SIZE = 500;

export async function GET(request: NextRequest) {
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const log = apiRequestLogger("/api/cron/cleanup-deleted-data");
	log.start();

	const supabase = createServiceClient();
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - 30);
	const cutoffISO = cutoff.toISOString();

	const results: Record<string, number> = {};
	let totalDeleted = 0;

	try {
		for (const table of TABLES_IN_ORDER) {
			let tableDeleted = 0;
			let hasMore = true;

			while (hasMore) {
				const { data, error } = await supabase
					.from(table)
					.delete()
					.lt("deletedAt", cutoffISO)
					.select("id")
					.limit(BATCH_SIZE);

				if (error) {
					// Table may not have deletedAt column — skip gracefully
					if (
						error.message?.includes("column") &&
						error.message?.includes("does not exist")
					) {
						break;
					}
					log.warn(`Error deleting from ${table}: ${error.message}`);
					break;
				}

				const count = data?.length ?? 0;
				tableDeleted += count;
				hasMore = count === BATCH_SIZE;
			}

			if (tableDeleted > 0) {
				results[table] = tableDeleted;
				totalDeleted += tableDeleted;
			}
		}

		log.success({ totalDeleted, tables: results });

		return NextResponse.json({
			success: true,
			totalDeleted,
			tables: results,
			cutoff: cutoffISO,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		log.error(error);
		return NextResponse.json(
			{ error: "Failed to cleanup deleted data" },
			{ status: 500 },
		);
	}
}
