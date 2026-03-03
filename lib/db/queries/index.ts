/**
 * Database Queries - Barrel Export
 *
 * Split into domain modules for better maintainability:
 * - user.ts: User, Profile, Subscription, Audit
 * - chat.ts: Chat, Updates, Analytics, Stream
 * - message.ts: Messages, Votes, Reactions
 * - document.ts: Documents, Suggestions
 * - executive.ts: Executive Memory
 * - canvas.ts: Strategy Canvas, Conversation Summary
 */

// Canvas queries
export {
	deleteStrategyCanvas,
	getAllUserCanvases,
	getRecentConversationSummaries,
	getRelevantConversationHistory,
	getStrategyCanvas,
	saveConversationSummary,
	saveStrategyCanvas,
} from "./canvas";
export type { ChatStats } from "./chat";
// Chat queries
export {
	createStreamId,
	deleteAllChatsByUserId,
	deleteChatById,
	getChatById,
	getChatStatsForChats,
	getChatsByUserId,
	getMessageCountByUserId,
	getStreamIdsByChatId,
	saveChat,
	updateChatCategory,
	updateChatLastContextById,
	updateChatPinStatus,
	updateChatTitle,
	updateChatTopic,
	updateChatVisiblityById,
} from "./chat";
// Content Calendar queries
export {
	createContentCalendarPosts,
	deleteContentCalendarPost,
	getContentCalendarByDate,
	getContentCalendarByMonth,
	updateContentCalendarStatus,
} from "./content-calendar";
// Document queries
export {
	deleteDocumentsByIdAfterTimestamp,
	getDocumentById,
	getDocumentsById,
	getDocumentsByUserId,
	getSuggestionsByDocumentId,
	saveDocument,
	saveSuggestions,
} from "./document";
// Executive memory queries
export {
	getExecutiveMemory,
	getExecutiveStats,
	updateExecutiveMemory,
} from "./executive";
// Message queries
export {
	addMessageReaction,
	deleteMessageById,
	deleteMessagesByChatIdAfterTimestamp,
	getMessageById,
	getMessageCountByChatId,
	getMessageReactionCounts,
	getMessageReactions,
	getMessagesByChatId,
	getMessagesByChatIdPaginated,
	getUserReactionForMessage,
	getUserReactionsByType,
	getVotesByChatId,
	removeMessageReaction,
	saveMessages,
	voteMessage,
} from "./message";
// Re-export types from shared
export type {
	BotType,
	CanvasType,
	Chat,
	ContentCalendar,
	ContentCalendarInsert,
	ContentStatus,
	ConversationSummary,
	DBMessage,
	Document,
	ExecutiveMemory,
	Json,
	MessageReaction,
	ReactionType,
	SocialPlatform,
	StrategyCanvas,
	Suggestion,
	User,
	UserCategory,
	VisibilityType,
	Vote,
} from "./shared";
// User queries
export {
	checkUserSubscription,
	createAuditLog,
	createUser,
	ensureUserExists,
	getUser,
	getUserFullProfile,
	getUserProfile,
	updateUserProfile,
} from "./user";
