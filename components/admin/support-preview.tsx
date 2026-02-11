"use client";

import { formatDistanceToNow } from "date-fns";
import { AlertCircle, ArrowRight, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface SupportTicketPreviewData {
  id: string;
  subject: string;
  userEmail: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: string;
}

interface SupportPreviewProps {
  tickets: SupportTicketPreviewData[];
}

const statusConfig: Record<
  string,
  { icon: typeof Clock; color: string; bg: string }
> = {
  open: { icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
  in_progress: { icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
  resolved: {
    icon: CheckCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  closed: { icon: CheckCircle, color: "text-neutral-600", bg: "bg-neutral-50" },
};

const priorityColors: Record<string, string> = {
  low: "bg-neutral-100 text-neutral-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-rose-100 text-rose-700",
};

export function SupportPreview({ tickets }: SupportPreviewProps) {
  const openCount = tickets.filter(
    (t) => t.status === "open" || t.status === "in_progress",
  ).length;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm h-full flex flex-col">
      <div className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Support Tickets
          </h2>
          {openCount > 0 && (
            <p className="text-sm text-amber-600">{openCount} open tickets</p>
          )}
        </div>
        <Link
          href="/admin/support-tickets"
          className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700 font-medium"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex-1 divide-y divide-neutral-100 overflow-auto">
        {tickets.length === 0 ? (
          <div className="p-6 text-center text-neutral-500">
            <CheckCircle className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
            <p>No support tickets</p>
          </div>
        ) : (
          tickets.map((ticket) => {
            const config = statusConfig[ticket.status] || statusConfig.open;
            const StatusIcon = config.icon;

            return (
              <Link
                key={ticket.id}
                href={`/admin/support-tickets/${ticket.id}`}
                className="flex items-start gap-4 px-6 py-3 transition-colors hover:bg-neutral-50"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    config.bg,
                  )}
                >
                  <StatusIcon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {ticket.subject}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">
                    {ticket.userEmail}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-neutral-400">
                    {formatDistanceToNow(new Date(ticket.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                      priorityColors[ticket.priority] || priorityColors.medium,
                    )}
                  >
                    {ticket.priority}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
