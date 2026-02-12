-- RPC function to fetch bounded messages: first message + last N-1 messages
-- Prevents unbounded memory usage when loading messages for long conversations

CREATE OR REPLACE FUNCTION get_bounded_messages(
  p_chat_id TEXT,
  p_max_messages INT DEFAULT 60
)
RETURNS SETOF "Message_v2"
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total_count INT;
BEGIN
  SELECT COUNT(*) INTO v_total_count
  FROM "Message_v2"
  WHERE "chatId" = p_chat_id AND "deletedAt" IS NULL;

  IF v_total_count <= p_max_messages THEN
    RETURN QUERY
    SELECT * FROM "Message_v2"
    WHERE "chatId" = p_chat_id AND "deletedAt" IS NULL
    ORDER BY "createdAt" ASC;
    RETURN;
  END IF;

  RETURN QUERY
  (
    SELECT * FROM "Message_v2"
    WHERE "chatId" = p_chat_id AND "deletedAt" IS NULL
    ORDER BY "createdAt" ASC
    LIMIT 1
  )
  UNION ALL
  (
    SELECT * FROM (
      SELECT * FROM "Message_v2"
      WHERE "chatId" = p_chat_id AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT (p_max_messages - 1)
    ) sub
    ORDER BY "createdAt" ASC
  );
END;
$$;

COMMENT ON FUNCTION get_bounded_messages(TEXT, INT) IS 'Fetches first + last N-1 messages for a chat, preventing unbounded memory usage';
