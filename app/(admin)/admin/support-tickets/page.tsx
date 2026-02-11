import { AlertCircle, CheckCircle, Clock, Headphones } from "lucide-react";
import { revalidatePath } from "next/cache";
import { StatsCard } from "@/components/admin/stats-card";
import { SupportTicketsTable } from "@/components/admin/support-tickets-table";
import {
  getAllTicketsAdmin,
  getSupportTicketStats,
  updateTicketAdmin,
} from "@/lib/db/support-queries";
import type { TicketPriority, TicketStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  "use server";
  await updateTicketAdmin({ ticketId, status });
  revalidatePath("/admin/support-tickets");
}

async function updateTicketPriority(
  ticketId: string,
  priority: TicketPriority,
) {
  "use server";
  await updateTicketAdmin({ ticketId, priority });
  revalidatePath("/admin/support-tickets");
}

async function updateTicketTimeSpent(
  ticketId: string,
  timeSpentMinutes: number,
) {
  "use server";
  await updateTicketAdmin({ ticketId, timeSpentMinutes });
  revalidatePath("/admin/support-tickets");
}

export default async function SupportTicketsPage() {
  const [tickets, stats] = await Promise.all([
    getAllTicketsAdmin(),
    getSupportTicketStats(),
  ]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Support Tickets</h1>
        <p className="mt-1 text-neutral-500">
          Manage customer support requests. {stats.totalTickets} total tickets.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Open Tickets"
          value={stats.openTickets}
          icon={Clock}
        />
        <StatsCard
          title="In Progress"
          value={stats.inProgressTickets}
          icon={AlertCircle}
        />
        <StatsCard
          title="Resolved"
          value={stats.resolvedTickets}
          icon={CheckCircle}
        />
        <StatsCard
          title="Total Tickets"
          value={stats.totalTickets}
          icon={Headphones}
        />
      </div>

      <SupportTicketsTable
        tickets={tickets}
        onUpdateStatus={updateTicketStatus}
        onUpdatePriority={updateTicketPriority}
        onUpdateTimeSpent={updateTicketTimeSpent}
      />
    </div>
  );
}
