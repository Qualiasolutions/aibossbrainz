import "server-only";

import { createServiceClient } from "../supabase/server";
import type {
  Chat,
  DBMessage,
  SubscriptionStatus,
  SubscriptionType,
  User,
} from "../supabase/types";
import {
  mapRpcRowToAdminChat,
  mapRpcRowToAdminUser,
  mapRpcRowToConversationPreview,
} from "./query-mappers";

// ============================================
// ADMIN USER QUERIES (uses service role - bypasses RLS)
// ============================================

export type AdminUser = User & {
  chatCount: number;
  messageCount: number;
  lastActiveAt: string | null;
};

export async function getAllUsers(): Promise<AdminUser[]> {
  const supabase = createServiceClient();

  // Use RPC function to get all users with stats in a single query
  // This eliminates N+1 query pattern (previously 4 queries per user)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(
    "get_admin_users_with_stats",
  );

  if (error) throw error;

  return (data || []).map(mapRpcRowToAdminUser);
}

export async function getUserById(userId: string): Promise<AdminUser | null> {
  const supabase = createServiceClient();

  // Use RPC function to get user with stats in a single query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("get_admin_user_by_id", {
    p_user_id: userId,
  });

  if (error || !data || data.length === 0) return null;

  return mapRpcRowToAdminUser(data[0]);
}

const SUBSCRIPTION_DURATION: Record<
  SubscriptionType,
  { unit: "days" | "months" | "years"; value: number }
> = {
  pending: { unit: "days", value: 0 },
  trial: { unit: "days", value: 7 },
  monthly: { unit: "months", value: 1 },
  annual: { unit: "months", value: 12 },
  lifetime: { unit: "years", value: 100 },
};

function calculateSubscriptionEndDate(
  startDate: Date,
  subscriptionType: SubscriptionType,
): Date {
  const endDate = new Date(startDate);
  const duration = SUBSCRIPTION_DURATION[subscriptionType];

  if (duration.unit === "days") {
    endDate.setDate(endDate.getDate() + duration.value);
  } else if (duration.unit === "months") {
    endDate.setMonth(endDate.getMonth() + duration.value);
  } else {
    endDate.setFullYear(endDate.getFullYear() + duration.value);
  }

  return endDate;
}

export async function createUserByAdmin({
  email,
  displayName,
  companyName,
  industry,
  isAdmin = false,
  subscriptionType = "trial",
}: {
  email: string;
  displayName?: string;
  companyName?: string;
  industry?: string;
  isAdmin?: boolean;
  subscriptionType?: SubscriptionType;
}) {
  const supabase = createServiceClient();

  // First, create the user in Supabase Auth and send invite email
  const { data: authData, error: authError } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        display_name: displayName,
        company_name: companyName,
      },
    });

  if (authError) {
    // If user already exists in auth, try to get their ID
    if (authError.message.includes("already been registered")) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email === email);
      if (existingUser) {
        throw new Error(
          `User with email ${email} already exists. You can update their profile instead.`,
        );
      }
    }
    throw authError;
  }

  if (!authData.user) {
    throw new Error("Failed to create auth user");
  }

  const startDate = new Date();
  const endDate = calculateSubscriptionEndDate(startDate, subscriptionType);

  // Create the user record in our User table with the auth user's ID
  const { data, error } = await supabase
    .from("User")
    .insert({
      id: authData.user.id,
      email,
      displayName,
      companyName,
      industry,
      isAdmin,
      subscriptionType,
      subscriptionStartDate: startDate.toISOString(),
      subscriptionEndDate: endDate.toISOString(),
      subscriptionStatus: "active" as SubscriptionStatus,
    })
    .select()
    .single();

  if (error) {
    // If User table insert fails, clean up the auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw error;
  }

  return data;
}

