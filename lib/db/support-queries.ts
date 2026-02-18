import "server-only";
import { ChatSDKError } from "../errors";
import { logger } from "../logger";
import { createClient, createServiceClient } from "../supabase/server";
import type {
	SupportTicket,
	SupportTicketMessage,
	TicketCategory,
	TicketPriority,
	TicketStatus,
	User,
} from "../supabase/types";

// ============================================
// USER TICKET QUERIES (use regular client with RLS)
// ============================================

export async function getUserTickets({
	userId,
}: {
	userId: string;
}): Promise<SupportTicket[]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("SupportTicket")
		.select("*")
		.eq("userId", userId)
		.is("deletedAt", null)
		.order("updatedAt", { ascending: false });

	if (error) {
		logger.error({ err: error, userId }, "Failed to get user tickets");
		throw new ChatSDKError("bad_request:database", "Failed to get tickets");
	}

	return (data || []) as SupportTicket[];
}

export async function createSupportTicket({
	userId,
	subject,
	initialMessage,
	category,
}: {
	userId: string;
	subject: string;
	initialMessage: string;
	category?: TicketCategory;
}): Promise<SupportTicket> {
	const supabase = await createClient();

	// Create ticket
	const { data: ticket, error: ticketError } = await supabase
		.from("SupportTicket")
		.insert({
			userId,
			subject,
			category: category || null,
		})
		.select()
		.single();

	if (ticketError || !ticket) {
		logger.error({ err: ticketError, userId }, "Failed to create support ticket");
		throw new ChatSDKError("bad_request:database", "Failed to create ticket");
	}

	// Create initial message
	const { error: msgError } = await supabase
		.from("SupportTicketMessage")
		.insert({
			ticketId: ticket.id,
			senderId: userId,
			content: initialMessage,
			isAdminReply: false,
			isInternal: false,
		});

	if (msgError) {
		logger.error({ err: msgError, ticketId: ticket.id }, "Failed to create initial ticket message");
		throw new ChatSDKError("bad_request:database", "Failed to create message");
	}

	return ticket as SupportTicket;
}

export async function getTicketWithMessages({
	ticketId,
	userId,
}: {
	ticketId: string;
	userId: string;
}): Promise<{
	ticket: SupportTicket;
	messages: SupportTicketMessage[];
}> {
	const supabase = await createClient();

	// Get ticket (RLS ensures user owns it)
	const { data: ticket, error: ticketError } = await supabase
		.from("SupportTicket")
		.select("*")
		.eq("id", ticketId)
		.is("deletedAt", null)
		.single();

	if (ticketError || !ticket) {
		throw new ChatSDKError("not_found:api", "Ticket not found");
	}

	// Verify ownership
	if (ticket.userId !== userId) {
		throw new ChatSDKError(
			"forbidden:api",
			"Not authorized to view this ticket",
		);
	}

	// Get messages (RLS filters out internal notes automatically)
	const { data: messages, error: msgError } = await supabase
		.from("SupportTicketMessage")
		.select("*")
		.eq("ticketId", ticketId)
		.is("deletedAt", null)
		.order("createdAt", { ascending: true });

	if (msgError) {
		logger.error({ err: msgError, ticketId }, "Failed to get ticket messages");
		throw new ChatSDKError("bad_request:database", "Failed to get messages");
	}

	return {
		ticket: ticket as SupportTicket,
		messages: (messages || []) as SupportTicketMessage[],
	};
}

export async function addMessageToTicket({
	ticketId,
	userId,
	content,
}: {
	ticketId: string;
	userId: string;
	content: string;
}): Promise<SupportTicketMessage> {
	const supabase = await createClient();

	// Verify ticket ownership and status
	const { data: ticket, error: ticketErr } = await supabase
		.from("SupportTicket")
		.select("userId, status")
		.eq("id", ticketId)
		.single();

	if (ticketErr || !ticket) {
		throw new ChatSDKError("not_found:api", "Ticket not found");
	}

	if (ticket.userId !== userId) {
		throw new ChatSDKError("forbidden:api", "Not authorized");
	}

	if (ticket.status === "closed") {
		throw new ChatSDKError(
			"bad_request:api",
			"Cannot add messages to closed ticket",
		);
	}

	// Insert message
	const { data: message, error } = await supabase
		.from("SupportTicketMessage")
		.insert({
			ticketId,
			senderId: userId,
			content,
			isAdminReply: false,
			isInternal: false,
		})
		.select()
		.single();

	if (error || !message) {
		logger.error({ err: error, ticketId }, "Failed to add message to ticket");
		throw new ChatSDKError("bad_request:database", "Failed to add message");
	}

	// Update ticket timestamp
	await supabase
		.from("SupportTicket")
		.update({ updatedAt: new Date().toISOString() })
		.eq("id", ticketId);

	return message as SupportTicketMessage;
}

