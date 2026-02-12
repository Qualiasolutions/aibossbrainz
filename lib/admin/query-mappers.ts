import type { SubscriptionStatus, SubscriptionType } from "../supabase/types";
import type { AdminChat, AdminUser, ConversationPreview } from "./queries";

type RpcRow = Record<string, unknown>;

export function mapRpcRowToAdminUser(row: RpcRow): AdminUser {
	return {
		id: row.id as string,
		email: row.email as string,
		userType: row.userType as string | null,
		tosAcceptedAt: row.tosAcceptedAt as string | null,
		displayName: row.displayName as string | null,
		companyName: row.companyName as string | null,
		industry: row.industry as string | null,
		businessGoals: row.businessGoals as string | null,
		preferredBotType: row.preferredBotType as string | null,
		onboardedAt: row.onboardedAt as string | null,
		profileUpdatedAt: row.profileUpdatedAt as string | null,
		deletedAt: row.deletedAt as string | null,
		isAdmin: row.isAdmin as boolean | null,
		subscriptionType: row.subscriptionType as SubscriptionType | null,
		subscriptionStartDate: row.subscriptionStartDate as string | null,
		subscriptionEndDate: row.subscriptionEndDate as string | null,
		subscriptionStatus: row.subscriptionStatus as SubscriptionStatus | null,
		stripeCustomerId: row.stripeCustomerId as string | null,
		stripeSubscriptionId: row.stripeSubscriptionId as string | null,
		productsServices: row.productsServices as string | null,
		websiteUrl: row.websiteUrl as string | null,
		targetMarket: row.targetMarket as string | null,
		competitors: row.competitors as string | null,
		annualRevenue: row.annualRevenue as string | null,
		yearsInBusiness: row.yearsInBusiness as string | null,
		employeeCount: row.employeeCount as string | null,
		chatCount: Number(row.chatCount) || 0,
		messageCount: Number(row.messageCount) || 0,
		lastActiveAt: row.lastActiveAt as string | null,
	};
}

export function mapRpcRowToAdminChat(row: RpcRow): AdminChat {
	return {
		id: row.id as string,
		userId: row.userId as string,
		title: row.title as string,
		topic: row.topic as string | null,
		topicColor: row.topicColor as string | null,
		visibility: row.visibility as string,
		isPinned: row.isPinned as boolean,
		createdAt: row.createdAt as string,
		deletedAt: row.deletedAt as string | null,
		lastContext: (row.lastContext as AdminChat["lastContext"]) ?? null,
		userEmail: (row.userEmail as string) || "Unknown",
		messageCount: Number(row.messageCount) || 0,
	};
}

export function mapRpcRowToConversationPreview(
	row: RpcRow,
): ConversationPreview {
	return {
		id: row.id as string,
		title: row.title as string,
		userEmail: (row.userEmail as string) || "Unknown",
		messageCount: Number(row.messageCount) || 0,
		topic: row.topic as string | null,
		topicColor: row.topicColor as string | null,
		createdAt: row.createdAt as string,
	};
}
