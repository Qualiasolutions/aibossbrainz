import { after } from "next/server";
import { z } from "zod";
import { apiRequestLogger } from "@/lib/api-logging";
import {
	createAuditLog,
	ensureUserExists,
	getUserFullProfile,
} from "@/lib/db/queries";
import { sendCancellationEmail } from "@/lib/email/subscription-emails";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { applyPaidTag, applyTrialTags } from "@/lib/mailchimp/tags";
import { withCsrf } from "@/lib/security/with-csrf";
import {
	activateSubscription,
	cancelSubscription,
	createPortalSession,
	startTrial,
} from "@/lib/stripe/actions";
import { getStripe } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Fallback: if user has a Stripe customer but DB is still "pending",
 * check Stripe directly for an active subscription and sync the DB.
 * This handles cases where the webhook failed or was delayed.
 */
async function syncFromStripe(
	userId: string,
	stripeCustomerId: string,
): Promise<boolean> {
	try {
		// List subscriptions — prefer active/trialing, fall back to any
		const subscriptions = await getStripe().subscriptions.list({
			customer: stripeCustomerId,
			status: "all",
			limit: 5,
		});

		if (subscriptions.data.length === 0) {
			return false;
		}

		// Prefer active or trialing subscriptions over cancelled/expired
		const sub =
			subscriptions.data.find(
				(s) => s.status === "trialing" || s.status === "active",
			) || subscriptions.data[0];

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
			return true;
		}

		if (sub.status === "active") {
			await activateSubscription({
				userId,
				subscriptionType,
				stripeSubscriptionId: sub.id,
			});
			return true;
		}

		return false;
	} catch {
		return false;
	}
}

// GET - Fetch user subscription info (accessible without auth for polling after payment)
export async function GET() {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		// Return gracefully for unauthenticated users (needed for subscribe page polling)
		if (authError || !user || !user.email) {
			return Response.json({
				isActive: false,
				subscriptionType: null,
				subscriptionStatus: null,
				subscriptionStartDate: null,
				subscriptionEndDate: null,
				hasStripeSubscription: false,
			});
		}

		try {
			await ensureUserExists({ id: user.id, email: user.email });
		} catch {
			// Continue anyway - user might already exist
		}

		let profile = await getUserFullProfile({ userId: user.id });

		// Check if subscription is active (includes trialing)
		let isActive =
			profile?.subscriptionStatus === "active" ||
			profile?.subscriptionStatus === "trialing";

		// Fallback: if user paid (has Stripe customer) but webhook never updated DB,
		// check Stripe directly and sync. Run for ANY non-active status, not just
		// "pending", to handle edge cases where status drifted.
		if (!isActive && profile?.stripeCustomerId) {
			const synced = await syncFromStripe(user.id, profile.stripeCustomerId);
			if (synced) {
				// Re-fetch updated profile
				profile = await getUserFullProfile({ userId: user.id });
				isActive =
					profile?.subscriptionStatus === "active" ||
					profile?.subscriptionStatus === "trialing";

				// Best-effort Mailchimp tagging if the webhook was missed/delayed.
				const st = profile?.subscriptionType;
				const isPlan = st === "monthly" || st === "annual" || st === "lifetime";
				const subscriptionType = isPlan ? st : null;
				const email = user.email;
				if (email) {
					after(async () => {
						try {
							if (profile?.subscriptionStatus === "trialing") {
								await applyTrialTags(email, subscriptionType);
							} else if (
								profile?.subscriptionStatus === "active" &&
								subscriptionType
							) {
								await applyPaidTag(email, subscriptionType);
							}
						} catch (err) {
							logger.error(
								{ err },
								"Subscription API Mailchimp tagging failed",
							);
						}
					});
				}
			}
		}

		return Response.json({
			isActive,
			subscriptionType: profile?.subscriptionType ?? null,
			subscriptionStatus: profile?.subscriptionStatus ?? null,
			subscriptionStartDate: profile?.subscriptionStartDate ?? null,
			subscriptionEndDate: profile?.subscriptionEndDate ?? null,
			hasStripeSubscription: isActive || !!profile?.stripeCustomerId,
		});
	} catch {
		// Return a graceful fallback instead of error for GET requests
		return Response.json({
			isActive: false,
			subscriptionType: null,
			subscriptionStatus: null,
			subscriptionStartDate: null,
			subscriptionEndDate: null,
			hasStripeSubscription: false,
		});
	}
}

// POST - Create Stripe portal session or cancel subscription
export const POST = withCsrf(async (request: Request) => {
	const apiLog = apiRequestLogger("/api/subscription");

	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user || !user.email) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		apiLog.start({ userId: user.id });

		await ensureUserExists({ id: user.id, email: user.email });

		const body = await request.json();
		const parsed = z
			.object({ action: z.enum(["portal", "cancel"]) })
			.safeParse(body);
		if (!parsed.success) {
			return Response.json({ error: parsed.error.flatten() }, { status: 400 });
		}
		const { action } = parsed.data;

		if (action === "portal") {
			// Create Stripe billing portal session
			const { getValidAppUrl } = await import("@/lib/stripe/url");
			const appUrl = getValidAppUrl();
			const url = await createPortalSession({
				userId: user.id,
				returnUrl: `${appUrl}/account`,
			});
			apiLog.success({ action: "portal" });
			return Response.json({ url });
		}

		if (action === "cancel") {
			// Get user profile for email
			const profile = await getUserFullProfile({ userId: user.id });

			// Cancel subscription in Stripe and DB
			await cancelSubscription(user.id);

			// Audit log for subscription cancellation
			await createAuditLog({
				userId: user.id,
				action: "subscription_cancelled",
				resource: "Subscription",
				resourceId: user.id,
				details: {
					email: user.email,
					subscriptionType: profile?.subscriptionType,
					subscriptionEndDate: profile?.subscriptionEndDate,
				},
				ipAddress: request.headers.get("x-forwarded-for"),
				userAgent: request.headers.get("user-agent"),
			});

			// Send cancellation email
			await sendCancellationEmail({
				email: user.email,
				displayName: profile?.displayName ?? null,
				subscriptionEndDate: profile?.subscriptionEndDate ?? null,
			});

			apiLog.success({ action: "cancel" });
			return Response.json({ success: true });
		}

		// Exhaustive check - Zod ensures only "portal" | "cancel" reach here
		return Response.json({ error: "Invalid action" }, { status: 400 });
	} catch (error) {
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		apiLog.error(error);
		return new ChatSDKError("bad_request:database").toResponse();
	}
});