export async function updateUserByAdmin(
  userId: string,
  updates: {
    displayName?: string;
    companyName?: string;
    industry?: string;
    userType?: string;
    isAdmin?: boolean;
    subscriptionType?: SubscriptionType;
    subscriptionStatus?: SubscriptionStatus;
  },
) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("User")
    .update({
      ...updates,
      profileUpdatedAt: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update user subscription (change type and reset dates)
export async function updateUserSubscription(
  userId: string,
  subscriptionType: SubscriptionType,
) {
  const supabase = createServiceClient();

  const startDate = new Date();
  const endDate = calculateSubscriptionEndDate(startDate, subscriptionType);

  const { data, error } = await supabase
    .from("User")
    .update({
      subscriptionType,
      subscriptionStartDate: startDate.toISOString(),
      subscriptionEndDate: endDate.toISOString(),
      subscriptionStatus: "active" as SubscriptionStatus,
      profileUpdatedAt: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Expire all subscriptions that have passed their end date
export async function expireSubscriptions() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("User")
    .update({
      subscriptionStatus: "expired" as SubscriptionStatus,
    })
    .lt("subscriptionEndDate", new Date().toISOString())
    .eq("subscriptionStatus", "active")
    .is("deletedAt", null)
    .select();

  if (error) throw error;
  return data;
}

// Check if a user's subscription is active
export async function isSubscriptionActive(userId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("User")
    .select("subscriptionStatus, subscriptionEndDate")
    .eq("id", userId)
    .single();

  if (error || !data) return false;

  // Check if status is active and end date hasn't passed
  if (data.subscriptionStatus !== "active") return false;
  if (
    data.subscriptionEndDate &&
    new Date(data.subscriptionEndDate) < new Date()
  )
    return false;

  return true;
}

export async function deleteUserByAdmin(userId: string) {
  const supabase = createServiceClient();

  // Soft delete all related data
  const deletedAt = new Date().toISOString();

  // Get user's chats
  const { data: userChats } = await supabase
    .from("Chat")
    .select("id")
    .eq("userId", userId);

  const chatIds = userChats?.map((c) => c.id) || [];

  if (chatIds.length > 0) {
    // Soft delete messages
    await supabase
      .from("Message_v2")
      .update({ deletedAt })
      .in("chatId", chatIds);

    // Soft delete votes
    await supabase.from("Vote_v2").update({ deletedAt }).in("chatId", chatIds);

    // Soft delete streams
    await supabase.from("Stream").update({ deletedAt }).in("chatId", chatIds);

    // Soft delete chats
    await supabase.from("Chat").update({ deletedAt }).in("id", chatIds);
  }

  // Soft delete documents
  await supabase.from("Document").update({ deletedAt }).eq("userId", userId);

  // Soft delete conversation summaries
  await supabase
    .from("ConversationSummary")
    .update({ deletedAt })
    .eq("userId", userId);

  // Soft delete strategy canvases
  await supabase
    .from("StrategyCanvas")
    .update({ deletedAt })
    .eq("userId", userId);

  // Soft delete the user record
  const { error } = await supabase
    .from("User")
    .update({ deletedAt })
    .eq("id", userId);

  if (error) throw error;

  // Delete the user from Supabase Auth so they can't log in
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) {
    console.error(
      `[Admin] Failed to delete auth user ${userId}:`,
      authError.message,
    );
  }
}

// ============================================
// ADMIN STATS QUERIES
// ============================================

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalChats: number;
  totalMessages: number;
  messagesLast24h: number;
  messagesLast7d: number;
  topExecutive: string | null;
  executiveBreakdown: { executive: string; count: number }[];
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = createServiceClient();

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const last7d = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Get user counts
  const { count: totalUsers } = await supabase
    .from("User")
    .select("*", { count: "exact", head: true })
    .is("deletedAt", null);

  // Active users (onboarded)
  const { count: activeUsers } = await supabase
    .from("User")
    .select("*", { count: "exact", head: true })
    .is("deletedAt", null)
    .not("onboardedAt", "is", null);

  // Chat counts
  const { count: totalChats } = await supabase
    .from("Chat")
    .select("*", { count: "exact", head: true })
    .is("deletedAt", null);

  // Message counts
  const { count: totalMessages } = await supabase
    .from("Message_v2")
    .select("*", { count: "exact", head: true })
    .is("deletedAt", null);

  const { count: messagesLast24h } = await supabase
    .from("Message_v2")
    .select("*", { count: "exact", head: true })
    .is("deletedAt", null)
    .gte("createdAt", last24h);

  const { count: messagesLast7d } = await supabase
    .from("Message_v2")
    .select("*", { count: "exact", head: true })
    .is("deletedAt", null)
    .gte("createdAt", last7d);

  // Executive breakdown
  const { data: botTypeMessages } = await supabase
    .from("Message_v2")
    .select("botType")
    .is("deletedAt", null)
    .not("botType", "is", null);

  const executiveCounts: Record<string, number> = {};
  for (const msg of botTypeMessages || []) {
    if (msg.botType) {
      executiveCounts[msg.botType] = (executiveCounts[msg.botType] || 0) + 1;
    }
  }

  const executiveBreakdown = Object.entries(executiveCounts)
    .map(([executive, count]) => ({ executive, count }))
    .sort((a, b) => b.count - a.count);

  const topExecutive = executiveBreakdown[0]?.executive || null;

  return {
    totalUsers: totalUsers || 0,
    activeUsers: activeUsers || 0,
    totalChats: totalChats || 0,
    totalMessages: totalMessages || 0,
    messagesLast24h: messagesLast24h || 0,
    messagesLast7d: messagesLast7d || 0,
    topExecutive,
    executiveBreakdown,
  };
}

// ============================================
// ADMIN CHAT/CONVERSATION QUERIES
// ============================================

export type AdminChat = Chat & {
  userEmail: string;
  messageCount: number;
};

export async function getAllChats(limit = 50): Promise<AdminChat[]> {
  const supabase = createServiceClient();

  // Use RPC function to get all chats with stats in a single query
  // This eliminates N+1 query pattern (previously 2 queries per chat)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(
    "get_admin_chats_with_stats",
  );

  if (error) throw error;

  return ((data || []) as Record<string, unknown>[])
    .slice(0, limit)
    .map(mapRpcRowToAdminChat);
}

export async function getChatWithMessages(chatId: string): Promise<{
  chat: AdminChat;
  messages: DBMessage[];
} | null> {
  const supabase = createServiceClient();

  const { data: chat, error } = await supabase
    .from("Chat")
    .select("*")
    .eq("id", chatId)
    .single();

  if (error || !chat) return null;

  const { data: user } = await supabase
    .from("User")
    .select("email")
    .eq("id", chat.userId)
    .single();

  const { data: messages } = await supabase
    .from("Message_v2")
    .select("*")
    .eq("chatId", chatId)
    .is("deletedAt", null)
    .order("createdAt", { ascending: true });

  return {
    chat: {
      ...chat,
      userEmail: user?.email || "Unknown",
      messageCount: messages?.length || 0,
    },
    messages: messages || [],
  };
}

// ============================================
// ADMIN AUTH CHECK
// ============================================

export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("User")
    .select("isAdmin")
    .eq("id", userId)
    .single();

  if (error || !data) return false;
  return data.isAdmin === true;
}

