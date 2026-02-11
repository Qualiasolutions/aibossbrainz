import "server-only";
import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getStripe,
  PLAN_DETAILS,
  STRIPE_PRICES,
  type StripePlanId,
} from "./config";

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const supabase = createServiceClient();

  // Check if user already has a Stripe customer ID
  const { data: user } = await supabase
    .from("User")
    .select("stripeCustomerId")
    .eq("id", userId)
    .single();

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await getStripe().customers.create({
    email,
    metadata: {
      supabaseUserId: userId,
    },
  });

  // Save customer ID to database
  await supabase
    .from("User")
    .update({ stripeCustomerId: customer.id })
    .eq("id", userId);

  return customer.id;
}

/**
 * Create a Stripe Checkout session for subscription with 14-day trial
 */
export async function createCheckoutSession({
  userId,
  email,
  planId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  planId: StripePlanId;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  // Validate URLs before passing to Stripe
  const validateUrl = (url: string, name: string): void => {
    try {
      const parsed = new URL(url);
      if (!parsed.protocol.startsWith("http")) {
        throw new Error(`${name} must use http(s) protocol`);
      }
    } catch (error) {
      console.error(`[createCheckoutSession] Invalid ${name}: "${url}"`);
      throw new Error(`Invalid ${name}: ${url}`);
    }
  };

  validateUrl(successUrl, "successUrl");
  validateUrl(cancelUrl, "cancelUrl");

  const customerId = await getOrCreateStripeCustomer(userId, email);
  const priceId = STRIPE_PRICES[planId];
  const planDetails = PLAN_DETAILS[planId];

  // All plans use subscription mode with 14-day trial
  // Annual and Lifetime are set to cancel after first payment via webhook
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      planId,
      subscriptionType: planDetails.subscriptionType,
    },
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        userId,
        planId,
        subscriptionType: planDetails.subscriptionType,
      },
    },
  };

  const session = await getStripe().checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  return session.url;
}

/**
 * Create a Stripe Customer Portal session for managing subscriptions
 */
export async function createPortalSession({
  userId,
  returnUrl,
}: {
  userId: string;
  returnUrl: string;
}): Promise<string> {
  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from("User")
    .select("stripeCustomerId, email")
    .eq("id", userId)
    .single();

  if (!user?.email) {
    throw new Error("No user found");
  }

  // Auto-create Stripe customer if none exists
  const customerId = user.stripeCustomerId
    ? user.stripeCustomerId
    : await getOrCreateStripeCustomer(userId, user.email);

  // Build portal session params -- optionally include a portal configuration
  // that enables subscription switching (upgrade/downgrade) in the portal UI
  const portalParams: Stripe.BillingPortal.SessionCreateParams = {
    customer: customerId,
    return_url: returnUrl,
  };

  const portalConfigId = process.env.STRIPE_PORTAL_CONFIG_ID;
  if (portalConfigId) {
    portalParams.configuration = portalConfigId;
  }

  const session = await getStripe().billingPortal.sessions.create(portalParams);

  return session.url;
}

/**
 * Start trial for a subscription
 */
export async function startTrial({
  userId,
  subscriptionType,
  stripeSubscriptionId,
  trialEndDate,
}: {
  userId: string;
  subscriptionType: "monthly" | "annual" | "lifetime";
  stripeSubscriptionId: string;
  trialEndDate: Date;
}): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("User")
    .update({
      subscriptionType,
      subscriptionStatus: "trialing",
      subscriptionStartDate: new Date().toISOString(),
      subscriptionEndDate: trialEndDate.toISOString(),
      stripeSubscriptionId,
    })
    .eq("id", userId);

  if (error) {
    console.error("[startTrial] DB update failed:", error);
    throw new Error(
      `Failed to start trial for user ${userId}: ${error.message}`,
    );
  }
}

/**
 * Activate subscription after successful payment (trial ended)
 */
export async function activateSubscription({
  userId,
  subscriptionType,
  stripeSubscriptionId,
}: {
  userId: string;
  subscriptionType: "monthly" | "annual" | "lifetime";
  stripeSubscriptionId?: string;
}): Promise<void> {
  const supabase = createServiceClient();

  // Calculate duration: monthly=1, annual=12, lifetime=9999
  const durationMonths =
    subscriptionType === "monthly"
      ? 1
      : subscriptionType === "annual"
        ? 12
        : 9999;
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + durationMonths);

  const { error } = await supabase
    .from("User")
    .update({
      subscriptionType,
      subscriptionStatus: "active",
      subscriptionStartDate: new Date().toISOString(),
      subscriptionEndDate: endDate.toISOString(),
      stripeSubscriptionId: stripeSubscriptionId || null,
    })
    .eq("id", userId);

  if (error) {
    console.error("[activateSubscription] DB update failed:", error);
    throw new Error(
      `Failed to activate subscription for user ${userId}: ${error.message}`,
    );
  }
}

/**
 * Cancel subscription (mark as cancelled, will expire at end of period)
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from("User")
    .select("stripeSubscriptionId")
    .eq("id", userId)
    .single();

  // Cancel in Stripe if there's an active subscription
  if (user?.stripeSubscriptionId) {
    await getStripe().subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  // Update local status
  await supabase
    .from("User")
    .update({ subscriptionStatus: "cancelled" })
    .eq("id", userId);
}

/**
 * Handle subscription renewal (called by webhook)
 */
export async function renewSubscription({
  stripeSubscriptionId,
  periodEnd,
}: {
  stripeSubscriptionId: string;
  periodEnd: Date;
}): Promise<void> {
  // Validate the date is valid before proceeding
  if (!(periodEnd instanceof Date) || Number.isNaN(periodEnd.getTime())) {
    console.error(
      `[renewSubscription] Invalid periodEnd date: ${periodEnd}. Skipping update.`,
    );
    return;
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("User")
    .update({
      subscriptionStatus: "active",
      subscriptionEndDate: periodEnd.toISOString(),
    })
    .eq("stripeSubscriptionId", stripeSubscriptionId);

  if (error) {
    console.error("[renewSubscription] DB update failed:", error);
    throw new Error(
      `Failed to renew subscription ${stripeSubscriptionId}: ${error.message}`,
    );
  }
}

/**
 * Expire subscription (called by webhook when subscription ends)
 */
export async function expireSubscription(
  stripeSubscriptionId: string,
): Promise<void> {
  const supabase = createServiceClient();

  await supabase
    .from("User")
    .update({
      subscriptionStatus: "expired",
      stripeSubscriptionId: null,
    })
    .eq("stripeSubscriptionId", stripeSubscriptionId);
}
