-- Schema Cleanup Migration
-- Drops legacy tables, unused indexes, removes password column, enables pg_cron

-- ============================================
-- 1. DROP LEGACY TABLES (migrated to _v2 versions)
-- ============================================

-- Drop foreign key constraints first
ALTER TABLE IF EXISTS "Vote" DROP CONSTRAINT IF EXISTS "Vote_chatId_fkey";
ALTER TABLE IF EXISTS "Message" DROP CONSTRAINT IF EXISTS "Message_chatId_fkey";

-- Drop legacy tables
DROP TABLE IF EXISTS "Vote";
DROP TABLE IF EXISTS "Message";

-- ============================================
-- 2. REMOVE UNUSED INDEXES
-- ============================================

-- These indexes were identified as never used by Supabase advisor
DROP INDEX IF EXISTS idx_landing_page_updated_by;
DROP INDEX IF EXISTS idx_conversation_summary_chatid;
DROP INDEX IF EXISTS idx_support_ticket_message_senderid;

-- ============================================
-- 3. REMOVE DUPLICATE FUNCTION
-- ============================================

-- Remove the older signature (keeping the better one with IMMUTABLE)
DROP FUNCTION IF EXISTS calculate_subscription_end_date(text, timestamptz);

-- ============================================
-- 4. REMOVE UNUSED PASSWORD COLUMN
-- ============================================

-- Supabase Auth handles passwords - this column is not used
ALTER TABLE "User" DROP COLUMN IF EXISTS password;

-- ============================================
-- 5. ENABLE PG_CRON FOR SUBSCRIPTION EXPIRY
-- ============================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule daily subscription expiry check at midnight UTC
SELECT cron.schedule(
  'expire-subscriptions-daily',
  '0 0 * * *', -- Every day at midnight UTC
  $$SELECT expire_subscriptions()$$
);

-- ============================================
-- 6. ADD USEFUL COMPOSITE INDEX FOR COMMON QUERY
-- ============================================

-- Common query: get user's active chats ordered by date
CREATE INDEX IF NOT EXISTS idx_chat_userid_createdat_active
ON "Chat" ("userId", "createdAt" DESC)
WHERE "deletedAt" IS NULL;
