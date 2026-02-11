-- Migration: Add RLS policies for Support Ticket tables
-- Date: 2026-01-17
-- Description: Row Level Security policies for SupportTicket and SupportTicketMessage

-- Enable RLS
ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicketMessage" ENABLE ROW LEVEL SECURITY;

-- SupportTicket policies
-- Users can view their own tickets
CREATE POLICY "ticket_select_own" ON "SupportTicket"
FOR SELECT TO authenticated
USING (auth.uid()::text = "userId");

-- Users can create tickets for themselves
CREATE POLICY "ticket_insert_own" ON "SupportTicket"
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = "userId");

-- Users can update their own tickets (e.g., closing)
CREATE POLICY "ticket_update_own" ON "SupportTicket"
FOR UPDATE TO authenticated
USING (auth.uid()::text = "userId");

-- SupportTicketMessage policies
-- Users can view messages in their tickets (except internal admin notes)
CREATE POLICY "message_select_own" ON "SupportTicketMessage"
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "SupportTicket"
        WHERE "SupportTicket".id = "SupportTicketMessage"."ticketId"
        AND "SupportTicket"."userId" = auth.uid()::text
    )
    AND "isInternal" = FALSE
);

-- Users can create messages in their own tickets
CREATE POLICY "message_insert_own" ON "SupportTicketMessage"
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "SupportTicket"
        WHERE "SupportTicket".id = "SupportTicketMessage"."ticketId"
        AND "SupportTicket"."userId" = auth.uid()::text
    )
    AND "isAdminReply" = FALSE
    AND "isInternal" = FALSE
);

-- Note: Admin access bypasses RLS via service role client (createServiceClient)
