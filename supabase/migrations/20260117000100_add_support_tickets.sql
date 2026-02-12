-- Migration: Add Support Ticket System
-- Date: 2026-01-17
-- Description: Creates SupportTicket and SupportTicketMessage tables for customer support

-- SupportTicket table (the main ticket/conversation)
CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open' CHECK ("status" IN ('open', 'in_progress', 'resolved', 'closed')),
    "priority" TEXT NOT NULL DEFAULT 'normal' CHECK ("priority" IN ('low', 'normal', 'high', 'urgent')),
    "category" TEXT CHECK ("category" IN ('bug', 'feature', 'billing', 'account', 'general')),
    "assignedAdminId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "resolvedAt" TIMESTAMP WITH TIME ZONE,
    "deletedAt" TIMESTAMP WITH TIME ZONE
);

-- SupportTicketMessage table (individual messages in the conversation)
CREATE TABLE IF NOT EXISTS "SupportTicketMessage" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ticketId" UUID NOT NULL REFERENCES "SupportTicket"("id") ON DELETE CASCADE,
    "senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "isAdminReply" BOOLEAN NOT NULL DEFAULT FALSE,
    "isInternal" BOOLEAN NOT NULL DEFAULT FALSE,
    "attachments" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "deletedAt" TIMESTAMP WITH TIME ZONE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_support_ticket_user ON "SupportTicket"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS idx_support_ticket_status ON "SupportTicket"("status", "deletedAt");
CREATE INDEX IF NOT EXISTS idx_support_ticket_assigned ON "SupportTicket"("assignedAdminId", "status", "deletedAt");
CREATE INDEX IF NOT EXISTS idx_support_ticket_created ON "SupportTicket"("createdAt" DESC) WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_support_message_ticket ON "SupportTicketMessage"("ticketId", "createdAt");

-- Comments
COMMENT ON TABLE "SupportTicket" IS 'Support tickets created by users for help requests';
COMMENT ON TABLE "SupportTicketMessage" IS 'Messages within support ticket conversations';
