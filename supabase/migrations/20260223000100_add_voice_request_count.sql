-- Add voiceRequestCount column to UserAnalytics for accurate DB-fallback rate limiting
-- MED-8: voiceMinutes != request count, need separate counter
ALTER TABLE "UserAnalytics" ADD COLUMN IF NOT EXISTS "voiceRequestCount" JSONB DEFAULT '0';

-- Update record_user_analytics RPC to accept and increment voiceRequestCount
CREATE OR REPLACE FUNCTION record_user_analytics(
  p_user_id TEXT,
  p_date TEXT,
  p_message_count INT DEFAULT 0,
  p_token_usage INT DEFAULT 0,
  p_voice_minutes INT DEFAULT 0,
  p_export_count INT DEFAULT 0,
  p_voice_request_count INT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO "UserAnalytics" ("userId", date, "messageCount", "tokenUsage", "voiceMinutes", "exportCount", "voiceRequestCount")
  VALUES (
    p_user_id,
    p_date,
    to_jsonb(p_message_count),
    to_jsonb(p_token_usage),
    to_jsonb(p_voice_minutes),
    to_jsonb(p_export_count),
    to_jsonb(p_voice_request_count)
  )
  ON CONFLICT ("userId", date)
  DO UPDATE SET
    "messageCount" = to_jsonb(COALESCE(("UserAnalytics"."messageCount")::int, 0) + p_message_count),
    "tokenUsage" = to_jsonb(COALESCE(("UserAnalytics"."tokenUsage")::int, 0) + p_token_usage),
    "voiceMinutes" = to_jsonb(COALESCE(("UserAnalytics"."voiceMinutes")::int, 0) + p_voice_minutes),
    "exportCount" = to_jsonb(COALESCE(("UserAnalytics"."exportCount")::int, 0) + p_export_count),
    "voiceRequestCount" = to_jsonb(COALESCE(("UserAnalytics"."voiceRequestCount")::int, 0) + p_voice_request_count),
    "updatedAt" = NOW();
END;
$$;
