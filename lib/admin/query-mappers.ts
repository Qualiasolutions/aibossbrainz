import type { Database } from "../supabase/database.types";
import type { SubscriptionStatus, SubscriptionType } from "../supabase/types";
import type { AdminChat, AdminUser, ConversationPreview } from "./queries";

type AdminUserRow =
	Database["public"]["Functions"]["get_admin_users_with_stats"]["Returns"][number];

type AdminChatRow =
	Database["public"]["Functions"]["get_admin_chats_with_stats"]["Returns"][number];

type ConversationRow =
	Database["public"]["Functions"]["get_recent_conversations"]["Returns"][number];

export function mapRpcRowToAdminUser(row: AdminUserRow): AdminUser {
	return {
		id: row.id,
		email: row.email,
		userType: row.userType,
		tosAcceptedAt: row.tosAcceptedAt,
		displayName: row.displayName,
		companyName: row.companyName,
		industry: row.industry,
		businessGoals: row.businessGoals,
		preferredBotType: row.preferredBotType,
		onboardedAt: row.onboardedAt,
		profileUpdatedAt: row.profileUpdatedAt,
		deletedAt: row.deletedAt,
		isAdmin: row.isAdmin,
		subscriptionType: row.subscriptionType as SubscriptionType | null,
		subscriptionStartDate: row.subscriptionStartDate,
		subscriptionEndDate: row.subscriptionEndDate,
		subscriptionStatus: row.subscriptionStatus as SubscriptionStatus | null,
		stripeCustomerId: row.stripeCustomerId,
		stripeSubscriptionId: row.stripeSubscriptionId,
		// Fields not returned by the RPC but required by AdminUser (User type)
		productsServices: null,
		websiteUrl: null,
		targetMarket: null,
		competitors: null,
		annualRevenue: null,
		yearsInBusiness: null,
		employeeCount: null,
		chatCount: Number(row.chatCount) || 0,
		messageCount: Number(row.messageCount) || 0,
		lastActiveAt: row.lastActiveAt,
	};
}

export function mapRpcRowToAdminChat(row: AdminChatRow): AdminChat {
	return {
		id: row.id,
		userId: row.userId,
		title: row.title,
		topic: row.topic,
		topicColor: row.topicColor,
		visibility: row.visibility,
		isPinned: row.isPinned,
		createdAt: row.createdAt,
		deletedAt: row.deletedAt,
		lastContext: row.lastContext ?? null,
		userCategory: null, // Not returned by admin RPC
		userEmail: row.userEmail || "Unknown",
		messageCount: Number(row.messageCount) || 0,
	};
}

export function mapRpcRowToConversationPreview(
	row: ConversationRow,
): ConversationPreview {
	return {
		id: row.id,
		title: row.title,
		userEmail: row.userEmail || "Unknown",
		messageCount: Number(row.messageCount) || 0,
		topic: row.topic,
		topicColor: row.topicColor,
		createdAt: row.createdAt,
	};
}
