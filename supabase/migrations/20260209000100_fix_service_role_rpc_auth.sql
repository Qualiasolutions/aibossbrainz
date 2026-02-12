-- FIX: Allow service_role calls to admin RPC functions
-- The service_role client bypasses auth, so auth.uid() returns NULL.
-- We need to allow service_role calls while still requiring admin status for regular users.

-- 1. get_admin_users_with_stats - allow service_role
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role OR admin users
  IF NOT (
    -- Check if called with service_role (bypass auth.uid() check)
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
    OR EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
      AND "User"."isAdmin" = TRUE
      AND "User"."deletedAt" IS NULL
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.id, u.email, u."userType", u."tosAcceptedAt", u."displayName",
    u."companyName", u.industry, u."businessGoals", u."preferredBotType",
    u."onboardedAt", u."profileUpdatedAt", u."deletedAt", u."isAdmin",
    u."subscriptionType", u."subscriptionStartDate", u."subscriptionEndDate",
    u."subscriptionStatus", u."stripeCustomerId", u."stripeSubscriptionId",
    COUNT(DISTINCT c.id) AS "chatCount",
    COUNT(DISTINCT m.id) AS "messageCount",
    MAX(m."createdAt") AS "lastActiveAt"
  FROM "User" u
  LEFT JOIN "Chat" c ON c."userId" = u.id AND c."deletedAt" IS NULL
  LEFT JOIN "Message_v2" m ON m."chatId" = c.id AND m."deletedAt" IS NULL
  WHERE u."deletedAt" IS NULL
  GROUP BY u.id
  ORDER BY u."onboardedAt" DESC NULLS LAST;
END;
$$;

-- 2. get_admin_chats_with_stats - allow service_role
CREATE OR REPLACE FUNCTION get_admin_chats_with_stats()
RETURNS TABLE (
  id TEXT, "userId" TEXT, title TEXT, topic TEXT, "topicColor" TEXT,
  visibility TEXT, "isPinned" BOOLEAN, "createdAt" TIMESTAMPTZ,
  "deletedAt" TIMESTAMPTZ, "lastContext" JSONB,
  "userEmail" TEXT, "userDisplayName" TEXT, "messageCount" BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role OR admin users
  IF NOT (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
    OR EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
      AND "User"."isAdmin" = TRUE
      AND "User"."deletedAt" IS NULL
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    c.id, c."userId", c.title, c.topic, c."topicColor", c.visibility,
    c."isPinned", c."createdAt", c."deletedAt", c."lastContext",
    u.email AS "userEmail", u."displayName" AS "userDisplayName",
    COUNT(m.id) AS "messageCount"
  FROM "Chat" c
  LEFT JOIN "User" u ON u.id = c."userId"
  LEFT JOIN "Message_v2" m ON m."chatId" = c.id AND m."deletedAt" IS NULL
  WHERE c."deletedAt" IS NULL
  GROUP BY c.id, u.email, u."displayName"
  ORDER BY c."createdAt" DESC;
END;
$$;

-- 3. get_recent_conversations - allow service_role
CREATE OR REPLACE FUNCTION get_recent_conversations(p_limit INT DEFAULT 20)
RETURNS TABLE (
  id TEXT, "userId" TEXT, title TEXT, topic TEXT, "topicColor" TEXT,
  "createdAt" TIMESTAMPTZ, "userEmail" TEXT, "userDisplayName" TEXT,
  "messageCount" BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role OR admin users
  IF NOT (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
    OR EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
      AND "User"."isAdmin" = TRUE
      AND "User"."deletedAt" IS NULL
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    c.id, c."userId", c.title, c.topic, c."topicColor", c."createdAt",
    u.email AS "userEmail", u."displayName" AS "userDisplayName",
    COUNT(m.id) AS "messageCount"
  FROM "Chat" c
  LEFT JOIN "User" u ON u.id = c."userId"
  LEFT JOIN "Message_v2" m ON m."chatId" = c.id AND m."deletedAt" IS NULL
  WHERE c."deletedAt" IS NULL
  GROUP BY c.id, u.email, u."displayName"
  ORDER BY c."createdAt" DESC
  LIMIT p_limit;
END;
$$;

-- 4. get_admin_user_by_id - allow service_role
CREATE OR REPLACE FUNCTION get_admin_user_by_id(p_user_id TEXT)
RETURNS TABLE (
  id TEXT, email TEXT, "userType" TEXT, "tosAcceptedAt" TIMESTAMPTZ,
  "displayName" TEXT, "companyName" TEXT, industry TEXT, "businessGoals" TEXT,
  "preferredBotType" TEXT, "onboardedAt" TIMESTAMPTZ, "profileUpdatedAt" TIMESTAMPTZ,
  "deletedAt" TIMESTAMPTZ, "isAdmin" BOOLEAN, "subscriptionType" TEXT,
  "subscriptionStartDate" TIMESTAMPTZ, "subscriptionEndDate" TIMESTAMPTZ,
  "subscriptionStatus" TEXT, "stripeCustomerId" TEXT, "stripeSubscriptionId" TEXT,
  "chatCount" BIGINT, "messageCount" BIGINT, "lastActiveAt" TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role OR admin users
  IF NOT (
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
    OR EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
      AND "User"."isAdmin" = TRUE
      AND "User"."deletedAt" IS NULL
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.id, u.email, u."userType", u."tosAcceptedAt", u."displayName",
    u."companyName", u.industry, u."businessGoals", u."preferredBotType",
    u."onboardedAt", u."profileUpdatedAt", u."deletedAt", u."isAdmin",
    u."subscriptionType", u."subscriptionStartDate", u."subscriptionEndDate",
    u."subscriptionStatus", u."stripeCustomerId", u."stripeSubscriptionId",
    COUNT(DISTINCT c.id) AS "chatCount",
    COUNT(DISTINCT m.id) AS "messageCount",
    MAX(m."createdAt") AS "lastActiveAt"
  FROM "User" u
  LEFT JOIN "Chat" c ON c."userId" = u.id AND c."deletedAt" IS NULL
  LEFT JOIN "Message_v2" m ON m."chatId" = c.id AND m."deletedAt" IS NULL
  WHERE u.id = p_user_id
  GROUP BY u.id;
END;
$$;
