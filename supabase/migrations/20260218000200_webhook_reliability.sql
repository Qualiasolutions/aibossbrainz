-- StripeWebhookEvent: Event-ID-based deduplication for Stripe webhook idempotency
CREATE TABLE IF NOT EXISTS "StripeWebhookEvent" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "eventId" TEXT NOT NULL UNIQUE,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "processedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stripe_webhook_event_processed ON "StripeWebhookEvent"("processedAt");

ALTER TABLE "StripeWebhookEvent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON "StripeWebhookEvent"
    FOR ALL USING (auth.role() = 'service_role');

-- WebhookDeadLetter: Persist failed webhook events for inspection and replay
CREATE TABLE IF NOT EXISTS "WebhookDeadLetter" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "errorMessage" TEXT NOT NULL,
    "stackTrace" TEXT,
    "webhookPayload" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_dead_letter_created ON "WebhookDeadLetter"("createdAt");

ALTER TABLE "WebhookDeadLetter" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON "WebhookDeadLetter"
    FOR ALL USING (auth.role() = 'service_role');

-- process_webhook_event: Atomic dedup + advisory lock for per-user serialization
CREATE OR REPLACE FUNCTION process_webhook_event(
    event_id TEXT,
    event_type TEXT,
    user_id TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    lock_key BIGINT;
    existing_event_id TEXT;
BEGIN
    -- Generate lock key from user_id hash (0 if null)
    lock_key := COALESCE(hashtext(user_id), 0);

    -- Acquire advisory lock for this user (transaction-scoped, auto-released on commit)
    PERFORM pg_advisory_xact_lock(lock_key);

    -- Check if event already processed
    SELECT "eventId" INTO existing_event_id
    FROM "StripeWebhookEvent"
    WHERE "eventId" = event_id;

    IF existing_event_id IS NOT NULL THEN
        -- Event already processed
        RETURN FALSE;
    END IF;

    -- Insert new event record
    INSERT INTO "StripeWebhookEvent" ("eventId", "eventType", "userId")
    VALUES (event_id, event_type, user_id);

    -- Event is new, should be processed
    RETURN TRUE;
END;
$$;
