"use client";

import { formatDistanceToNow } from "date-fns";
import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCsrf } from "@/hooks/use-csrf";
import type { SupportTicket, SupportTicketMessage } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type TicketWithMessages = {
  ticket: SupportTicket;
  messages: SupportTicketMessage[];
};

export function SupportTicketConversation({ ticketId }: { ticketId: string }) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { csrfFetch } = useCsrf();

  const { data, isLoading, error } = useSWR<TicketWithMessages>(
    `/api/support/${ticketId}`,
    fetcher,
    { refreshInterval: 10000 }, // Poll every 10s for new messages
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await csrfFetch(`/api/support/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });

      if (res.ok) {
        setMessage("");
        mutate(`/api/support/${ticketId}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = async () => {
    try {
      const res = await csrfFetch(`/api/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });

      if (res.ok) {
        mutate(`/api/support/${ticketId}`);
        mutate("/api/support");
      }
    } catch (err) {
      console.error("Error closing ticket:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-rose-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-neutral-500">
        Failed to load ticket. Please try again.
      </div>
    );
  }

  const { ticket, messages } = data;
  const isClosed = ticket.status === "closed";

  return (
    <div className="flex h-full flex-col">
      {/* Ticket info header */}
      <div className="border-b border-neutral-100 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 font-medium text-sm text-neutral-900">
              {ticket.subject}
            </p>
            <p className="text-xs text-neutral-400 capitalize">
              Status:{" "}
              <span
                className={`font-medium ${
                  ticket.status === "open"
                    ? "text-amber-600"
                    : ticket.status === "in_progress"
                      ? "text-blue-600"
                      : ticket.status === "resolved"
                        ? "text-emerald-600"
                        : "text-neutral-500"
                }`}
              >
                {ticket.status.replace("_", " ")}
              </span>
            </p>
          </div>
          {!isClosed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-7 text-xs text-neutral-500 hover:text-neutral-700"
            >
              <X className="mr-1 h-3 w-3" />
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[85%] rounded-lg p-3 text-sm",
              msg.isAdminReply
                ? "mr-auto bg-neutral-100 text-neutral-900"
                : "ml-auto bg-gradient-to-r from-rose-500 to-red-600 text-white",
            )}
          >
            {msg.isAdminReply && (
              <p className="mb-1 text-xs font-medium text-rose-600">
                Support Team
              </p>
            )}
            <p className="whitespace-pre-wrap">{msg.content}</p>
            <p
              className={cn(
                "mt-1 text-xs",
                msg.isAdminReply ? "text-neutral-400" : "text-white/70",
              )}
            >
              {formatDistanceToNow(new Date(msg.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isClosed ? (
        <div className="border-t border-neutral-100 p-4">
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[60px] resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || isSending}
              size="icon"
              className="h-[60px] w-[60px] bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"
            >
              {isSending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t border-neutral-100 p-4 text-center text-sm text-neutral-400">
          This ticket is closed. Create a new ticket if you need help.
        </div>
      )}
    </div>
  );
}
