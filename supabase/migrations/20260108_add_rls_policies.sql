-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Alecci Media AI - Production Security
-- Date: 2026-01-08
-- ============================================

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Chat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Suggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Stream" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExecutiveMemory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageReaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAnalytics" ENABLE ROW LEVEL SECURITY;

-- Legacy tables (if still in use)
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER TABLE POLICIES
-- Users can only read/update their own profile
-- ============================================

CREATE POLICY "Users can view own profile"
ON "User" FOR SELECT
USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile"
ON "User" FOR UPDATE
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

-- ============================================
-- CHAT TABLE POLICIES
-- Users can CRUD their own chats
-- Users can read public chats from anyone
-- ============================================

CREATE POLICY "Users can view own chats"
ON "Chat" FOR SELECT
USING (
  auth.uid()::text = "userId"
  OR visibility = 'public'
);

CREATE POLICY "Users can create own chats"
ON "Chat" FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own chats"
ON "Chat" FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own chats"
ON "Chat" FOR DELETE
USING (auth.uid()::text = "userId");

-- ============================================
-- MESSAGE_V2 TABLE POLICIES
-- Users can read messages from their own chats or public chats
-- Users can create messages in their own chats
-- ============================================

CREATE POLICY "Users can view messages in accessible chats"
ON "Message_v2" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Message_v2"."chatId"
    AND (
      "Chat"."userId" = auth.uid()::text
      OR "Chat".visibility = 'public'
    )
  )
);

CREATE POLICY "Users can create messages in own chats"
ON "Message_v2" FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "chatId"
    AND "Chat"."userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can update messages in own chats"
ON "Message_v2" FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Message_v2"."chatId"
    AND "Chat"."userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can delete messages in own chats"
ON "Message_v2" FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Message_v2"."chatId"
    AND "Chat"."userId" = auth.uid()::text
  )
);

-- ============================================
-- VOTE_V2 TABLE POLICIES
-- Users can vote on messages in accessible chats
-- ============================================

CREATE POLICY "Users can view votes in accessible chats"
ON "Vote_v2" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Vote_v2"."chatId"
    AND (
      "Chat"."userId" = auth.uid()::text
      OR "Chat".visibility = 'public'
    )
  )
);

CREATE POLICY "Users can create votes in own chats"
ON "Vote_v2" FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "chatId"
    AND "Chat"."userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can update votes in own chats"
ON "Vote_v2" FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Vote_v2"."chatId"
    AND "Chat"."userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can delete votes in own chats"
ON "Vote_v2" FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Vote_v2"."chatId"
    AND "Chat"."userId" = auth.uid()::text
  )
);

-- ============================================
-- DOCUMENT TABLE POLICIES
-- Users can only access their own documents
-- ============================================

CREATE POLICY "Users can view own documents"
ON "Document" FOR SELECT
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own documents"
ON "Document" FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own documents"
ON "Document" FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own documents"
ON "Document" FOR DELETE
USING (auth.uid()::text = "userId");

-- ============================================
-- SUGGESTION TABLE POLICIES
-- Users can only access their own suggestions
-- ============================================

CREATE POLICY "Users can view own suggestions"
ON "Suggestion" FOR SELECT
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own suggestions"
ON "Suggestion" FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own suggestions"
ON "Suggestion" FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own suggestions"
ON "Suggestion" FOR DELETE
USING (auth.uid()::text = "userId");

-- ============================================
-- STREAM TABLE POLICIES
-- Users can only access streams for their own chats
-- ============================================

CREATE POLICY "Users can view streams for own chats"
ON "Stream" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Stream"."chatId"
    AND "Chat"."userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can create streams for own chats"
ON "Stream" FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "chatId"
    AND "Chat"."userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can delete streams for own chats"
ON "Stream" FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Stream"."chatId"
    AND "Chat"."userId" = auth.uid()::text
  )
);

