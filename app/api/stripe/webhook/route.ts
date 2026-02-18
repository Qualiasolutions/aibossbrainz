import { headers } from "next/headers";
import { after, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getUserFullProfile } from "@/lib/db/queries";
import { sendTrialStartedEmail } from "@/lib/email/subscription-emails";
import { createRequestLogger, logger } from "@/lib/logger";
import { applyPaidTag, applyTrialTags } from "@/lib/mailchimp/tags";
import { checkWebhookRateLimit } from "@/lib/security/rate-limiter";
import {
	activateSubscription,
	expireSubscription,
	renewSubscription,
	startTrial,
} from "@/lib/stripe/actions";
import { getStripe, PLAN_DETAILS, STRIPE_PRICES } from "@/lib/stripe/config";
import {
	persistFailedEvent,
	shouldProcessEvent,
} from "@/lib/stripe/webhook-dedup";

export const maxDuration = 60;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const VALID_SUBSCRIPTION_TYPES = ["monthly", "annual", "lifetime"] as const;
type ValidSubscriptionType = (typeof VALID_SUBSCRIPTION_TYPES)[number];

/**
 * Apply Mailchimp tags for a subscription event.
 * Designed to run in after() so it doesn't block the webhook response.
 */
async function applyMailchimpTags(
	email: string,
	type: "trial" | "paid",
	subscriptionType?: ValidSubscriptionType,
): Promise<void> {
	try {
		if (type === "trial") {
			const result = await applyTrialTags(email, subscriptionType ?? null);
			if (!result.success) {
				logger.error(
					{ email, tagType: "trial", err: result.error },
					"Mailchimp trial tagging failed",
				);
			}
		} else if (type === "paid" && subscriptionType) {
			const result = await applyPaidTag(email, subscriptionType);
			if (!result.success) {
				logger.error(
					{ email, tagType: "paid", subscriptionType, err: result.error },
					"Mailchimp paid tagging failed",
				);
			}
		}
	} catch (error) {
		logger.error(
			{ err: error, email, tagType: type },
			"Mailchimp tagging error",
		);
	}
}

function validateSubscriptionType(
	value: string | undefined,
): ValidSubscriptionType | null {
	if (!value) return null;
	return VALID_SUBSCRIPTION_TYPES.includes(value as ValidSubscriptionType)
		? (value as ValidSubscriptionType)
		: null;
}

/**
 * Extract userId from Stripe event metadata where available.
 * Returns null for event types where userId is only obtainable via API call.
 */
function extractUserId(event: Stripe.Event): string | null {
	switch (event.type) {
		case "checkout.session.completed": {
			return (
				(event.data.object as Stripe.Checkout.Session).metadata?.userId ?? null
			);
		}
		case "customer.subscription.created":
		case "customer.subscription.updated":
		case "customer.subscription.deleted": {
			return (
				(event.data.object as Stripe.Subscription).metadata?.userId ?? null
			);
		}
		// invoice.paid, invoice.payment_failed: userId not in invoice metadata
		default:
			return null;
	}
}

