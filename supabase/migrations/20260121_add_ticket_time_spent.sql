-- Add time spent tracking to support tickets
-- This allows admins to track how much time they spent on each ticket

ALTER TABLE "SupportTicket"
ADD COLUMN IF NOT EXISTS "timeSpentMinutes" INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN "SupportTicket"."timeSpentMinutes" IS 'Total time spent by admin on this ticket in minutes';
