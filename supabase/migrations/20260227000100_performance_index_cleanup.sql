-- Performance cleanup: add FK index for AICostLog.chatId (JOIN performance),
-- drop 7 unused indexes identified via pg_stat_user_indexes (zero scans, write overhead only).
-- Auth connection strategy: switch to percentage-based in Supabase Dashboard
-- (Project Settings > Database > Connection Pooling), not SQL-actionable.

-- Add missing FK covering index
CREATE INDEX IF NOT EXISTS idx_aicostlog_chatid ON "AICostLog" ("chatId");

-- Drop unused indexes (0 scans each, confirmed via pg_stat_user_indexes)
DROP INDEX IF EXISTS idx_aicostlog_createdat;
DROP INDEX IF EXISTS idx_aicostlog_userid;
DROP INDEX IF EXISTS idx_stripe_webhook_event_processed;
DROP INDEX IF EXISTS idx_webhook_dead_letter_resolved;
DROP INDEX IF EXISTS idx_webhook_dead_letter_created;
DROP INDEX IF EXISTS idx_stream_chatid_createdat;
-- idx_support_ticket_message_sender_id: KEPT — needed as FK covering index for
-- SupportTicketMessage_senderId_fkey (cascading deletes on parent table).
-- Was initially dropped as "unused" but Supabase advisor correctly flags unindexed FKs.
DROP INDEX IF EXISTS "Chat_userCategory_idx";
