-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES - FIXED
-- Alecci Media AI - Production Security
-- Date: 2026-01-08
--
-- Run this in Supabase SQL Editor
-- ============================================

-- First, drop any existing policies to avoid conflicts
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE IF EXISTS "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Chat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Message_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Vote_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Suggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Stream" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ExecutiveMemory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MessageReaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "UserAnalytics" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER TABLE POLICIES
-- ============================================

CREATE POLICY "user_select_own"
ON "User" FOR SELECT
TO authenticated
USING (auth.uid()::text = id);

CREATE POLICY "user_update_own"
ON "User" FOR UPDATE
TO authenticated
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

CREATE POLICY "user_insert_own"
ON "User" FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = id);

-- ============================================
-- CHAT TABLE POLICIES
-- ============================================

CREATE POLICY "chat_select"
ON "Chat" FOR SELECT
TO authenticated
USING (
    auth.uid()::text = "userId"
    OR visibility = 'public'
);

CREATE POLICY "chat_insert"
ON "Chat" FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "chat_update"
ON "Chat" FOR UPDATE
TO authenticated
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "chat_delete"
ON "Chat" FOR DELETE
TO authenticated
USING (auth.uid()::text = "userId");

-- ============================================
-- MESSAGE_V2 TABLE POLICIES
-- ============================================

CREATE POLICY "message_v2_select"
ON "Message_v2" FOR SELECT
TO authenticated
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

CREATE POLICY "message_v2_insert"
ON "Message_v2" FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Message_v2"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

CREATE POLICY "message_v2_update"
ON "Message_v2" FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Message_v2"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

CREATE POLICY "message_v2_delete"
ON "Message_v2" FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Message_v2"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

-- ============================================
-- VOTE_V2 TABLE POLICIES
-- ============================================

CREATE POLICY "vote_v2_select"
ON "Vote_v2" FOR SELECT
TO authenticated
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

CREATE POLICY "vote_v2_insert"
ON "Vote_v2" FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Vote_v2"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

CREATE POLICY "vote_v2_update"
ON "Vote_v2" FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Vote_v2"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

CREATE POLICY "vote_v2_delete"
ON "Vote_v2" FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Vote_v2"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

-- ============================================
-- DOCUMENT TABLE POLICIES
-- ============================================

CREATE POLICY "document_select"
ON "Document" FOR SELECT
TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "document_insert"
ON "Document" FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "document_update"
ON "Document" FOR UPDATE
TO authenticated
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "document_delete"
ON "Document" FOR DELETE
TO authenticated
USING (auth.uid()::text = "userId");

-- ============================================
-- SUGGESTION TABLE POLICIES
-- ============================================

CREATE POLICY "suggestion_select"
ON "Suggestion" FOR SELECT
TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "suggestion_insert"
ON "Suggestion" FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "suggestion_update"
ON "Suggestion" FOR UPDATE
TO authenticated
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "suggestion_delete"
ON "Suggestion" FOR DELETE
TO authenticated
USING (auth.uid()::text = "userId");

-- ============================================
-- STREAM TABLE POLICIES
-- ============================================

CREATE POLICY "stream_select"
ON "Stream" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Stream"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

CREATE POLICY "stream_insert"
ON "Stream" FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Stream"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

CREATE POLICY "stream_delete"
ON "Stream" FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Stream"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

-- ============================================
-- EXECUTIVEMEMORY TABLE POLICIES
-- ============================================

CREATE POLICY "executivememory_select"
ON "ExecutiveMemory" FOR SELECT
TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "executivememory_insert"
ON "ExecutiveMemory" FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "executivememory_update"
ON "ExecutiveMemory" FOR UPDATE
TO authenticated
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "executivememory_delete"
ON "ExecutiveMemory" FOR DELETE
TO authenticated
USING (auth.uid()::text = "userId");

-- ============================================
-- MESSAGEREACTION TABLE POLICIES
-- ============================================

CREATE POLICY "messagereaction_select"
ON "MessageReaction" FOR SELECT
TO authenticated
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

CREATE POLICY "messagereaction_insert"
ON "MessageReaction" FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "messagereaction_delete"
ON "MessageReaction" FOR DELETE
TO authenticated
USING (auth.uid()::text = "userId");

-- ============================================
-- USERANALYTICS TABLE POLICIES
-- ============================================

CREATE POLICY "useranalytics_select"
ON "UserAnalytics" FOR SELECT
TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "useranalytics_insert"
ON "UserAnalytics" FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "useranalytics_update"
ON "UserAnalytics" FOR UPDATE
TO authenticated
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

-- ============================================
-- INDEXES FOR PERFORMANCE
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
