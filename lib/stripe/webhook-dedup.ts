import "server-only";

import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Check if a Stripe event should be processed, using the process_webhook_event
 * RPC which combines dedup + per-user advisory locking atomically.
 *
 * Returns `true` if the event is new (proceed with processing).
 * Returns `false` if it was already processed (skip / duplicate).
 * Throws on unexpected errors so the webhook returns 500 and Stripe retries.
 */
export async function shouldProcessEvent(
	eventId: string,
	eventType: string,
	userId: string | null,
): Promise<boolean> {
	const supabase = createServiceClient();

	try {
		// biome-ignore lint/suspicious/noExplicitAny: RPC not yet in generated types
		const { data, error } = await (supabase as any).rpc(
			"process_webhook_event",
			{
				event_id: eventId,
				event_type: eventType,
				user_id: userId,
			},
		);

		if (error) {
			logger.error(
				{ eventId, eventType, userId, error },
				"Failed to check event processing via RPC",
			);
			throw error;
		}

		const isNew = data as boolean;
		if (!isNew) {
			logger.info(
				{ eventId, eventType, userId },
				"Duplicate event detected, skipping",
			);
		}

		return isNew;
	} catch (error) {
		logger.error(
			{ eventId, eventType, userId, error },
			"Error in shouldProcessEvent",
		);
		throw error;
	}
}

/**
 * Persist a failed webhook event to the WebhookDeadLetter table for
 * inspection and potential replay. Isolated error handling ensures
 * dead-letter persistence failures don't crash the webhook.
 */
export async function persistFailedEvent(
	eventId: string,
	eventType: string,
	userId: string | null,
	error: Error,
	webhookPayload?: unknown,
): Promise<void> {
	const supabase = createServiceClient();

	try {
		// biome-ignore lint/suspicious/noExplicitAny: table not yet in generated types
		await (supabase as any).from("WebhookDeadLetter").insert({
			eventId,
			eventType,
			userId,
			errorMessage: error.message,
			stackTrace: error.stack ?? null,
			webhookPayload: webhookPayload ?? null,
			createdAt: new Date().toISOString(),
		});

		logger.info(
			{ eventId, eventType, userId },
			"Failed event persisted to dead-letter queue",
		);
	} catch (deadLetterError) {
		// Don't let dead-letter persistence failure crash the webhook
		logger.error(
			{ eventId, eventType, userId, deadLetterError },
			"Failed to persist event to dead-letter queue",
		);
	}
}
