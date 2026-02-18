-- Phase 23 Gap Closure: Fix verification gaps from webhook reliability audit

-- Gap 3: Add resolvedAt column for tracking manual resolution/replay
ALTER TABLE "WebhookDeadLetter"
ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_webhook_dead_letter_resolved
ON "WebhookDeadLetter"("resolvedAt")
WHERE "resolvedAt" IS NULL;

-- Gap 2: Add SET search_path = public to SECURITY DEFINER function
CREATE OR REPLACE FUNCTION process_webhook_event(
    event_id TEXT,
    event_type TEXT,
    user_id TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    lock_key BIGINT;
    existing_event_id TEXT;
BEGIN
    lock_key := COALESCE(hashtext(user_id), 0);
    PERFORM pg_advisory_xact_lock(lock_key);

    SELECT "eventId" INTO existing_event_id
    FROM "StripeWebhookEvent"
    WHERE "eventId" = event_id;

    IF existing_event_id IS NOT NULL THEN
        RETURN FALSE;
    END IF;

    INSERT INTO "StripeWebhookEvent" ("eventId", "eventType", "userId")
    VALUES (event_id, event_type, user_id);

    RETURN TRUE;
END;
$$;
