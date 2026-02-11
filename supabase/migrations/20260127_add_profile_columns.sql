-- Migration: Add missing profile columns to User table
-- Date: 2026-01-27
-- Description: Adds displayName, companyName, industry, businessGoals, and preferredBotType colums if they don't exist
-- to ensure compatibility with profile update logic.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessGoals" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredBotType" TEXT;