export async function updateTicketStatus({
	ticketId,
	userId,
	status,
}: {
	ticketId: string;
	userId: string;
	status: TicketStatus;
}): Promise<SupportTicket> {
	const supabase = await createClient();

	// Only allow users to close their own tickets
	if (status !== "closed") {
		throw new ChatSDKError("bad_request:api", "Users can only close tickets");
	}

	const { data: ticket, error } = await supabase
		.from("SupportTicket")
		.update({
			status,
			updatedAt: new Date().toISOString(),
		})
		.eq("id", ticketId)
		.eq("userId", userId)
		.select()
		.single();

	if (error || !ticket) {
		throw new ChatSDKError("bad_request:database", "Failed to update ticket");
	}

	return ticket as SupportTicket;
}

// ============================================
// ADMIN TICKET QUERIES (use service client to bypass RLS)
// ============================================

export type AdminTicketWithUser = SupportTicket & {
	userEmail: string;
	userDisplayName: string | null;
	messageCount: number;
};

export async function getAllTicketsAdmin({
	status,
	assignedAdminId,
	limit = 100,
}: {
	status?: TicketStatus;
	assignedAdminId?: string;
	limit?: number;
} = {}): Promise<AdminTicketWithUser[]> {
	const supabase = createServiceClient();

	let query = supabase
		.from("SupportTicket")
		.select("*")
		.is("deletedAt", null)
		.order("createdAt", { ascending: false })
		.limit(limit);

	if (status) query = query.eq("status", status);
	if (assignedAdminId) query = query.eq("assignedAdminId", assignedAdminId);

	const { data: tickets, error } = await query;

	if (error) {
		logger.error({ err: error }, "Failed to get admin tickets");
		throw new ChatSDKError("bad_request:database", "Failed to get tickets");
	}

	if (!tickets || tickets.length === 0) {
		return [];
	}

	// Batch fetch user info and message counts (2 queries instead of 2N)
	const userIds = [...new Set(tickets.map((t) => t.userId))];
	const ticketIds = tickets.map((t) => t.id);

	const [usersResult, messagesResult] = await Promise.all([
		supabase.from("User").select("id, email, displayName").in("id", userIds),
		supabase
			.from("SupportTicketMessage")
			.select("ticketId")
			.in("ticketId", ticketIds)
			.is("deletedAt", null),
	]);

	const userMap = new Map((usersResult.data ?? []).map((u) => [u.id, u]));
	const msgCountMap = new Map<string, number>();
	for (const msg of messagesResult.data ?? []) {
		msgCountMap.set(msg.ticketId, (msgCountMap.get(msg.ticketId) || 0) + 1);
	}

	return tickets.map((ticket) => {
		const user = userMap.get(ticket.userId);
		return {
			...ticket,
			userEmail: user?.email || "Unknown",
			userDisplayName: user?.displayName || null,
			messageCount: msgCountMap.get(ticket.id) || 0,
		} as AdminTicketWithUser;
	});
}

export type AdminTicketDetail = {
	ticket: SupportTicket;
	user: Pick<User, "id" | "email" | "displayName" | "companyName"> | null;
	messages: SupportTicketMessage[];
};

