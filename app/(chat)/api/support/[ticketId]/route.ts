import {
	getTicketWithMessages,
	updateTicketStatus,
} from "@/lib/db/support-queries";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient } from "@/lib/supabase/server";
import type { TicketStatus } from "@/lib/supabase/types";

// GET: Get a single ticket with all its messages
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ ticketId: string }> },
) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return new ChatSDKError("unauthorized:api").toResponse();
	}

	try {
		const { ticketId } = await params;
		const result = await getTicketWithMessages({
			ticketId,
			userId: user.id,
		});
		return Response.json(result);
	} catch (error) {
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		logger.error({ err: error }, "Failed to get ticket");
		return new ChatSDKError("bad_request:api").toResponse();
	}
}

// PATCH: Update ticket (users can only close their tickets)
export const PATCH = withCsrf(
	async (
		request: Request,
		context: { params: Promise<{ ticketId: string }> },
	) => {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return new ChatSDKError("unauthorized:api").toResponse();
		}

		try {
			const { ticketId } = await context.params;
			const body = await request.json();
			const { status } = body as { status: TicketStatus };

			// Users can only close tickets
			if (status !== "closed") {
				return new ChatSDKError(
					"bad_request:api",
					"Users can only close tickets",
				).toResponse();
			}

			const ticket = await updateTicketStatus({
				ticketId,
				userId: user.id,
				status,
			});

			return Response.json(ticket);
		} catch (error) {
			if (error instanceof ChatSDKError) {
				return error.toResponse();
			}
			logger.error({ err: error }, "Failed to update ticket");
			return new ChatSDKError("bad_request:api").toResponse();
		}
	},
);
