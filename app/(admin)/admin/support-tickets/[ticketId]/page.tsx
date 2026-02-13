import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { SupportTicketDetail } from "@/components/admin/support-ticket-detail";
import { isUserAdmin } from "@/lib/admin/queries";
import {
	addAdminReply,
	getTicketWithMessagesAdmin,
	updateTicketAdmin,
} from "@/lib/db/support-queries";
import { sendTicketReplyNotification } from "@/lib/email/support-notifications";
import { createClient } from "@/lib/supabase/server";
import type { TicketPriority, TicketStatus } from "@/lib/supabase/types";

async function requireAdmin() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Unauthorized");
	const admin = await isUserAdmin(user.id);
	if (!admin) throw new Error("Forbidden");
	return user;
}

export const dynamic = "force-dynamic";

async function updateStatus(ticketId: string, status: TicketStatus) {
	"use server";
	await requireAdmin();
	await updateTicketAdmin({ ticketId, status });
	revalidatePath(`/admin/support-tickets/${ticketId}`);
	revalidatePath("/admin/support-tickets");
}

async function updatePriority(ticketId: string, priority: TicketPriority) {
	"use server";
	await requireAdmin();
	await updateTicketAdmin({ ticketId, priority });
	revalidatePath(`/admin/support-tickets/${ticketId}`);
}

async function sendReply(
	ticketId: string,
	adminId: string,
	content: string,
	isInternal: boolean,
) {
	"use server";
	await requireAdmin();
	const message = await addAdminReply({
		ticketId,
		adminId,
		content,
		isInternal,
	});

	// Send email notification if not internal
	if (!isInternal) {
		const data = await getTicketWithMessagesAdmin({ ticketId });
		if (data?.user?.email) {
			sendTicketReplyNotification({
				ticketId,
				subject: data.ticket.subject,
				replyContent: content,
				userEmail: data.user.email,
			}).catch((err) => {
				console.error("Failed to send reply notification email:", err);
			});
		}
	}

	revalidatePath(`/admin/support-tickets/${ticketId}`);
	return message;
}

export default async function SupportTicketDetailPage(props: {
	params: Promise<{ ticketId: string }>;
}) {
	const params = await props.params;
	const data = await getTicketWithMessagesAdmin({ ticketId: params.ticketId });

	if (!data) {
		notFound();
	}

	return (
		<div className="p-8">
			<SupportTicketDetail
				ticket={data.ticket}
				user={data.user}
				messages={data.messages}
				onUpdateStatus={updateStatus}
				onUpdatePriority={updatePriority}
				onSendReply={sendReply}
			/>
		</div>
	);
}
