-- Migration: Add ContentCalendar table
-- Date: 2026-03-04
-- Description: Creates ContentCalendar table for AI-generated social media posts

CREATE TABLE IF NOT EXISTS "ContentCalendar" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "chatId" TEXT REFERENCES "Chat"("id") ON DELETE SET NULL,
    "platform" TEXT NOT NULL CHECK ("platform" IN ('linkedin', 'instagram', 'tiktok', 'facebook', 'twitter', 'generic')),
    "caption" TEXT NOT NULL,
    "hashtags" TEXT[] DEFAULT '{}',
    "visualSuggestion" TEXT,
    "scheduledDate" DATE NOT NULL,
    "scheduledTime" TIME,
    "status" TEXT DEFAULT 'draft' CHECK ("status" IN ('draft', 'scheduled', 'posted')),
    "botType" TEXT CHECK ("botType" IN ('alexandria', 'kim', 'collaborative')),
    "focusMode" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "deletedAt" TIMESTAMP WITH TIME ZONE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_content_calendar_user_date
    ON "ContentCalendar"("userId", "scheduledDate")
    WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_content_calendar_user_status
    ON "ContentCalendar"("userId", "status")
    WHERE "deletedAt" IS NULL;

-- Enable RLS
ALTER TABLE "ContentCalendar" ENABLE ROW LEVEL SECURITY;

-- Users can view their own posts
CREATE POLICY "Users can view own content calendar"
    ON "ContentCalendar"
    FOR SELECT
    USING (auth.uid()::text = "userId" AND "deletedAt" IS NULL);

-- Users can insert their own posts
CREATE POLICY "Users can insert own content calendar"
    ON "ContentCalendar"
    FOR INSERT
    WITH CHECK (auth.uid()::text = "userId");

-- Users can update their own posts
CREATE POLICY "Users can update own content calendar"
    ON "ContentCalendar"
    FOR UPDATE
    USING (auth.uid()::text = "userId")
    WITH CHECK (auth.uid()::text = "userId");

-- Service role bypass for AI tool inserts
CREATE POLICY "Service role full access content calendar"
    ON "ContentCalendar"
    FOR ALL
    USING (auth.role() = 'service_role');
