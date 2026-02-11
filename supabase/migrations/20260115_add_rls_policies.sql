-- Migration: Add RLS policies for new tables
-- Date: 2026-01-15
-- Description: Enables RLS and adds policies for AuditLog, StrategyCanvas, ConversationSummary

-- ============================================================================
-- AUDIT LOG RLS
-- ============================================================================
-- Enable RLS
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Users can only read their own audit logs
CREATE POLICY "auditlog_select_own" ON "AuditLog"
    FOR SELECT TO authenticated
    USING (auth.uid()::text = "userId");

-- No direct insert/update/delete for users - service role only
-- Service role bypasses RLS by default

-- ============================================================================
-- STRATEGY CANVAS RLS
-- ============================================================================
-- Enable RLS
ALTER TABLE "StrategyCanvas" ENABLE ROW LEVEL SECURITY;

-- Users can read their own canvases (not soft-deleted)
CREATE POLICY "strategycanvas_select_own" ON "StrategyCanvas"
    FOR SELECT TO authenticated
    USING (auth.uid()::text = "userId" AND "deletedAt" IS NULL);

-- Users can insert their own canvases
CREATE POLICY "strategycanvas_insert_own" ON "StrategyCanvas"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = "userId");

-- Users can update their own canvases (not soft-deleted)
CREATE POLICY "strategycanvas_update_own" ON "StrategyCanvas"
    FOR UPDATE TO authenticated
    USING (auth.uid()::text = "userId" AND "deletedAt" IS NULL)
    WITH CHECK (auth.uid()::text = "userId");

-- Users can soft-delete their own canvases (update deletedAt)
CREATE POLICY "strategycanvas_delete_own" ON "StrategyCanvas"
    FOR DELETE TO authenticated
    USING (auth.uid()::text = "userId");

-- ============================================================================
-- CONVERSATION SUMMARY RLS
-- ============================================================================
-- Enable RLS
ALTER TABLE "ConversationSummary" ENABLE ROW LEVEL SECURITY;

-- Users can read their own summaries (not soft-deleted)
CREATE POLICY "conversationsummary_select_own" ON "ConversationSummary"
    FOR SELECT TO authenticated
    USING (auth.uid()::text = "userId" AND "deletedAt" IS NULL);

-- Users can insert their own summaries
CREATE POLICY "conversationsummary_insert_own" ON "ConversationSummary"
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = "userId");

-- Users can update their own summaries (not soft-deleted)
CREATE POLICY "conversationsummary_update_own" ON "ConversationSummary"
    FOR UPDATE TO authenticated
    USING (auth.uid()::text = "userId" AND "deletedAt" IS NULL)
    WITH CHECK (auth.uid()::text = "userId");

-- Users can soft-delete their own summaries (update deletedAt)
CREATE POLICY "conversationsummary_delete_own" ON "ConversationSummary"
    FOR DELETE TO authenticated
    USING (auth.uid()::text = "userId");

-- ============================================================================
-- VERIFICATION QUERIES (run after migration to verify)
-- ============================================================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('AuditLog', 'StrategyCanvas', 'ConversationSummary');
