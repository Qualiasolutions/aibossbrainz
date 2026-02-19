-- Add user-assigned category to Chat table for organizing conversations
-- Categories: team (internal team discussions), client (client-related), none (personal/general)

-- Create enum type for user categories
DO $$ BEGIN
    CREATE TYPE user_category AS ENUM ('team', 'client', 'none');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add userCategory column to Chat table with default 'none'
ALTER TABLE "Chat"
ADD COLUMN IF NOT EXISTS "userCategory" user_category DEFAULT 'none';

-- Create index for filtering by category
CREATE INDEX IF NOT EXISTS "Chat_userCategory_idx" ON "Chat" ("userCategory");

-- Combined index for user + category queries
CREATE INDEX IF NOT EXISTS "Chat_userId_userCategory_idx" ON "Chat" ("userId", "userCategory")
WHERE "deletedAt" IS NULL;

COMMENT ON COLUMN "Chat"."userCategory" IS 'User-assigned category: team (internal), client (client-related), none (personal/general)';
