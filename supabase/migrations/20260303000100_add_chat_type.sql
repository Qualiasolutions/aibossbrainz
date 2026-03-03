-- Add chatType column to Chat table to distinguish text chats from voice calls
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "chatType" text DEFAULT 'text';

-- Backfill: mark existing chats with "Voice Call" title as voice type
UPDATE "Chat" SET "chatType" = 'voice' WHERE title = 'Voice Call' AND "chatType" = 'text';
