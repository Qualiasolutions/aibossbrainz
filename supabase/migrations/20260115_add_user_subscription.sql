-- Add subscription fields to User table for trial and membership tracking
-- Subscription types: 'trial' (7 days), 'monthly' (1 month), 'annual' (12 months), 'lifetime' (forever)

-- Add subscription columns to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "subscriptionType" text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS "subscriptionStartDate" timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS "subscriptionEndDate" timestamp with time zone DEFAULT (now() + interval '7 days'),
ADD COLUMN IF NOT EXISTS "subscriptionStatus" text DEFAULT 'active';

-- Add constraints for subscription type
ALTER TABLE "User"
ADD CONSTRAINT "User_subscriptionType_check"
CHECK ("subscriptionType" IN ('trial', 'monthly', 'annual', 'lifetime'));

-- Add constraints for subscription status
ALTER TABLE "User"
ADD CONSTRAINT "User_subscriptionStatus_check"
CHECK ("subscriptionStatus" IN ('active', 'expired', 'cancelled'));

-- Create index for subscription queries
CREATE INDEX IF NOT EXISTS "User_subscriptionEndDate_idx" ON "User" ("subscriptionEndDate");
CREATE INDEX IF NOT EXISTS "User_subscriptionStatus_idx" ON "User" ("subscriptionStatus");

-- Comment on columns
COMMENT ON COLUMN "User"."subscriptionType" IS 'Type of subscription: trial (7 days), monthly (1 month), annual (12 months), lifetime (forever)';
COMMENT ON COLUMN "User"."subscriptionStartDate" IS 'When the current subscription period started';
COMMENT ON COLUMN "User"."subscriptionEndDate" IS 'When the current subscription period ends';
COMMENT ON COLUMN "User"."subscriptionStatus" IS 'Current status: active, expired, or cancelled';

-- Function to calculate subscription end date based on type
CREATE OR REPLACE FUNCTION calculate_subscription_end_date(
  start_date timestamp with time zone,
  sub_type text
) RETURNS timestamp with time zone AS $$
BEGIN
  CASE sub_type
    WHEN 'trial' THEN RETURN start_date + interval '7 days';
    WHEN 'monthly' THEN RETURN start_date + interval '1 month';
    WHEN 'annual' THEN RETURN start_date + interval '12 months';
    WHEN 'lifetime' THEN RETURN start_date + interval '100 years';
    ELSE RETURN start_date + interval '7 days';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check and expire subscriptions (to be called by cron job)
CREATE OR REPLACE FUNCTION expire_subscriptions() RETURNS void AS $$
BEGIN
  UPDATE "User"
  SET "subscriptionStatus" = 'expired'
  WHERE "subscriptionEndDate" < now()
    AND "subscriptionStatus" = 'active'
    AND "deletedAt" IS NULL;
END;
$$ LANGUAGE plpgsql;
