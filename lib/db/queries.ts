/**
 * Database Queries
 *
 * This file re-exports all queries from the split domain modules.
 * The queries are now organized in lib/db/queries/ by domain:
 * - user.ts: User, Profile, Subscription, Audit
 * - chat.ts: Chat, Updates, Analytics, Stream
 * - message.ts: Messages, Votes, Reactions
 * - document.ts: Documents, Suggestions
 * - executive.ts: Executive Memory
 * - canvas.ts: Strategy Canvas, Conversation Summary
 *
 * All existing imports from "@/lib/db/queries" continue to work.
 */

export * from "./queries/index";