-- ============================================
-- EXECUTIVEMEMORY TABLE POLICIES
-- Users can only access their own executive memory
-- ============================================

CREATE POLICY "Users can view own executive memory"
ON "ExecutiveMemory" FOR SELECT
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own executive memory"
ON "ExecutiveMemory" FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own executive memory"
ON "ExecutiveMemory" FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own executive memory"
ON "ExecutiveMemory" FOR DELETE
USING (auth.uid()::text = "userId");

-- ============================================
-- MESSAGEREACTION TABLE POLICIES
-- Users can manage their own reactions
-- Users can view reactions on messages they can access
-- ============================================

CREATE POLICY "Users can view reactions on accessible messages"
ON "MessageReaction" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Message_v2"
    JOIN "Chat" ON "Chat".id = "Message_v2"."chatId"
    WHERE "Message_v2".id = "MessageReaction"."messageId"
    AND (
      "Chat"."userId" = auth.uid()::text
      OR "Chat".visibility = 'public'
    )
  )
);

CREATE POLICY "Users can create own reactions"
ON "MessageReaction" FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own reactions"
ON "MessageReaction" FOR DELETE
USING (auth.uid()::text = "userId");

-- ============================================
-- USERANALYTICS TABLE POLICIES
-- Users can only access their own analytics
-- ============================================

CREATE POLICY "Users can view own analytics"
ON "UserAnalytics" FOR SELECT
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own analytics"
ON "UserAnalytics" FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own analytics"
ON "UserAnalytics" FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

-- ============================================
-- LEGACY TABLE POLICIES (Message & Vote)
-- In case these are still being used
-- ============================================

CREATE POLICY "Users can view messages in accessible chats (legacy)"
ON "Message" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Message"."chatId"
    AND (
      "Chat"."userId" = auth.uid()::text
      OR "Chat".visibility = 'public'
    )
  )
);

CREATE POLICY "Users can manage messages in own chats (legacy)"
ON "Message" FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Message"."chatId"
    AND "Chat"."userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can view votes in accessible chats (legacy)"
ON "Vote" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Vote"."chatId"
    AND (
      "Chat"."userId" = auth.uid()::text
      OR "Chat".visibility = 'public'
    )
  )
);

CREATE POLICY "Users can manage votes in own chats (legacy)"
ON "Vote" FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Vote"."chatId"
    AND "Chat"."userId" = auth.uid()::text
  )
);

-- ============================================
-- SERVICE ROLE BYPASS
-- Allow service role to bypass RLS for admin operations
-- This is already the default behavior in Supabase
-- ============================================

-- Note: The service role key automatically bypasses RLS
-- No additional configuration needed

-- ============================================
-- INDEXES FOR RLS PERFORMANCE
-- Add indexes to support efficient policy evaluation
-- ============================================

CREATE INDEX IF NOT EXISTS idx_chat_userid ON "Chat"("userId");
CREATE INDEX IF NOT EXISTS idx_chat_visibility ON "Chat"(visibility);
CREATE INDEX IF NOT EXISTS idx_message_v2_chatid ON "Message_v2"("chatId");
CREATE INDEX IF NOT EXISTS idx_vote_v2_chatid ON "Vote_v2"("chatId");
CREATE INDEX IF NOT EXISTS idx_document_userid ON "Document"("userId");
CREATE INDEX IF NOT EXISTS idx_suggestion_userid ON "Suggestion"("userId");
CREATE INDEX IF NOT EXISTS idx_stream_chatid ON "Stream"("chatId");
CREATE INDEX IF NOT EXISTS idx_executivememory_userid ON "ExecutiveMemory"("userId");
CREATE INDEX IF NOT EXISTS idx_messagereaction_messageid ON "MessageReaction"("messageId");
CREATE INDEX IF NOT EXISTS idx_messagereaction_userid ON "MessageReaction"("userId");
CREATE INDEX IF NOT EXISTS idx_useranalytics_userid ON "UserAnalytics"("userId");
