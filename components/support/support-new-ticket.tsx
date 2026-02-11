"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCsrf } from "@/hooks/use-csrf";
import type { SupportTicket, TicketCategory } from "@/lib/supabase/types";

export function SupportNewTicket({
  onTicketCreated,
}: {
  onTicketCreated: (ticketId: string) => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { csrfFetch, isLoading: isCsrfLoading } = useCsrf();

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim() || isSubmitting || isCsrfLoading)
      return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await csrfFetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          category: category || undefined,
        }),
      });

      if (res.ok) {
        const ticket: SupportTicket = await res.json();
        mutate("/api/support");
        onTicketCreated(ticket.id);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(
          errData.message || "Failed to create ticket. Please try again.",
        );
      }
    } catch (err) {
      console.error("Error creating ticket:", err);
      setError("Failed to create ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex-1 space-y-4 overflow-y-auto">
        <div className="space-y-2">
          <Label htmlFor="subject" className="text-sm font-medium">
            Subject
          </Label>
          <Input
            id="subject"
            placeholder="Brief description of your issue"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-medium">
            Category{" "}
            <span className="font-normal text-neutral-400">(optional)</span>
          </Label>
          <Select
            value={category}
            onValueChange={(val) => setCategory(val as TicketCategory)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">Bug Report</SelectItem>
              <SelectItem value="feature">Feature Request</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="account">Account</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message" className="text-sm font-medium">
            Message
          </Label>
          <Textarea
            id="message"
            placeholder="Describe your issue in detail..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[150px] text-sm"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <div className="pt-4">
        <Button
          onClick={handleSubmit}
          disabled={
            !subject.trim() || !message.trim() || isSubmitting || isCsrfLoading
          }
          className="w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"
        >
          {isSubmitting ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Submitting...
            </>
          ) : (
            "Submit Ticket"
          )}
        </Button>
      </div>
    </div>
  );
}
