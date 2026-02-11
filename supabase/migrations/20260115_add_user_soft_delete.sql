-- ============================================
-- USER SOFT DELETE
-- Alecci Media AI - Account Deletion Support
-- Date: 2026-01-15
-- ============================================

-- Add deletedAt column to User table for soft delete
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ DEFAULT NULL;

-- Add index for deletedAt queries
CREATE INDEX IF NOT EXISTS idx_user_deletedat ON "User"("deletedAt");

-- Update RLS policy to exclude soft deleted users
DROP POLICY IF EXISTS "Users can view their own data" ON "User";
CREATE POLICY "Users can view their own data"
ON "User" FOR SELECT
USING (
  "deletedAt" IS NULL
  AND auth.uid()::text = id
);

-- Update policy for users to update their own data
DROP POLICY IF EXISTS "Users can update their own data" ON "User";
CREATE POLICY "Users can update their own data"
ON "User" FOR UPDATE
USING (
  "deletedAt" IS NULL
  AND auth.uid()::text = id
)
WITH CHECK (
  "deletedAt" IS NULL
  AND auth.uid()::text = id
);
