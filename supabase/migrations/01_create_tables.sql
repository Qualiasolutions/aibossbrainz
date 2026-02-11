-- ============================================
-- CREATE ALL TABLES
-- Alecci Media AI Database Schema
-- Run this FIRST before any other migrations
-- ============================================

-- User table
CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT NOT NULL UNIQUE,
    password TEXT,
    "userType" TEXT
);

-- Chat table
CREATE TABLE IF NOT EXISTS "Chat" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    visibility TEXT NOT NULL DEFAULT 'private',
    "isPinned" BOOLEAN NOT NULL DEFAULT FALSE,
    topic TEXT,
    "topicColor" TEXT,
    "lastContext" JSONB,
    "deletedAt" TIMESTAMPTZ
);

-- Message_v2 table (current messages)
CREATE TABLE IF NOT EXISTS "Message_v2" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "chatId" TEXT NOT NULL REFERENCES "Chat"(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    parts JSONB NOT NULL DEFAULT '[]',
    attachments JSONB NOT NULL DEFAULT '[]',
    "botType" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ
);

-- Message table (legacy)
CREATE TABLE IF NOT EXISTS "Message" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "chatId" TEXT NOT NULL REFERENCES "Chat"(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vote_v2 table (current votes)
CREATE TABLE IF NOT EXISTS "Vote_v2" (
    "messageId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL REFERENCES "Chat"(id) ON DELETE CASCADE,
    "isUpvoted" BOOLEAN NOT NULL,
    "deletedAt" TIMESTAMPTZ,
    PRIMARY KEY ("chatId", "messageId")
);

-- Vote table (legacy)
CREATE TABLE IF NOT EXISTS "Vote" (
    "messageId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL REFERENCES "Chat"(id) ON DELETE CASCADE,
    "isUpvoted" BOOLEAN NOT NULL,
    PRIMARY KEY ("chatId", "messageId")
);

-- Document table
CREATE TABLE IF NOT EXISTS "Document" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'text',
    content TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ
);

-- Suggestion table
CREATE TABLE IF NOT EXISTS "Suggestion" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "documentId" TEXT NOT NULL,
    "documentCreatedAt" TIMESTAMPTZ NOT NULL,
    "originalText" TEXT NOT NULL,
    "suggestedText" TEXT NOT NULL,
    description TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ
);

-- Stream table
CREATE TABLE IF NOT EXISTS "Stream" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "chatId" TEXT NOT NULL REFERENCES "Chat"(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ
);

-- ExecutiveMemory table
CREATE TABLE IF NOT EXISTS "ExecutiveMemory" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    executive TEXT NOT NULL,
    "messageCount" JSONB,
    "preferenceScore" JSONB,
    "topTopics" JSONB,
    "lastUsed" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ
);

-- MessageReaction table
CREATE TABLE IF NOT EXISTS "MessageReaction" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "messageId" TEXT NOT NULL REFERENCES "Message_v2"(id) ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "reactionType" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- UserAnalytics table
CREATE TABLE IF NOT EXISTS "UserAnalytics" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    "messageCount" JSONB,
    "tokenUsage" JSONB,
    "voiceMinutes" JSONB,
    "exportCount" JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ,
    UNIQUE("userId", date)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_chat_userid ON "Chat"("userId");
CREATE INDEX IF NOT EXISTS idx_chat_visibility ON "Chat"(visibility);
CREATE INDEX IF NOT EXISTS idx_chat_createdat ON "Chat"("createdAt");
CREATE INDEX IF NOT EXISTS idx_chat_deletedat ON "Chat"("deletedAt");
CREATE INDEX IF NOT EXISTS idx_message_v2_chatid ON "Message_v2"("chatId");
CREATE INDEX IF NOT EXISTS idx_message_v2_createdat ON "Message_v2"("createdAt");
CREATE INDEX IF NOT EXISTS idx_message_v2_deletedat ON "Message_v2"("deletedAt");
CREATE INDEX IF NOT EXISTS idx_message_chatid ON "Message"("chatId");
CREATE INDEX IF NOT EXISTS idx_vote_v2_chatid ON "Vote_v2"("chatId");
CREATE INDEX IF NOT EXISTS idx_document_userid ON "Document"("userId");
CREATE INDEX IF NOT EXISTS idx_suggestion_userid ON "Suggestion"("userId");
CREATE INDEX IF NOT EXISTS idx_suggestion_documentid ON "Suggestion"("documentId");
CREATE INDEX IF NOT EXISTS idx_stream_chatid ON "Stream"("chatId");
CREATE INDEX IF NOT EXISTS idx_executivememory_userid ON "ExecutiveMemory"("userId");
CREATE INDEX IF NOT EXISTS idx_messagereaction_messageid ON "MessageReaction"("messageId");
CREATE INDEX IF NOT EXISTS idx_messagereaction_userid ON "MessageReaction"("userId");
CREATE INDEX IF NOT EXISTS idx_useranalytics_userid ON "UserAnalytics"("userId");

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_chat_userid_deletedat ON "Chat"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS idx_message_v2_chatid_deletedat ON "Message_v2"("chatId", "deletedAt");
