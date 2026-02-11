-- Admin RPC functions to eliminate N+1 query patterns
-- These functions aggregate data in single queries for better performance

-- Get all users with their stats (chat count, message count, last active)
CREATE OR REPLACE FUNCTION get_admin_users_with_stats()
RETURNS TABLE (
  id TEXT,
  email TEXT,
  "userType" TEXT,
  "tosAcceptedAt" TIMESTAMPTZ,
  "displayName" TEXT,
  "companyName" TEXT,
  industry TEXT,
  "businessGoals" TEXT,
  "preferredBotType" TEXT,
  "onboardedAt" TIMESTAMPTZ,
  "profileUpdatedAt" TIMESTAMPTZ,
  "deletedAt" TIMESTAMPTZ,
  "isAdmin" BOOLEAN,
  "subscriptionType" TEXT,
  "subscriptionStartDate" TIMESTAMPTZ,
  "subscriptionEndDate" TIMESTAMPTZ,
  "subscriptionStatus" TEXT,
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "chatCount" BIGINT,
  "messageCount" BIGINT,
  "lastActiveAt" TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email,
    u."userType",
    u."tosAcceptedAt",
    u."displayName",
    u."companyName",
    u.industry,
    u."businessGoals",
    u."preferredBotType",
    u."onboardedAt",
    u."profileUpdatedAt",
    u."deletedAt",
    u."isAdmin",
    u."subscriptionType",
    u."subscriptionStartDate",
    u."subscriptionEndDate",
    u."subscriptionStatus",
    u."stripeCustomerId",
    u."stripeSubscriptionId",
    COUNT(DISTINCT c.id) AS "chatCount",
    COUNT(DISTINCT m.id) AS "messageCount",
    MAX(m."createdAt") AS "lastActiveAt"
  FROM "User" u
  LEFT JOIN "Chat" c ON c."userId" = u.id AND c."deletedAt" IS NULL
  LEFT JOIN "Message_v2" m ON m."chatId" = c.id AND m."deletedAt" IS NULL
  WHERE u."deletedAt" IS NULL
  GROUP BY u.id
  ORDER BY u."onboardedAt" DESC NULLS LAST;
$$;

-- Get all chats with user info and message count (for admin panel)
CREATE OR REPLACE FUNCTION get_admin_chats_with_stats()
RETURNS TABLE (
  id TEXT,
  "userId" TEXT,
  title TEXT,
  topic TEXT,
  "topicColor" TEXT,
  visibility TEXT,
  "isPinned" BOOLEAN,
  "createdAt" TIMESTAMPTZ,
  "deletedAt" TIMESTAMPTZ,
  "lastContext" JSONB,
  "userEmail" TEXT,
  "userDisplayName" TEXT,
  "messageCount" BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c."userId",
    c.title,
    c.topic,
    c."topicColor",
    c.visibility,
    c."isPinned",
    c."createdAt",
    c."deletedAt",
    c."lastContext",
    u.email AS "userEmail",
    u."displayName" AS "userDisplayName",
    COUNT(m.id) AS "messageCount"
  FROM "Chat" c
  LEFT JOIN "User" u ON u.id = c."userId"
  LEFT JOIN "Message_v2" m ON m."chatId" = c.id AND m."deletedAt" IS NULL
  WHERE c."deletedAt" IS NULL
  GROUP BY c.id, u.email, u."displayName"
  ORDER BY c."createdAt" DESC;
$$;

-- Get recent conversations for dashboard (with user info and message count)
CREATE OR REPLACE FUNCTION get_recent_conversations(p_limit INT DEFAULT 20)
RETURNS TABLE (
  id TEXT,
  "userId" TEXT,
  title TEXT,
  topic TEXT,
  "topicColor" TEXT,
  "createdAt" TIMESTAMPTZ,
  "userEmail" TEXT,
  "userDisplayName" TEXT,
  "messageCount" BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c."userId",
    c.title,
    c.topic,
    c."topicColor",
    c."createdAt",
    u.email AS "userEmail",
    u."displayName" AS "userDisplayName",
    COUNT(m.id) AS "messageCount"
  FROM "Chat" c
  LEFT JOIN "User" u ON u.id = c."userId"
  LEFT JOIN "Message_v2" m ON m."chatId" = c.id AND m."deletedAt" IS NULL
  WHERE c."deletedAt" IS NULL
  GROUP BY c.id, u.email, u."displayName"
  ORDER BY c."createdAt" DESC
  LIMIT p_limit;
$$;

-- Get single user with stats (for user detail page)
CREATE OR REPLACE FUNCTION get_admin_user_by_id(p_user_id TEXT)
RETURNS TABLE (
  id TEXT,
  email TEXT,
  "userType" TEXT,
  "tosAcceptedAt" TIMESTAMPTZ,
  "displayName" TEXT,
  "companyName" TEXT,
  industry TEXT,
  "businessGoals" TEXT,
  "preferredBotType" TEXT,
  "onboardedAt" TIMESTAMPTZ,
  "profileUpdatedAt" TIMESTAMPTZ,
  "deletedAt" TIMESTAMPTZ,
  "isAdmin" BOOLEAN,
  "subscriptionType" TEXT,
  "subscriptionStartDate" TIMESTAMPTZ,
  "subscriptionEndDate" TIMESTAMPTZ,
  "subscriptionStatus" TEXT,
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "chatCount" BIGINT,
  "messageCount" BIGINT,
  "lastActiveAt" TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email,
    u."userType",
    u."tosAcceptedAt",
    u."displayName",
    u."companyName",
    u.industry,
    u."businessGoals",
    u."preferredBotType",
    u."onboardedAt",
    u."profileUpdatedAt",
    u."deletedAt",
    u."isAdmin",
    u."subscriptionType",
    u."subscriptionStartDate",
    u."subscriptionEndDate",
    u."subscriptionStatus",
    u."stripeCustomerId",
    u."stripeSubscriptionId",
    COUNT(DISTINCT c.id) AS "chatCount",
    COUNT(DISTINCT m.id) AS "messageCount",
    MAX(m."createdAt") AS "lastActiveAt"
  FROM "User" u
  LEFT JOIN "Chat" c ON c."userId" = u.id AND c."deletedAt" IS NULL
  LEFT JOIN "Message_v2" m ON m."chatId" = c.id AND m."deletedAt" IS NULL
  WHERE u.id = p_user_id
  GROUP BY u.id;
$$;

COMMENT ON FUNCTION get_admin_users_with_stats() IS 'Returns all users with aggregated stats in a single query - eliminates N+1 pattern';
COMMENT ON FUNCTION get_admin_chats_with_stats() IS 'Returns all chats with user info and message counts in a single query';
COMMENT ON FUNCTION get_recent_conversations(INT) IS 'Returns recent conversations with stats for admin dashboard';
COMMENT ON FUNCTION get_admin_user_by_id(TEXT) IS 'Returns a single user with stats for admin user detail page';
