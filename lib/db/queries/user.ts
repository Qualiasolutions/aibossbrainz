import "server-only";

import {
  type BotType,
  ChatSDKError,
  createClient,
  createServiceClient,
  type Json,
  type User,
} from "./shared";

// ============================================
// PERFORMANCE: User existence cache
// ============================================
// Caches verified user IDs to avoid redundant DB checks on every request.
// Safe for serverless: resets on cold start (acceptable trade-off).
const verifiedUserIds = new Set<string>();

// ============================================
// USER QUERIES
// ============================================

export async function getUser(email: string): Promise<User[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("User")
      .select("*")
      .eq("email", email);

    if (error) throw error;
    return data || [];
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user by email",
    );
  }
}

export async function createUser({
  id,
  email,
}: {
  id?: string;
  email: string;
}) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("User")
      .insert({ id, email })
      .select();

    if (error) throw error;
    return data;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

/**
 * Ensures a User record exists for the authenticated Supabase Auth user.
 * Creates one with "pending" subscription status - user must complete
 * Stripe checkout to get trial access.
 * This syncs Supabase Auth users with our custom User table.
 */
export async function ensureUserExists({
  id,
  email,
}: {
  id: string;
  email: string;
}) {
  // PERFORMANCE: Fast path - skip DB check if already verified this session
  if (verifiedUserIds.has(id)) {
    return { id };
  }

  try {
    // Use service client to bypass RLS for user creation
    const supabase = createServiceClient();

    // First check if user exists
    const { data: existingUser } = await supabase
      .from("User")
      .select("id")
      .eq("id", id)
      .single();

    if (existingUser) {
      // Cache for future requests
      verifiedUserIds.add(id);
      return existingUser;
    }

    // Check if a row exists with the same email but different ID
    // This happens when a user is deleted from Supabase Auth and re-signs up
    const { data: emailUser } = await supabase
      .from("User")
      .select("id, isAdmin")
      .eq("email", email)
      .single();

    if (emailUser && emailUser.id !== id) {
      // Re-signup scenario: User was deleted from Supabase Auth and re-signed up.
      // We CANNOT update User.id because Chat/Message/Document tables have foreign keys.
      // Strategy:
      // 1. Soft-delete the old user record and change its email to free up the unique constraint
      // 2. Create a new user record with the new auth ID
      // Note: The old user's data (chats, etc.) will remain linked to the old ID (orphaned)

      // Step 1: Archive the old user - change email to free up constraint
      const archivedEmail = `deleted_${Date.now()}_${email}`;
      const { error: archiveError } = await supabase
        .from("User")
        .update({
          email: archivedEmail,
          deletedAt: new Date().toISOString(),
        })
        .eq("id", emailUser.id);

      if (archiveError) {
        console.error(
          "[ensureUserExists] Failed to archive old user:",
          archiveError,
        );
        throw archiveError;
      }

      // Step 2: Create new user with the new auth ID
      const { data: newUser, error: insertError } = await supabase
        .from("User")
        .insert({
          id,
          email,
          subscriptionType: "pending",
          subscriptionStartDate: null,
          subscriptionEndDate: null,
          subscriptionStatus: "pending",
          isAdmin: emailUser.isAdmin || false, // Preserve admin status from old account
        })
        .select("id")
        .single();

      if (insertError) {
        // Handle race condition - user may already exist
        if (insertError.code === "23505") {
          const { data: raceUser } = await supabase
            .from("User")
            .select("id")
            .eq("id", id)
            .single();
          if (raceUser) return raceUser;
        }
        console.error(
          "[ensureUserExists] Re-signup insert error:",
          insertError,
        );
        throw insertError;
      }

      console.log(
        `[ensureUserExists] Archived old user (${emailUser.id}) and created new user (${id}) for re-signup`,
      );
      // Cache the new user ID
      verifiedUserIds.add(id);
      return newUser ?? { id };
    }

    // New user - create with "pending" status
    // User must complete Stripe checkout to get trial access
    const { data, error } = await supabase
      .from("User")
      .upsert(
        {
          id,
          email,
          subscriptionType: "pending",
          subscriptionStartDate: null,
          subscriptionEndDate: null,
          subscriptionStatus: "pending",
        },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("id")
      .single();

    // Handle race condition: concurrent requests may hit User_email_key constraint
    if (error) {
      if (error.code === "23505") {
        const { data: raceUser } = await supabase
          .from("User")
          .select("id")
          .eq("id", id)
          .single();
        if (raceUser) {
          verifiedUserIds.add(id);
          return raceUser;
        }
      }
      console.error("[ensureUserExists] Upsert error:", error);
      throw error;
    }

    // Cache the verified user ID
    verifiedUserIds.add(id);
    return data ?? { id };
  } catch (error) {
    console.error("ensureUserExists error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to ensure user exists",
    );
  }
}

/**
 * Checks if a user's subscription is active.
 * Returns subscription status info for access control.
 */
export async function checkUserSubscription(userId: string): Promise<{
  isActive: boolean;
  subscriptionType: string | null;
  daysRemaining: number | null;
  isAdmin: boolean;
}> {
  try {
    const supabase = createServiceClient();

    const { data: user, error } = await supabase
      .from("User")
      .select(
        "subscriptionStatus, subscriptionType, subscriptionEndDate, isAdmin",
      )
      .eq("id", userId)
      .single();

    if (error || !user) {
      console.error("[checkUserSubscription] Error:", error);
      return {
        isActive: false,
        subscriptionType: null,
        daysRemaining: null,
        isAdmin: false,
      };
    }

    // Admins always have access
    if (user.isAdmin) {
      return {
        isActive: true,
        subscriptionType: user.subscriptionType,
        daysRemaining: null,
        isAdmin: true,
      };
    }

    // Check if subscription is active (including trialing)
    if (
      user.subscriptionStatus !== "active" &&
      user.subscriptionStatus !== "trialing"
    ) {
      return {
        isActive: false,
        subscriptionType: user.subscriptionType,
        daysRemaining: null,
        isAdmin: false,
      };
    }

    // Check if subscription end date has passed
    if (user.subscriptionEndDate) {
      const endDate = new Date(user.subscriptionEndDate);
      const now = new Date();
      const daysRemaining = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysRemaining <= 0) {
        // Update status to expired
        await supabase
          .from("User")
          .update({ subscriptionStatus: "expired" })
          .eq("id", userId);

        return {
          isActive: false,
          subscriptionType: user.subscriptionType,
          daysRemaining: 0,
          isAdmin: false,
        };
      }

      return {
        isActive: true,
        subscriptionType: user.subscriptionType,
        daysRemaining,
        isAdmin: false,
      };
    }

    return {
      isActive: true,
      subscriptionType: user.subscriptionType,
      daysRemaining: null,
      isAdmin: false,
    };
  } catch (error) {
    console.error("checkUserSubscription error:", error);
    // SECURITY: Fail closed - deny access if subscription check fails
    // This prevents attackers from bypassing subscription checks via DB errors
    return {
      isActive: false,
      subscriptionType: null,
      daysRemaining: null,
      isAdmin: false,
    };
  }
}

