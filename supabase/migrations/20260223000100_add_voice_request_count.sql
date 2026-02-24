-- Add voiceRequestCount column to UserAnalytics for accurate DB-fallback rate limiting
-- MED-8: voiceMinutes != request count, need separate counter
-- NOTE: Column must be INTEGER to match existing columns (not JSONB)
ALTER TABLE "UserAnalytics" ADD COLUMN IF NOT EXISTS "voiceRequestCount" INTEGER DEFAULT 0;

-- Drop old 6-param overload to avoid ambiguous function calls
DROP FUNCTION IF EXISTS record_user_analytics(text, text, integer, integer, integer, integer);

-- Recreate single function with all 7 params (all integer, no jsonb casts)
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
  INSERT INTO "UserAnalytics" ("userId", "date", "messageCount", "tokenUsage", "voiceMinutes", "exportCount", "voiceRequestCount")
  VALUES (
    p_user_id,
    p_date,
    p_message_count,
    p_token_usage,
    p_voice_minutes,
    p_export_count,
    p_voice_request_count
  )
  ON CONFLICT ("userId", "date")
  DO UPDATE SET
    "messageCount" = "UserAnalytics"."messageCount" + EXCLUDED."messageCount",
    "tokenUsage" = "UserAnalytics"."tokenUsage" + EXCLUDED."tokenUsage",
    "voiceMinutes" = "UserAnalytics"."voiceMinutes" + EXCLUDED."voiceMinutes",
    "exportCount" = "UserAnalytics"."exportCount" + EXCLUDED."exportCount",
    "voiceRequestCount" = "UserAnalytics"."voiceRequestCount" + EXCLUDED."voiceRequestCount",
    "updatedAt" = NOW();
END;
$$;
