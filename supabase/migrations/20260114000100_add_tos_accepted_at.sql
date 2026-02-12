-- Add tosAcceptedAt column to User table for tracking Terms of Service acceptance
-- Run this in Supabase Dashboard SQL Editor

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tosAcceptedAt" TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN "User"."tosAcceptedAt" IS 'Timestamp when user accepted Terms of Service and Privacy Policy';
