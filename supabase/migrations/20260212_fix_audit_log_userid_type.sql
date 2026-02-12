-- Fix AuditLog.userId type mismatch
-- Production had: uuid REFERENCES auth.users(id)
-- Should be: text REFERENCES "User"("id") (matching app code)
-- This caused 0 audit rows in production (silent insert failures)

-- Step 1: Drop the RLS policy that depends on userId
DROP POLICY IF EXISTS "Users can view own audit logs" ON "AuditLog";

-- Step 2: Drop the incorrect FK constraint
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";

-- Step 3: Change column type from uuid to text
ALTER TABLE "AuditLog" ALTER COLUMN "userId" TYPE TEXT USING "userId"::TEXT;

-- Step 4: Add correct FK referencing public.User table
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;

-- Step 5: Recreate RLS policy with correct types
CREATE POLICY "Users can view own audit logs" ON "AuditLog"
  FOR SELECT
  USING (auth.uid()::text = "userId");