export async function getTicketWithMessagesAdmin({
	ticketId,
}: {
	ticketId: string;
}): Promise<AdminTicketDetail | null> {
	const supabase = createServiceClient();

	const { data: ticket, error: ticketError } = await supabase
		.from("SupportTicket")
		.select("*")
		.eq("id", ticketId)
		.single();

	if (ticketError || !ticket) {
		return null;
	}

	// Fetch user info and messages in parallel (both only depend on ticket)
	const [{ data: user }, { data: messages }] = await Promise.all([
		supabase
			.from("User")
			.select("id, email, displayName, companyName")
			.eq("id", ticket.userId)
			.single(),
		supabase
			.from("SupportTicketMessage")
			.select("*")
			.eq("ticketId", ticketId)
			.is("deletedAt", null)
			.order("createdAt", { ascending: true }),
	]);

	return {
		ticket: ticket as SupportTicket,
		user: user as AdminTicketDetail["user"],
		messages: (messages || []) as SupportTicketMessage[],
	};
}

export async function updateTicketAdmin({
	ticketId,
	status,
	priority,
	assignedAdminId,
	timeSpentMinutes,
}: {
	ticketId: string;
	status?: TicketStatus;
	priority?: TicketPriority;
	assignedAdminId?: string | null;
	timeSpentMinutes?: number;
}): Promise<SupportTicket> {
	const supabase = createServiceClient();

	const updates: Record<string, unknown> = {
		updatedAt: new Date().toISOString(),
	};
	if (status) {
		updates.status = status;
		if (status === "resolved") {
			updates.resolvedAt = new Date().toISOString();
		}
	}
	if (priority) updates.priority = priority;
	if (assignedAdminId !== undefined) updates.assignedAdminId = assignedAdminId;
	if (timeSpentMinutes !== undefined)
		updates.timeSpentMinutes = timeSpentMinutes;

	const { data, error } = await supabase
		.from("SupportTicket")
		.update(updates)
		.eq("id", ticketId)
		.select()
		.single();

	if (error || !data) {
		logger.error({ err: error, ticketId }, "Failed to update ticket");
		throw new ChatSDKError("bad_request:database", "Failed to update ticket");
	}

	return data as SupportTicket;
}

export async function addAdminReply({
	ticketId,
	adminId,
	content,
	isInternal = false,
}: {
	ticketId: string;
	adminId: string;
	content: string;
	isInternal?: boolean;
}): Promise<SupportTicketMessage> {
	const supabase = createServiceClient();

	const { data: message, error } = await supabase
		.from("SupportTicketMessage")
		.insert({
			ticketId,
			senderId: adminId,
			content,
			isAdminReply: true,
			isInternal,
		})
		.select()
		.single();

	if (error || !message) {
		logger.error({ err: error, ticketId }, "Failed to add admin reply");
		throw new ChatSDKError("bad_request:database", "Failed to add reply");
	}

	// Update ticket timestamp and status if still open
	await supabase
		.from("SupportTicket")
		.update({
			updatedAt: new Date().toISOString(),
			status: "in_progress",
		})
		.eq("id", ticketId)
		.eq("status", "open");

	return message as SupportTicketMessage;
}

// Get admin stats for dashboard
export async function getSupportTicketStats(): Promise<{
	totalTickets: number;
	openTickets: number;
	inProgressTickets: number;
	resolvedTickets: number;
	closedTickets: number;
}> {
	const supabase = createServiceClient();

	const [total, open, inProgress, resolved, closed] = await Promise.all([
		supabase
			.from("SupportTicket")
			.select("*", { count: "exact", head: true })
			.is("deletedAt", null),
		supabase
			.from("SupportTicket")
			.select("*", { count: "exact", head: true })
			.eq("status", "open")
			.is("deletedAt", null),
		supabase
			.from("SupportTicket")
			.select("*", { count: "exact", head: true })
			.eq("status", "in_progress")
			.is("deletedAt", null),
		supabase
			.from("SupportTicket")
			.select("*", { count: "exact", head: true })
			.eq("status", "resolved")
			.is("deletedAt", null),
		supabase
			.from("SupportTicket")
			.select("*", { count: "exact", head: true })
			.eq("status", "closed")
			.is("deletedAt", null),
	]);

	return {
		totalTickets: total.count || 0,
		openTickets: open.count || 0,
		inProgressTickets: inProgress.count || 0,
		resolvedTickets: resolved.count || 0,
		closedTickets: closed.count || 0,
	};
}
