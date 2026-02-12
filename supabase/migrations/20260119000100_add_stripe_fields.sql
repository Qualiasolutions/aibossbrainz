-- Add Stripe fields to User table for payment integration

-- Add Stripe customer ID
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT UNIQUE;

-- Add Stripe subscription ID (for recurring subscriptions)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT UNIQUE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_stripe_customer ON "User"("stripeCustomerId");
CREATE INDEX IF NOT EXISTS idx_user_stripe_subscription ON "User"("stripeSubscriptionId");

-- Comment for documentation
COMMENT ON COLUMN "User"."stripeCustomerId" IS 'Stripe Customer ID for payment processing';
COMMENT ON COLUMN "User"."stripeSubscriptionId" IS 'Stripe Subscription ID for recurring payments';
