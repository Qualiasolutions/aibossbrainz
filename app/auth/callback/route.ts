import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  checkUserSubscription,
  ensureUserExists,
  getUserFullProfile,
  getUserProfile,
} from "@/lib/db/queries";
import { sendWelcomeEmail } from "@/lib/email/subscription-emails";
import { activateSubscription, startTrial } from "@/lib/stripe/actions";
import { getStripe } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";

/**
 * If user has a Stripe customer but DB shows "pending", sync from Stripe.
 * This handles the case where webhook failed/delayed but user already paid.
 */
async function syncStripeSubscription(
  userId: string,
  stripeCustomerId: string,
): Promise<boolean> {
  try {
    const stripe = getStripe();
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: 5,
    });

    const sub = subscriptions.data.find(
      (s) => s.status === "trialing" || s.status === "active",
    );

    if (!sub) return false;

    const subscriptionType =
      (sub.metadata?.subscriptionType as "monthly" | "annual" | "lifetime") ||
      "monthly";

    if (sub.status === "trialing" && sub.trial_end) {
      await startTrial({
        userId,
        subscriptionType,
        stripeSubscriptionId: sub.id,
        trialEndDate: new Date(sub.trial_end * 1000),
      });
      console.log(
        `[Auth Callback] Synced trial from Stripe for user ${userId}`,
      );
      return true;
    }

    if (sub.status === "active") {
      await activateSubscription({
        userId,
        subscriptionType,
        stripeSubscriptionId: sub.id,
      });
      console.log(
        `[Auth Callback] Synced active subscription from Stripe for user ${userId}`,
      );
      return true;
    }

    return false;
  } catch (err) {
    console.error("[Auth Callback] Stripe sync failed:", err);
    return false;
  }
}

/**
 * Handles post-authentication redirect after email confirmation.
 * Ensures user exists in DB, sends welcome email, syncs Stripe if needed,
 * and redirects to /subscribe (for new/unpaid users) or /new (for active subscribers).
 */
async function handleAuthenticatedUser(
  user: { id: string; email?: string },
  origin: string,
  plan: string | null,
) {
  let isNewUser = false;

  if (user.email) {
    try {
      await ensureUserExists({ id: user.id, email: user.email });

      const profile = await getUserProfile({ userId: user.id });
      isNewUser = !profile?.onboardedAt;

      if (isNewUser) {
        sendWelcomeEmail({
          email: user.email,
          displayName: profile?.displayName,
        }).catch((err) => {
          console.error("[Auth Callback] Failed to send welcome email:", err);
        });
      }
    } catch (err) {
      console.error("[Auth Callback] Failed to ensure user exists:", err);
    }
  }

  // Check subscription status to determine redirect
  let subscription = await checkUserSubscription(user.id);

  // If subscription not active but user has a Stripe customer, sync from Stripe.
  // This catches the case where user paid but webhook never updated the DB.
  if (!subscription.isActive) {
    const fullProfile = await getUserFullProfile({ userId: user.id });
    if (fullProfile?.stripeCustomerId) {
      console.log(
        `[Auth Callback] User ${user.id} has Stripe customer but inactive subscription — syncing`,
      );
      const synced = await syncStripeSubscription(
        user.id,
        fullProfile.stripeCustomerId,
      );
      if (synced) {
        subscription = await checkUserSubscription(user.id);
      }
    }
  }

  // If plan specified, go to subscribe page for checkout
  const validPlans = ["monthly", "annual", "lifetime"];
  if (plan && validPlans.includes(plan) && !subscription.isActive) {
    return NextResponse.redirect(
      `${origin}/subscribe?plan=${encodeURIComponent(plan)}&welcome=true`,
    );
  }

  // If subscription is now active (either was already or just synced), go to app
  if (subscription.isActive) {
    return NextResponse.redirect(`${origin}/new`);
  }

  // Not active, no plan — go to subscribe
  const welcomeParam = isNewUser ? "?welcome=true" : "";
  return NextResponse.redirect(`${origin}/subscribe${welcomeParam}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const plan = searchParams.get("plan");
  const next = searchParams.get("next");

  const supabase = await createClient();

  // Flow 1: PKCE code exchange (from OAuth or Supabase redirect with ?code=)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[Auth Callback] Code exchange failed:", error.message);
    }

    if (!error && data.user) {
      // Recovery flow: redirect to next page (e.g. /reset-password) with session established
      if (next?.startsWith("/") && !next.startsWith("//")) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      return handleAuthenticatedUser(data.user, origin, plan);
    }
  }

  // Flow 2: Token hash verification (from email template with token_hash param)
  // This is the Supabase-recommended approach for SSR email confirmation
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      console.error("[Auth Callback] OTP verification failed:", error.message);
    }

    if (!error && data.user) {
      // Recovery flow: redirect to next page with session established
      if (next?.startsWith("/") && !next.startsWith("//")) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      return handleAuthenticatedUser(data.user, origin, plan);
    }
  }

  // Log what parameters we received for debugging
  console.error("[Auth Callback] Failed - params:", {
    hasCode: !!code,
    hasTokenHash: !!tokenHash,
    type,
    origin,
  });

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