export async function POST(request: Request) {
	if (!webhookSecret) {
		logger.error("Missing STRIPE_WEBHOOK_SECRET");
		return NextResponse.json(
			{ error: "Webhook secret not configured" },
			{ status: 500 },
		);
	}

	// IP-based rate limiting (before signature verification to save CPU)
	const headersList = await headers();
	const clientIp =
		headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		headersList.get("x-real-ip") ||
		"unknown";
	const rateLimitResult = await checkWebhookRateLimit(clientIp);
	if (!rateLimitResult.allowed) {
		logger.warn({ clientIp }, "Webhook rate limit exceeded");
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{
				status: 429,
				headers: { "Retry-After": "60" },
			},
		);
	}

	const body = await request.text();
	const signature = headersList.get("stripe-signature");

	if (!signature) {
		return NextResponse.json(
			{ error: "Missing stripe-signature header" },
			{ status: 400 },
		);
	}

	let event: Stripe.Event;

	try {
		event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
	} catch (_err) {
		logger.error("Stripe signature verification failed");
		return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
	}

	const reqLog = createRequestLogger(event.id);
	reqLog.info({ eventType: event.type }, "Processing Stripe webhook event");

	try {
		// Event-ID dedup + advisory lock: skip if already processed, serialize per-user
		const isNew = await shouldProcessEvent(
			event.id,
			event.type,
			extractUserId(event),
		);
		if (!isNew) {
			reqLog.info(
				{ eventId: event.id, eventType: event.type },
				"Duplicate event, skipping",
			);
			return NextResponse.json({ received: true });
		}

		switch (event.type) {
			// Handle checkout completion - backup for subscription activation
			case "checkout.session.completed": {
				const session = event.data.object as Stripe.Checkout.Session;
				const userId = session.metadata?.userId;
				const subscriptionType = validateSubscriptionType(
					session.metadata?.subscriptionType,
				);

				if (userId && !subscriptionType && session.metadata?.subscriptionType) {
					logger.error(
						{ userId, subscriptionType: session.metadata.subscriptionType },
						"Invalid subscriptionType in checkout metadata",
					);
				}

				if (userId && subscriptionType && session.subscription) {
					const subscriptionId =
						typeof session.subscription === "string"
							? session.subscription
							: session.subscription.id;

					try {
						const subscription = (await getStripe().subscriptions.retrieve(
							subscriptionId,
						)) as Stripe.Subscription;

						if (subscription.status === "trialing" && subscription.trial_end) {
							const trialEndDate = new Date(subscription.trial_end * 1000);
							if (!Number.isNaN(trialEndDate.getTime())) {
								await startTrial({
									userId,
									subscriptionType,
									stripeSubscriptionId: subscription.id,
									trialEndDate,
								});
								reqLog.info(
									{
										userId,
										subscriptionType,
										eventType: "checkout.session.completed",
									},
									"Started trial via checkout",
								);

								// Apply Mailchimp trial tag + send email (non-blocking)
								after(async () => {
									try {
										const profile = await getUserFullProfile({ userId });
										if (!profile?.email) return;
										await applyMailchimpTags(profile.email, "trial");
										const planDetails = PLAN_DETAILS[subscriptionType];
										await sendTrialStartedEmail({
											email: profile.email,
											displayName: profile.displayName,
											trialEndDate,
											planName: planDetails?.name || subscriptionType,
										});
									} catch (err) {
										logger.error(
											{ err, phase: "after", userId },
											"Checkout trial after() error",
										);
									}
								});
							}
						} else if (subscription.status === "active") {
							await activateSubscription({
								userId,
								subscriptionType,
								stripeSubscriptionId: subscription.id,
							});
							reqLog.info(
								{
									userId,
									subscriptionType,
									eventType: "checkout.session.completed",
								},
								"Subscription activated via checkout",
							);

							// Apply Mailchimp paid tag (non-blocking)
							after(async () => {
								try {
									const profile = await getUserFullProfile({ userId });
									if (profile?.email) {
										await applyMailchimpTags(
											profile.email,
											"paid",
											subscriptionType,
										);
									}
								} catch (err) {
									logger.error(
										{ err, phase: "after", userId },
										"Checkout paid after() error",
									);
								}
							});
						}
					} catch (retrieveError) {
						reqLog.error(
							{ err: retrieveError, subscriptionId },
							"Failed to retrieve subscription",
						);
					}
				}
				break;
			}

			// Handle new subscription created (with trial)
			case "customer.subscription.created": {
				const subscription = event.data.object as Stripe.Subscription;
				const userId = subscription.metadata?.userId;
				const subscriptionType = validateSubscriptionType(
					subscription.metadata?.subscriptionType,
				);

				if (userId && subscriptionType) {
					if (subscription.status === "trialing" && subscription.trial_end) {
						const trialEndDate = new Date(subscription.trial_end * 1000);
						if (Number.isNaN(trialEndDate.getTime())) {
							reqLog.error(
								{ trialEnd: subscription.trial_end },
								"Invalid trial_end value",
							);
							break;
						}

						await startTrial({
							userId,
							subscriptionType,
							stripeSubscriptionId: subscription.id,
							trialEndDate,
						});
						reqLog.info({ userId, subscriptionType }, "Started 14-day trial");

						// Apply Mailchimp trial tag + send email (non-blocking)
						after(async () => {
							try {
								const profile = await getUserFullProfile({ userId });
								if (!profile?.email) return;
								await applyMailchimpTags(profile.email, "trial");
								const planDetails = PLAN_DETAILS[subscriptionType];
								await sendTrialStartedEmail({
									email: profile.email,
									displayName: profile.displayName,
									trialEndDate,
									planName: planDetails?.name || subscriptionType,
								});
							} catch (err) {
								logger.error(
									{ err, phase: "after", userId },
									"Subscription created trial after() error",
								);
							}
						});
					} else {
						await activateSubscription({
							userId,
							subscriptionType,
							stripeSubscriptionId: subscription.id,
						});
						reqLog.info({ userId, subscriptionType }, "Subscription activated");

						// Apply Mailchimp paid tag (non-blocking)
						after(async () => {
							try {
								const profile = await getUserFullProfile({ userId });
								if (profile?.email) {
									await applyMailchimpTags(
										profile.email,
										"paid",
										subscriptionType,
									);
								}
							} catch (err) {
								logger.error(
									{ err, phase: "after", userId },
									"Subscription created paid after() error",
								);
							}
						});
					}
				}
				break;
			}

			// Handle subscription renewal / first payment after trial
			case "invoice.paid": {
				const invoice = event.data.object as Stripe.Invoice;

				// Get subscription ID from invoice via parent.subscription_details (Stripe v20+)
				const parentSubscription =
					invoice.parent?.subscription_details?.subscription;
				const subscriptionId =
					typeof parentSubscription === "string"
						? parentSubscription
						: typeof parentSubscription === "object" &&
								parentSubscription !== null
							? parentSubscription.id
							: null;

				if (subscriptionId) {
					try {
						const subscription = (await getStripe().subscriptions.retrieve(
							subscriptionId,
						)) as Stripe.Subscription;
						const subscriptionType = validateSubscriptionType(
							subscription.metadata?.subscriptionType,
						);
						const userId = subscription.metadata?.userId;

						if (userId && subscriptionType) {
							await activateSubscription({
								userId,
								subscriptionType,
								stripeSubscriptionId: subscription.id,
							});
							reqLog.info(
								{ userId, subscriptionType },
								"Payment received, subscription activated",
							);

							// Apply Mailchimp paid tag (non-blocking)
							after(async () => {
								try {
									const profile = await getUserFullProfile({ userId });
									if (profile?.email) {
										await applyMailchimpTags(
											profile.email,
											"paid",
											subscriptionType,
										);
									}
								} catch (err) {
									logger.error(
										{ err, phase: "after", userId },
										"Invoice paid after() error",
									);
								}
							});

							// For annual and lifetime plans, cancel after first payment
							if (
								subscriptionType === "annual" ||
								subscriptionType === "lifetime"
							) {
								await getStripe().subscriptions.update(subscription.id, {
									cancel_at_period_end: true,
								});
								reqLog.info(
									{ subscriptionType, subscriptionId: subscription.id },
									"Set subscription to cancel at period end",
								);
							}
						} else if (invoice.period_end) {
							const periodEndMs = invoice.period_end * 1000;
							const periodEndDate = new Date(periodEndMs);

							if (Number.isNaN(periodEndDate.getTime())) {
								reqLog.error(
									{ periodEnd: invoice.period_end },
									"Invalid period_end value",
								);
							} else {
								await renewSubscription({
									stripeSubscriptionId: subscription.id,
									periodEnd: periodEndDate,
								});
								reqLog.info(
									{ subscriptionId: subscription.id },
									"Renewed subscription",
								);
							}
						} else {
							reqLog.warn(
								{ subscriptionId: subscription.id },
								"invoice.paid: No userId/subscriptionType in metadata and no period_end",
							);
						}
					} catch (retrieveError) {
						reqLog.error(
							{ err: retrieveError, subscriptionId },
							"Failed to retrieve subscription",
						);
					}
				}
				break;
			}

			// Handle plan changes (upgrade/downgrade via billing portal)
			case "customer.subscription.updated": {
				const subscription = event.data.object as Stripe.Subscription;
				const userId = subscription.metadata?.userId;

				if (userId) {
					// Map the new price ID back to a subscription type
					const newPriceId = subscription.items.data[0]?.price?.id;
					let newSubscriptionType: ValidSubscriptionType | null = null;

					for (const [plan, priceId] of Object.entries(STRIPE_PRICES)) {
						if (priceId === newPriceId) {
							newSubscriptionType = plan as ValidSubscriptionType;
							break;
						}
					}

					if (newSubscriptionType) {
						await activateSubscription({
							userId,
							subscriptionType: newSubscriptionType,
							stripeSubscriptionId: subscription.id,
						});
						reqLog.info(
							{ userId, subscriptionType: newSubscriptionType },
							"Plan changed",
						);
					} else {
						reqLog.warn(
							{ userId, priceId: newPriceId },
							"customer.subscription.updated: Unknown price ID",
						);
					}
				}
				break;
			}

			// Handle subscription cancellation or expiration
			case "customer.subscription.deleted": {
				const subscription = event.data.object as Stripe.Subscription;
				const subscriptionType = subscription.metadata?.subscriptionType;

				// Don't expire lifetime/annual subscriptions when they "end" - they're still valid
				if (subscriptionType === "lifetime" || subscriptionType === "annual") {
					reqLog.info(
						{ subscriptionType, subscriptionId: subscription.id },
						"Subscription ended (user retains access)",
					);
				} else {
					await expireSubscription(subscription.id);
					reqLog.info(
						{ subscriptionId: subscription.id },
						"Subscription expired",
					);
				}
				break;
			}

			// Handle failed payment
			case "invoice.payment_failed": {
				const invoice = event.data.object as Stripe.Invoice;
				reqLog.warn({ invoiceId: invoice.id }, "Payment failed");
				break;
			}

			default:
				reqLog.info({ eventType: event.type }, "Unhandled event type");
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		reqLog.error({ err: error }, "Error processing webhook event");

		// Persist failed event to dead-letter queue for inspection/replay
		await persistFailedEvent(
			event.id,
			event.type,
			extractUserId(event),
			error instanceof Error ? error : new Error(String(error)),
			event,
		);

		return NextResponse.json(
			{ error: "Webhook handler failed" },
			{ status: 500 },
		);
	}
}
