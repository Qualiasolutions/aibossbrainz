-- ============================================
-- SOFT DELETE COLUMNS
-- Alecci Media AI - Data Safety
-- Date: 2026-01-08
-- ============================================

-- Add deletedAt column to Chat table
ALTER TABLE "Chat"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ DEFAULT NULL;

-- Add deletedAt column to Message_v2 table
ALTER TABLE "Message_v2"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ DEFAULT NULL;

-- Add deletedAt column to Vote_v2 table
ALTER TABLE "Vote_v2"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ DEFAULT NULL;

-- Add deletedAt column to Stream table
ALTER TABLE "Stream"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ DEFAULT NULL;

-- Add deletedAt column to Document table
ALTER TABLE "Document"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ DEFAULT NULL;

-- Add deletedAt column to Suggestion table
ALTER TABLE "Suggestion"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ DEFAULT NULL;

-- ============================================
-- INDEXES FOR SOFT DELETE QUERIES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_chat_deletedat ON "Chat"("deletedAt");
CREATE INDEX IF NOT EXISTS idx_message_v2_deletedat ON "Message_v2"("deletedAt");
CREATE INDEX IF NOT EXISTS idx_vote_v2_deletedat ON "Vote_v2"("deletedAt");
CREATE INDEX IF NOT EXISTS idx_stream_deletedat ON "Stream"("deletedAt");
CREATE INDEX IF NOT EXISTS idx_document_deletedat ON "Document"("deletedAt");
CREATE INDEX IF NOT EXISTS idx_suggestion_deletedat ON "Suggestion"("deletedAt");

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================

-- Chat queries often filter by userId AND deletedAt
CREATE INDEX IF NOT EXISTS idx_chat_userid_deletedat
ON "Chat"("userId", "deletedAt");

-- Message queries often filter by chatId AND deletedAt
CREATE INDEX IF NOT EXISTS idx_message_v2_chatid_deletedat
ON "Message_v2"("chatId", "deletedAt");

-- ============================================
-- UPDATE RLS POLICIES TO EXCLUDE SOFT DELETED
-- ============================================

-- Drop and recreate Chat select policy to exclude soft deleted
DROP POLICY IF EXISTS "Users can view own chats" ON "Chat";
CREATE POLICY "Users can view own chats"
ON "Chat" FOR SELECT
USING (
  "deletedAt" IS NULL
  AND (
    auth.uid()::text = "userId"
    OR visibility = 'public'
  )
);

-- Drop and recreate Message_v2 select policy to exclude soft deleted
DROP POLICY IF EXISTS "Users can view messages in accessible chats" ON "Message_v2";
CREATE POLICY "Users can view messages in accessible chats"
ON "Message_v2" FOR SELECT
USING (
  "deletedAt" IS NULL
  AND EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Message_v2"."chatId"
    AND "Chat"."deletedAt" IS NULL
    AND (
      "Chat"."userId" = auth.uid()::text
      OR "Chat".visibility = 'public'
    )
  )
);

-- Drop and recreate Vote_v2 select policy to exclude soft deleted
DROP POLICY IF EXISTS "Users can view votes in accessible chats" ON "Vote_v2";
CREATE POLICY "Users can view votes in accessible chats"
ON "Vote_v2" FOR SELECT
USING (
  "deletedAt" IS NULL
  AND EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Vote_v2"."chatId"
    AND "Chat"."deletedAt" IS NULL
    AND (
      "Chat"."userId" = auth.uid()::text
      OR "Chat".visibility = 'public'
    )
  )
);

-- Drop and recreate Document select policy to exclude soft deleted
DROP POLICY IF EXISTS "Users can view own documents" ON "Document";
CREATE POLICY "Users can view own documents"
ON "Document" FOR SELECT
USING (
  "deletedAt" IS NULL
  AND auth.uid()::text = "userId"
);

-- Drop and recreate Suggestion select policy to exclude soft deleted
DROP POLICY IF EXISTS "Users can view own suggestions" ON "Suggestion";
CREATE POLICY "Users can view own suggestions"
ON "Suggestion" FOR SELECT
USING (
  "deletedAt" IS NULL
  AND auth.uid()::text = "userId"
);
