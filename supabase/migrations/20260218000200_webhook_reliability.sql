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