// ============================================
// RECENT ACTIVITY
// ============================================

export interface ActivityLogEntry {
  id: string;
  type: "message" | "chat" | "user" | "reaction";
  description: string;
  userId: string;
  userEmail: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export async function getRecentActivity(
  limit = 20,
): Promise<ActivityLogEntry[]> {
  const supabase = createServiceClient();

  // Get recent messages
  const { data: recentMessages } = await supabase
    .from("Message_v2")
    .select("id, chatId, role, botType, createdAt")
    .is("deletedAt", null)
    .order("createdAt", { ascending: false })
    .limit(limit);

  // Get chat info for messages
  const chatIds = [...new Set((recentMessages || []).map((m) => m.chatId))];
  const { data: chats } = await supabase
    .from("Chat")
    .select("id, userId, title")
    .in("id", chatIds);

  const chatMap = new Map(chats?.map((c) => [c.id, c]) || []);

  // Get user emails
  const userIds = [...new Set((chats || []).map((c) => c.userId))];
  const { data: users } = await supabase
    .from("User")
    .select("id, email")
    .in("id", userIds);

  const userMap = new Map(users?.map((u) => [u.id, u.email]) || []);

  const activity: ActivityLogEntry[] = (recentMessages || []).map((msg) => {
    const chat = chatMap.get(msg.chatId);
    const userEmail = chat ? userMap.get(chat.userId) || "Unknown" : "Unknown";

    return {
      id: msg.id,
      type: "message" as const,
      description:
        msg.role === "user"
          ? "User sent a message"
          : `${msg.botType || "AI"} responded`,
      userId: chat?.userId || "",
      userEmail,
      createdAt: msg.createdAt,
      metadata: {
        chatTitle: chat?.title || "Unknown",
        botType: msg.botType,
      },
    };
  });

  return activity.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

// ============================================
// DASHBOARD WIDGET QUERIES
// ============================================

export interface SubscriptionStats {
  trial: number;
  monthly: number;
  annual: number;
  lifetime: number;
  expired: number;
  mrr: number;
  activeSubscribers: number;
}

export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  const supabase = createServiceClient();

  // Get subscription counts by type
  const { data: users } = await supabase
    .from("User")
    .select("subscriptionType, subscriptionStatus")
    .is("deletedAt", null);

  const stats = {
    trial: 0,
    monthly: 0,
    annual: 0,
    lifetime: 0,
    expired: 0,
    activeSubscribers: 0,
  };

  for (const user of users || []) {
    if (user.subscriptionStatus === "expired") {
      stats.expired++;
    } else if (user.subscriptionStatus === "active") {
      stats.activeSubscribers++;
      switch (user.subscriptionType) {
        case "trial":
          stats.trial++;
          break;
        case "monthly":
          stats.monthly++;
          break;
        case "annual":
          stats.annual++;
          break;
        case "lifetime":
          stats.lifetime++;
          break;
      }
    }
  }

  // MRR: monthly price + annual price prorated to monthly
  const MONTHLY_PRICE = 297;
  const ANNUAL_MONTHLY_EQUIVALENT = 208; // $2500/12
  const mrr =
    stats.monthly * MONTHLY_PRICE + stats.annual * ANNUAL_MONTHLY_EQUIVALENT;

  return { ...stats, mrr };
}

export interface UserPreview {
  id: string;
  email: string;
  displayName: string | null;
  companyName: string | null;
  subscriptionType: string | null;
  subscriptionStatus: string | null;
  onboardedAt: string | null;
}

export async function getRecentUsers(limit = 5): Promise<UserPreview[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("User")
    .select(
      "id, email, displayName, companyName, subscriptionType, subscriptionStatus, onboardedAt",
    )
    .is("deletedAt", null)
    .order("onboardedAt", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export interface ConversationPreview {
  id: string;
  title: string;
  userEmail: string;
  messageCount: number;
  topic: string | null;
  topicColor: string | null;
  createdAt: string;
}

export async function getRecentConversations(
  limit = 5,
): Promise<ConversationPreview[]> {
  const supabase = createServiceClient();

  // Use RPC function to get recent conversations with stats in a single query
  // This eliminates N+1 query pattern (previously 2 queries per chat)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(
    "get_recent_conversations",
    {
      p_limit: limit,
    },
  );

  if (error) throw error;

  return ((data || []) as Record<string, unknown>[]).map(
    mapRpcRowToConversationPreview,
  );
}

export interface SupportTicketPreview {
  id: string;
  subject: string;
  userEmail: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: string;
}

export async function getRecentSupportTickets(
  limit = 5,
): Promise<SupportTicketPreview[]> {
  const supabase = createServiceClient();

  const { data: tickets, error } = await supabase
    .from("SupportTicket")
    .select("id, subject, userId, status, priority, createdAt")
    .is("deletedAt", null)
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (error) {
    // Table might not exist yet
    console.warn("SupportTicket query failed:", error);
    return [];
  }

  // Enrich with user email
  const enriched = await Promise.all(
    (tickets || []).map(async (ticket) => {
      const { data: user } = await supabase
        .from("User")
        .select("email")
        .eq("id", ticket.userId)
        .single();

      return {
        id: ticket.id,
        subject: ticket.subject,
        userEmail: user?.email || "Unknown",
        status: ticket.status as SupportTicketPreview["status"],
        priority: ticket.priority as SupportTicketPreview["priority"],
        createdAt: ticket.createdAt,
      };
    }),
  );

  return enriched;
}
