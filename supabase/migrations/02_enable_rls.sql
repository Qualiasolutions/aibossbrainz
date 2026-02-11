-- ============================================
-- ENABLE RLS AND CREATE POLICIES
-- Run this AFTER 01_create_tables.sql
-- ============================================

-- Drop any existing policies first
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

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Chat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Suggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Stream" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExecutiveMemory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageReaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAnalytics" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER POLICIES
-- ============================================

CREATE POLICY "user_select" ON "User"
FOR SELECT TO authenticated
USING (auth.uid()::text = id);

CREATE POLICY "user_insert" ON "User"
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = id);

CREATE POLICY "user_update" ON "User"
FOR UPDATE TO authenticated
USING (auth.uid()::text = id);

-- ============================================
-- CHAT POLICIES
-- ============================================

CREATE POLICY "chat_select" ON "Chat"
FOR SELECT TO authenticated
USING (auth.uid()::text = "userId" OR visibility = 'public');

CREATE POLICY "chat_insert" ON "Chat"
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "chat_update" ON "Chat"
FOR UPDATE TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "chat_delete" ON "Chat"
FOR DELETE TO authenticated
USING (auth.uid()::text = "userId");

-- ============================================
-- MESSAGE_V2 POLICIES
-- ============================================

CREATE POLICY "message_v2_select" ON "Message_v2"
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Message_v2"."chatId"
        AND ("Chat"."userId" = auth.uid()::text OR "Chat".visibility = 'public')
    )
);

CREATE POLICY "message_v2_insert" ON "Message_v2"
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Message_v2"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

CREATE POLICY "message_v2_update" ON "Message_v2"
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Message_v2"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

CREATE POLICY "message_v2_delete" ON "Message_v2"
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Message_v2"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

-- ============================================
-- MESSAGE (LEGACY) POLICIES
-- ============================================

CREATE POLICY "message_select" ON "Message"
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Message"."chatId"
        AND ("Chat"."userId" = auth.uid()::text OR "Chat".visibility = 'public')
    )
);

CREATE POLICY "message_all" ON "Message"
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Message"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

-- ============================================
-- VOTE_V2 POLICIES
-- ============================================

CREATE POLICY "vote_v2_select" ON "Vote_v2"
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Vote_v2"."chatId"
        AND ("Chat"."userId" = auth.uid()::text OR "Chat".visibility = 'public')
    )
);

CREATE POLICY "vote_v2_insert" ON "Vote_v2"
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Vote_v2"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

CREATE POLICY "vote_v2_update" ON "Vote_v2"
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Vote_v2"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

CREATE POLICY "vote_v2_delete" ON "Vote_v2"
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Vote_v2"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

-- ============================================
-- VOTE (LEGACY) POLICIES
-- ============================================

CREATE POLICY "vote_select" ON "Vote"
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Vote"."chatId"
        AND ("Chat"."userId" = auth.uid()::text OR "Chat".visibility = 'public')
    )
);

CREATE POLICY "vote_all" ON "Vote"
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Vote"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

-- ============================================
-- DOCUMENT POLICIES
-- ============================================

CREATE POLICY "document_select" ON "Document"
FOR SELECT TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "document_insert" ON "Document"
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "document_update" ON "Document"
FOR UPDATE TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "document_delete" ON "Document"
FOR DELETE TO authenticated
USING (auth.uid()::text = "userId");

-- ============================================
-- SUGGESTION POLICIES
-- ============================================

CREATE POLICY "suggestion_select" ON "Suggestion"
FOR SELECT TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "suggestion_insert" ON "Suggestion"
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "suggestion_update" ON "Suggestion"
FOR UPDATE TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "suggestion_delete" ON "Suggestion"
FOR DELETE TO authenticated
USING (auth.uid()::text = "userId");

-- ============================================
-- STREAM POLICIES
-- ============================================

CREATE POLICY "stream_select" ON "Stream"
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Stream"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

CREATE POLICY "stream_insert" ON "Stream"
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Stream"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

CREATE POLICY "stream_delete" ON "Stream"
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Chat"
        WHERE "Chat".id = "Stream"."chatId"
        AND "Chat"."userId" = auth.uid()::text
    )
);

-- ============================================
-- EXECUTIVEMEMORY POLICIES
-- ============================================

CREATE POLICY "executivememory_select" ON "ExecutiveMemory"
FOR SELECT TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "executivememory_insert" ON "ExecutiveMemory"
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "executivememory_update" ON "ExecutiveMemory"
FOR UPDATE TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "executivememory_delete" ON "ExecutiveMemory"
FOR DELETE TO authenticated
USING (auth.uid()::text = "userId");

-- ============================================
-- MESSAGEREACTION POLICIES
-- ============================================

CREATE POLICY "messagereaction_select" ON "MessageReaction"
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Message_v2"
        JOIN "Chat" ON "Chat".id = "Message_v2"."chatId"
        WHERE "Message_v2".id = "MessageReaction"."messageId"
        AND ("Chat"."userId" = auth.uid()::text OR "Chat".visibility = 'public')
    )
);

CREATE POLICY "messagereaction_insert" ON "MessageReaction"
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "messagereaction_delete" ON "MessageReaction"
FOR DELETE TO authenticated
USING (auth.uid()::text = "userId");

-- ============================================
-- USERANALYTICS POLICIES
-- ============================================

CREATE POLICY "useranalytics_select" ON "UserAnalytics"
FOR SELECT TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "useranalytics_insert" ON "UserAnalytics"
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "useranalytics_update" ON "UserAnalytics"
FOR UPDATE TO authenticated
USING (auth.uid()::text = "userId");
