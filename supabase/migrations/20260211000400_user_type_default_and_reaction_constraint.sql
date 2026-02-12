-- Migration: User type default + reaction unique constraint
-- Phase 15, Plan 03

-- 1. Set default value for userType column
ALTER TABLE "User" ALTER COLUMN "userType" SET DEFAULT 'client';

-- 2. Backfill existing NULL userType values to 'client'
UPDATE "User" SET "userType" = 'client' WHERE "userType" IS NULL;

-- 3. Add unique constraint on MessageReaction (messageId, userId, reactionType)
-- Prevents duplicate reaction rows of the same type per user per message
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'MessageReaction_unique_user_reaction'
    AND table_name = 'MessageReaction'
  ) THEN
    ALTER TABLE "MessageReaction"
      ADD CONSTRAINT "MessageReaction_unique_user_reaction"
      UNIQUE ("messageId", "userId", "reactionType");
  END IF;
END $$;
