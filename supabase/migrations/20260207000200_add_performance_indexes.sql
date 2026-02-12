-- Performance indexes for common query patterns

CREATE INDEX IF NOT EXISTS idx_chat_userid_deletedat_createdat
  ON "Chat"("userId", "deletedAt", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_message_v2_chatid_deletedat_createdat
  ON "Message_v2"("chatId", "deletedAt", "createdAt" ASC);

CREATE INDEX IF NOT EXISTS idx_message_v2_chatid_role_createdat
  ON "Message_v2"("chatId", "role", "createdAt")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_summary_userid_createdat
  ON "ConversationSummary"("userId", "createdAt" DESC)
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_vote_v2_chatid
  ON "Vote_v2"("chatId")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_reaction_messageid_userid
  ON "MessageReaction"("messageId", "userId");
