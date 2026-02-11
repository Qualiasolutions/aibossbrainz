-- Migration: Add ConversationSummary table
-- Date: 2026-01-15
-- Description: Creates ConversationSummary table for AI-generated conversation summaries

-- Create ConversationSummary table
CREATE TABLE IF NOT EXISTS "ConversationSummary" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "chatId" UUID REFERENCES "Chat"("id") ON DELETE SET NULL,
    "summary" TEXT NOT NULL,
    "topics" TEXT[] DEFAULT '{}',
    "keyInsights" JSONB DEFAULT '[]',
    "importance" INTEGER DEFAULT 1 CHECK ("importance" >= 1 AND "importance" <= 5),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE,
    "deletedAt" TIMESTAMP WITH TIME ZONE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_conversation_summary_user ON "ConversationSummary"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS idx_conversation_summary_chat ON "ConversationSummary"("chatId") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_summary_expires ON "ConversationSummary"("expiresAt") WHERE "expiresAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_summary_importance ON "ConversationSummary"("userId", "importance" DESC) WHERE "deletedAt" IS NULL;

-- GIN index for topics array search
CREATE INDEX IF NOT EXISTS idx_conversation_summary_topics ON "ConversationSummary" USING GIN ("topics");

-- Comment on table
COMMENT ON TABLE "ConversationSummary" IS 'AI-generated summaries of conversations with topics and key insights.';
