import { ConversationsTable } from "@/components/admin/conversations-table";
import { getAllChats } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const conversations = await getAllChats(100);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Conversations</h1>
        <p className="text-neutral-500 mt-1">
          View all user conversations with the AI executives.{" "}
          {conversations.length} conversations.
        </p>
      </div>

      <ConversationsTable conversations={conversations} />
    </div>
  );
}