// ============================================
// AUDIT LOG QUERIES
// ============================================

export async function createAuditLog({
  userId,
  action,
  resource,
  resourceId,
  details,
  ipAddress,
  userAgent,
}: {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Json;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    // Use service client to bypass RLS - audit logs must always be written
    const supabase = createServiceClient();
    const { error } = await supabase.from("AuditLog").insert({
      userId,
      action,
      resource,
      resourceId,
      details: details ?? {},
      ipAddress,
      userAgent,
    });

    if (error) {
      console.error("Failed to create audit log:", error);
      // Don't throw - audit logs shouldn't break the main operation
    }
  } catch (error) {
    console.error("createAuditLog error:", error);
    // Non-critical - audit failure shouldn't break main operation
  }
}

// ============================================
// USER PROFILE QUERIES
// ============================================

export async function getUserProfile({ userId }: { userId: string }) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("User")
      .select(
        "id, email, displayName, companyName, industry, businessGoals, preferredBotType, onboardedAt, productsServices, websiteUrl, targetMarket, competitors, annualRevenue, yearsInBusiness, employeeCount",
      )
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user profile",
    );
  }
}

export async function updateUserProfile({
  userId,
  displayName,
  companyName,
  industry,
  businessGoals,
  preferredBotType,
  productsServices,
  websiteUrl,
  targetMarket,
  competitors,
  annualRevenue,
  yearsInBusiness,
  employeeCount,
  completeOnboarding,
}: {
  userId: string;
  displayName?: string;
  companyName?: string;
  industry?: string;
  businessGoals?: string;
  preferredBotType?: BotType;
  productsServices?: string;
  websiteUrl?: string;
  targetMarket?: string;
  competitors?: string;
  annualRevenue?: string;
  yearsInBusiness?: string;
  employeeCount?: string;
  completeOnboarding?: boolean;
}) {
  try {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = {
      displayName,
      companyName,
      industry,
      businessGoals,
      preferredBotType,
      productsServices,
      websiteUrl,
      targetMarket,
      competitors,
      annualRevenue,
      yearsInBusiness,
      employeeCount,
      profileUpdatedAt: new Date().toISOString(),
    };

    if (completeOnboarding) {
      updateData.onboardedAt = new Date().toISOString();
    }

    const { error } = await supabase
      .from("User")
      .update(updateData)
      .eq("id", userId);

    if (error) throw error;
  } catch (error) {
    console.error("[updateUserProfile] Database error:", error);
    throw new ChatSDKError(
      "bad_request:database",
      error instanceof Error ? error.message : "Failed to update user profile",
    );
  }
}

export async function getUserFullProfile({ userId }: { userId: string }) {
  try {
    // Use service client to bypass RLS for subscription data
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("User")
      .select(
        "id, email, displayName, companyName, industry, businessGoals, preferredBotType, onboardedAt, subscriptionType, subscriptionStatus, subscriptionStartDate, subscriptionEndDate, stripeCustomerId, productsServices, websiteUrl, targetMarket, competitors, annualRevenue, yearsInBusiness, employeeCount",
      )
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to get user full profile",
    );
  }
}
