-- =============================================================================
-- Boss Brainz — Consolidated Schema Reference
-- Auto-generated from live database on 2026-02-04
-- This file is for REFERENCE ONLY. Do not execute directly.
-- Source of truth: supabase/migrations/ (applied via Supabase dashboard)
-- =============================================================================

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS "User" (
  "id" text NOT NULL DEFAULT (gen_random_uuid())::text,
  "email" text NOT NULL,
  "userType" text,
  "tosAcceptedAt" timestamp with time zone,
  "displayName" text,
  "companyName" text,
  "industry" text,
  "businessGoals" text,
  "preferredBotType" text DEFAULT 'collaborative'::text,
  "onboardedAt" timestamp with time zone,
  "profileUpdatedAt" timestamp with time zone,
  "deletedAt" timestamp with time zone,
  "isAdmin" boolean DEFAULT false,
  "subscriptionType" text DEFAULT 'trial'::text,
  "subscriptionStartDate" timestamp with time zone DEFAULT now(),
  "subscriptionEndDate" timestamp with time zone DEFAULT (now() + '7 days'::interval),
  "subscriptionStatus" text DEFAULT 'active'::text,
  "stripeCustomerId" text,
  "stripeSubscriptionId" text
);

CREATE TABLE IF NOT EXISTS "Chat" (
  "id" text NOT NULL DEFAULT (gen_random_uuid())::text,
  "userId" text NOT NULL,
  "title" text NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "visibility" text NOT NULL DEFAULT 'private'::text,
  "isPinned" boolean NOT NULL DEFAULT false,
  "topic" text,
  "topicColor" text,
  "lastContext" jsonb,
  "deletedAt" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "Message_v2" (
  "id" text NOT NULL DEFAULT (gen_random_uuid())::text,
  "chatId" text NOT NULL,
  "role" text NOT NULL,
  "parts" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "attachments" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "botType" text,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "deletedAt" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "Document" (
  "id" text NOT NULL DEFAULT (gen_random_uuid())::text,
  "userId" text NOT NULL,
  "title" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'text'::text,
  "content" text,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "deletedAt" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "Suggestion" (
  "id" text NOT NULL DEFAULT (gen_random_uuid())::text,
  "userId" text NOT NULL,
  "documentId" text NOT NULL,
  "documentCreatedAt" timestamp with time zone NOT NULL,
  "originalText" text NOT NULL,
  "suggestedText" text NOT NULL,
  "description" text,
  "isResolved" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "deletedAt" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "Vote_v2" (
  "messageId" text NOT NULL,
  "chatId" text NOT NULL,
  "isUpvoted" boolean NOT NULL,
  "deletedAt" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "Stream" (
  "id" text NOT NULL DEFAULT (gen_random_uuid())::text,
  "chatId" text NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "deletedAt" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "MessageReaction" (
  "id" text NOT NULL DEFAULT (gen_random_uuid())::text,
  "messageId" text NOT NULL,
  "userId" text NOT NULL,
  "reactionType" text NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ExecutiveMemory" (
  "id" text NOT NULL DEFAULT (gen_random_uuid())::text,
  "userId" text NOT NULL,
  "executive" text NOT NULL,
  "messageCount" jsonb,
  "preferenceScore" jsonb,
  "topTopics" jsonb,
  "lastUsed" timestamp with time zone,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "UserAnalytics" (
  "id" text NOT NULL DEFAULT (gen_random_uuid())::text,
  "userId" text NOT NULL,
  "date" text NOT NULL,
  "messageCount" jsonb,
  "tokenUsage" jsonb,
  "voiceMinutes" jsonb,
  "exportCount" jsonb,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "StrategyCanvas" (
  "id" text NOT NULL DEFAULT (gen_random_uuid())::text,
  "userId" text NOT NULL,
  "canvasType" text NOT NULL,
  "name" text NOT NULL DEFAULT 'Untitled'::text,
  "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "isDefault" boolean DEFAULT false,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "deletedAt" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "ConversationSummary" (
  "id" text NOT NULL DEFAULT (gen_random_uuid())::text,
  "userId" text NOT NULL,
  "chatId" text,
  "summary" text NOT NULL,
  "topics" text[] DEFAULT '{}'::text[],
  "keyInsights" jsonb DEFAULT '[]'::jsonb,
  "importance" integer DEFAULT 5,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "expiresAt" timestamp with time zone,
  "deletedAt" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid,
  "action" text NOT NULL,
  "resource" text NOT NULL,
  "resourceId" text,
  "details" jsonb DEFAULT '{}'::jsonb,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" text NOT NULL,
  "subject" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open'::text,
  "priority" text NOT NULL DEFAULT 'normal'::text,
  "category" text,
  "assignedAdminId" text,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "resolvedAt" timestamp with time zone,
  "deletedAt" timestamp with time zone,
  "timeSpentMinutes" integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "SupportTicketMessage" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "ticketId" uuid NOT NULL,
  "senderId" text NOT NULL,
  "content" text NOT NULL,
  "isAdminReply" boolean NOT NULL DEFAULT false,
  "isInternal" boolean NOT NULL DEFAULT false,
  "attachments" jsonb DEFAULT '[]'::jsonb,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "deletedAt" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "LandingPageContent" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "section" text NOT NULL,
  "key" text NOT NULL,
  "value" text NOT NULL,
  "type" text NOT NULL DEFAULT 'text'::text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "updatedBy" text,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now()
);

-- =============================================================================
-- PRIMARY KEYS
-- =============================================================================

ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_pkey" PRIMARY KEY ("id");
ALTER TABLE "Message_v2" ADD CONSTRAINT "Message_v2_pkey" PRIMARY KEY ("id");
ALTER TABLE "Document" ADD CONSTRAINT "Document_pkey" PRIMARY KEY ("id");
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id");
ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_pkey" PRIMARY KEY ("messageId", "chatId");
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_pkey" PRIMARY KEY ("id");
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id");
ALTER TABLE "ExecutiveMemory" ADD CONSTRAINT "ExecutiveMemory_pkey" PRIMARY KEY ("id");
ALTER TABLE "UserAnalytics" ADD CONSTRAINT "UserAnalytics_pkey" PRIMARY KEY ("id");
ALTER TABLE "StrategyCanvas" ADD CONSTRAINT "StrategyCanvas_pkey" PRIMARY KEY ("id");
ALTER TABLE "ConversationSummary" ADD CONSTRAINT "ConversationSummary_pkey" PRIMARY KEY ("id");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id");
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id");
ALTER TABLE "LandingPageContent" ADD CONSTRAINT "LandingPageContent_pkey" PRIMARY KEY ("id");

-- =============================================================================
-- UNIQUE CONSTRAINTS
-- =============================================================================

ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email");
ALTER TABLE "User" ADD CONSTRAINT "User_stripeCustomerId_key" UNIQUE ("stripeCustomerId");
ALTER TABLE "User" ADD CONSTRAINT "User_stripeSubscriptionId_key" UNIQUE ("stripeSubscriptionId");
ALTER TABLE "UserAnalytics" ADD CONSTRAINT "UserAnalytics_userId_date_key" UNIQUE ("userId", "date");
ALTER TABLE "LandingPageContent" ADD CONSTRAINT "LandingPageContent_section_key_key" UNIQUE ("section", "key");

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================

ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id");
ALTER TABLE "Message_v2" ADD CONSTRAINT "Message_v2_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id");
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id");
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id");
ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id");
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id");
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message_v2"("id");
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id");
ALTER TABLE "ExecutiveMemory" ADD CONSTRAINT "ExecutiveMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id");
ALTER TABLE "UserAnalytics" ADD CONSTRAINT "UserAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id");
ALTER TABLE "StrategyCanvas" ADD CONSTRAINT "StrategyCanvas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id");
ALTER TABLE "ConversationSummary" ADD CONSTRAINT "ConversationSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id");
ALTER TABLE "ConversationSummary" ADD CONSTRAINT "ConversationSummary_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id");
ALTER TABLE "LandingPageContent" ADD CONSTRAINT "LandingPageContent_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id");
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id");
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id");

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Chat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Suggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Stream" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageReaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExecutiveMemory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAnalytics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StrategyCanvas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationSummary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicketMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LandingPageContent" ENABLE ROW LEVEL SECURITY;
