-- ============================================
-- SOFT DELETE COLUMNS - FIXED
-- Alecci Media AI - Data Safety
-- Date: 2026-01-08
--
-- Run this BEFORE the RLS policies migration
-- ============================================

-- Add deletedAt column to Chat table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Chat' AND column_name = 'deletedAt'
    ) THEN
        ALTER TABLE "Chat" ADD COLUMN "deletedAt" TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- Add deletedAt column to Message_v2 table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Message_v2' AND column_name = 'deletedAt'
    ) THEN
        ALTER TABLE "Message_v2" ADD COLUMN "deletedAt" TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- Add deletedAt column to Vote_v2 table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Vote_v2' AND column_name = 'deletedAt'
    ) THEN
        ALTER TABLE "Vote_v2" ADD COLUMN "deletedAt" TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- Add deletedAt column to Stream table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Stream' AND column_name = 'deletedAt'
    ) THEN
        ALTER TABLE "Stream" ADD COLUMN "deletedAt" TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- Add deletedAt column to Document table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Document' AND column_name = 'deletedAt'
    ) THEN
        ALTER TABLE "Document" ADD COLUMN "deletedAt" TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- Add deletedAt column to Suggestion table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Suggestion' AND column_name = 'deletedAt'
    ) THEN
        ALTER TABLE "Suggestion" ADD COLUMN "deletedAt" TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- ============================================
-- INDEXES FOR SOFT DELETE QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_chat_deletedat ON "Chat"("deletedAt");
CREATE INDEX IF NOT EXISTS idx_message_v2_deletedat ON "Message_v2"("deletedAt");
CREATE INDEX IF NOT EXISTS idx_vote_v2_deletedat ON "Vote_v2"("deletedAt");
CREATE INDEX IF NOT EXISTS idx_stream_deletedat ON "Stream"("deletedAt");
CREATE INDEX IF NOT EXISTS idx_document_deletedat ON "Document"("deletedAt");
CREATE INDEX IF NOT EXISTS idx_suggestion_deletedat ON "Suggestion"("deletedAt");

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chat_userid_deletedat ON "Chat"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS idx_message_v2_chatid_deletedat ON "Message_v2"("chatId", "deletedAt");
