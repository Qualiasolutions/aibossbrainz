-- Add userId indexes to AICostLog for per-user cost queries (COST-04)
CREATE INDEX IF NOT EXISTS idx_aicostlog_userid ON "AICostLog" ("userId");
CREATE INDEX IF NOT EXISTS idx_aicostlog_userid_created ON "AICostLog" ("userId", "createdAt");

-- Allow nullable userId for demo/anonymous cost tracking (COST-03)
ALTER TABLE "AICostLog" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "AICostLog" DROP CONSTRAINT IF EXISTS "AICostLog_userId_fkey";
ALTER TABLE "AICostLog"
  ADD CONSTRAINT "AICostLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;
