-- Fix userType default: new signups should be Subscriber (null), not Client
-- Alexandria manually tags actual Alecci Media clients via admin panel
ALTER TABLE "User" ALTER COLUMN "userType" SET DEFAULT NULL;

-- Fix existing users tagged as 'client' by the old default
UPDATE "User" SET "userType" = NULL WHERE "userType" = 'client' AND "deletedAt" IS NULL;

-- Fix trialing users incorrectly tagged with plan type instead of 'trial'
UPDATE "User" SET "subscriptionType" = 'trial'
WHERE "subscriptionStatus" = 'trialing'
  AND "subscriptionType" != 'trial'
  AND "deletedAt" IS NULL;
