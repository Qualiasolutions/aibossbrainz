-- Add 'pending' to subscription type and status constraints
-- This enables the new signup flow where users must complete payment before getting trial access

-- Drop existing constraints
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_subscriptionType_check";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_subscriptionStatus_check";

-- Re-add constraints with 'pending' and 'trialing' included
-- subscriptionType: pending (new signup), trial, monthly, annual, lifetime
ALTER TABLE "User"
ADD CONSTRAINT "User_subscriptionType_check"
CHECK ("subscriptionType" IN ('pending', 'trial', 'monthly', 'annual', 'lifetime'));

-- subscriptionStatus: pending (awaiting payment), active, trialing (in trial period), expired, cancelled
ALTER TABLE "User"
ADD CONSTRAINT "User_subscriptionStatus_check"
CHECK ("subscriptionStatus" IN ('pending', 'active', 'trialing', 'expired', 'cancelled'));

-- Update function to handle pending status in expiration logic
CREATE OR REPLACE FUNCTION expire_subscriptions() RETURNS void AS $$
BEGIN
  UPDATE "User"
  SET "subscriptionStatus" = 'expired'
  WHERE "subscriptionEndDate" < now()
    AND "subscriptionStatus" IN ('active', 'trialing')
    AND "deletedAt" IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Comment updates
COMMENT ON COLUMN "User"."subscriptionType" IS 'Type of subscription: pending (awaiting payment), trial (7 days), monthly (1 month), annual (12 months), lifetime (forever)';
COMMENT ON COLUMN "User"."subscriptionStatus" IS 'Current status: pending (awaiting payment), active, trialing (in trial period), expired, or cancelled';
