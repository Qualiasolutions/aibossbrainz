import { z } from "zod";
import { createSupportTicket, getUserTickets } from "@/lib/db/support-queries";
import { sendTicketNotificationEmail } from "@/lib/email/support-notifications";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient } from "@/lib/supabase/server";

const ticketSchema = z.object({
	subject: z.string().min(1).max(200),
	message: z.string().min(1).max(10000),
	category: z
		.enum(["bug", "feature", "billing", "account", "general"])
		.optional(),
});

// GET: List user's support tickets
export async function GET() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return new ChatSDKError("unauthorized:api").toResponse();
	}

	try {
		const tickets = await getUserTickets({ userId: user.id });
		return Response.json(tickets);
	} catch (error) {
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		logger.error({ err: error }, "Failed to get support tickets");
		return new ChatSDKError("bad_request:api").toResponse();
	}
}

// POST: Create a new support ticket
export const POST = withCsrf(async (request: Request) => {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return new ChatSDKError("unauthorized:api").toResponse();
	}

	try {
		const body = await request.json();
		const parsed = ticketSchema.safeParse(body);
		if (!parsed.success) {
			return Response.json({ error: parsed.error.flatten() }, { status: 400 });
		}

		const { subject, message, category } = parsed.data;

		// Create the ticket
		const ticket = await createSupportTicket({
			userId: user.id,
			subject: subject.trim(),
			initialMessage: message.trim(),
			category,
		});

		// Send email notification (fire-and-forget)
		sendTicketNotificationEmail({
			ticketId: ticket.id,
			subject: ticket.subject,
			message: message.trim(),
			userEmail: user.email || "unknown",
		}).catch((err) => {
			logger.error({ err }, "Failed to send ticket notification email");
		});

		return Response.json(ticket, { status: 201 });
	} catch (error) {
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		logger.error({ err: error }, "Failed to create support ticket");
		return new ChatSDKError("bad_request:api").toResponse();
	}
});
