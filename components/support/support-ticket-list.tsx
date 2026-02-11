"use client";

import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  Plus,
} from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import type { SupportTicket } from "@/lib/supabase/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const statusIcons = {
  open: <Clock className="h-4 w-4 text-amber-500" />,
  in_progress: <AlertCircle className="h-4 w-4 text-blue-500" />,
  resolved: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  closed: <CheckCircle className="h-4 w-4 text-neutral-400" />,
};

const statusLabels = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export function SupportTicketList({
  onSelectTicket,
  onNewTicket,
}: {
  onSelectTicket: (id: string) => void;
  onNewTicket: () => void;
}) {
  const { data: tickets, isLoading } = useSWR<SupportTicket[]>(
    "/api/support",
    fetcher,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-neutral-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-rose-500" />
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
              <MessageSquare className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="font-medium text-neutral-700">
              No support tickets yet
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Create one if you need help
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => onSelectTicket(ticket.id)}
                className="w-full rounded-lg border border-neutral-200 p-3 text-left transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-1 font-medium text-neutral-900">
                    {ticket.subject}
                  </span>
                  {statusIcons[ticket.status as keyof typeof statusIcons]}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">
                    {formatDistanceToNow(new Date(ticket.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      ticket.status === "open"
                        ? "text-amber-600"
                        : ticket.status === "in_progress"
                          ? "text-blue-600"
                          : ticket.status === "resolved"
                            ? "text-emerald-600"
                            : "text-neutral-500"
                    }`}
                  >
                    {statusLabels[ticket.status as keyof typeof statusLabels]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-neutral-100 p-4">
        <Button
          onClick={onNewTicket}
          className="w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Support Ticket
        </Button>
      </div>
    </div>
  );
}
