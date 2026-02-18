import "server-only";

import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Mark a Stripe event as processed using INSERT + unique constraint.
 * Returns `true` if the event is new (proceed with processing).
 * Returns `false` if it was already processed (skip / duplicate).
 */
export async function markEventProcessed(
	eventId: string,
	eventType: string,
	userId: string | null,
): Promise<boolean> {
	const supabase = createServiceClient();

	// NOTE: Table not yet in database.types.ts — cast needed until `pnpm gen:types`
	// is run after applying migration 20260218000200_webhook_reliability.sql
	// biome-ignore lint/suspicious/noExplicitAny: table not yet in generated types
	const { error } = await (supabase as any)
		.from("StripeWebhookEvent")
		.insert({
			eventId,
			eventType,
			userId,
			processedAt: new Date().toISOString(),
		});

	if (!error) {
		return true;
	}

	// 23505 = unique_violation (event already exists)
	if (error.code === "23505") {
		logger.info(
			{ eventId, eventType },
			"Duplicate Stripe event detected, skipping",
		);
		return false;
	}

	// Unexpected error — throw so the webhook returns 500 and Stripe retries
	logger.error(
		{ err: error, eventId, eventType },
		"Failed to record webhook event",
	);
	throw new Error(`Failed to record webhook event: ${error.message}`);
}
