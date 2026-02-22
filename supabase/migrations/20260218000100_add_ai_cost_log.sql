-- AICostLog: Per-request AI cost tracking for observability and spend alerting
CREATE TABLE IF NOT EXISTS "AICostLog" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "chatId" TEXT REFERENCES "Chat"(id) ON DELETE SET NULL,
    "modelId" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUSD" NUMERIC(10, 8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aicostlog_createdat ON "AICostLog"("createdAt");

ALTER TABLE "AICostLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON "AICostLog"
    FOR ALL USING (auth.role() = 'service_role');
