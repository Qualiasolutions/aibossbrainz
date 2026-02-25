import { ConversationsTable } from "@/components/admin/conversations-table";
import { getAllChats, isUserAdmin } from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";

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

export default async function ConversationsPage() {
	// Defense-in-depth: verify admin access before loading sensitive data
	await requireAdmin();

	const conversations = await getAllChats(100);

	return (
		<div className="p-4 md:p-6 lg:p-8">
			<div className="mb-6 lg:mb-8">
				<h1 className="text-2xl md:text-3xl font-bold text-neutral-900">
					Conversations
				</h1>
				<p className="text-neutral-500 mt-1">
					View all user conversations with the AI executives.{" "}
					{conversations.length} conversations.
				</p>
			</div>

			<ConversationsTable conversations={conversations} />
		</div>
	);
}
