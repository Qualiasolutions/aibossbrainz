import { headers } from "next/headers";
import { after, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getUserFullProfile } from "@/lib/db/queries";
import { sendTrialStartedEmail } from "@/lib/email/subscription-emails";
import { applyPaidTag, applyTrialTag } from "@/lib/mailchimp/tags";
import {
  activateSubscription,
  expireSubscription,
  renewSubscription,
  startTrial,
} from "@/lib/stripe/actions";
import { getStripe, PLAN_DETAILS } from "@/lib/stripe/config";
import { createServiceClient } from "@/lib/supabase/server";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const VALID_SUBSCRIPTION_TYPES = ["monthly", "annual", "lifetime"] as const;
type ValidSubscriptionType = (typeof VALID_SUBSCRIPTION_TYPES)[number];

/**
 * Apply Mailchimp tags for a subscription event.
 * Runs inline (not in after()) to ensure it completes before the function exits.
 */
async function applyMailchimpTags(
  userId: string,
  type: "trial" | "paid",
  subscriptionType?: ValidSubscriptionType,
): Promise<void> {
  try {
    const profile = await getUserFullProfile({ userId });
    if (!profile?.email) {
      console.warn(
        `[Stripe Webhook] No email found for user ${userId}, skipping Mailchimp tagging`,
      );
      return;
    }

    if (type === "trial") {
      const result = await applyTrialTag(profile.email);
      if (!result.success) {
        console.error(
          `[Stripe Webhook] Mailchimp trial tagging failed for ${profile.email}: ${result.error}`,
        );
      }
    } else if (type === "paid" && subscriptionType) {
      const result = await applyPaidTag(profile.email, subscriptionType);
      if (!result.success) {
        console.error(
          `[Stripe Webhook] Mailchimp paid tagging failed for ${profile.email}: ${result.error}`,
        );
      }
    }
  } catch (error) {
    console.error(
      `[Stripe Webhook] Mailchimp tagging error for user ${userId}:`,
      error,
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
 * Check if user's subscription is already in the target state to prevent
 * duplicate processing from overlapping webhook events.
 */
async function isAlreadyProcessed(
  userId: string,
  targetStatus: "trialing" | "active",
  stripeSubscriptionId: string,
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("User")
    .select("subscriptionStatus, stripeSubscriptionId")
    .eq("id", userId)
    .single();

  return (
    data?.subscriptionStatus === targetStatus &&
    data?.stripeSubscriptionId === stripeSubscriptionId
  );
}

export async function POST(request: Request) {
  if (!webhookSecret) {
    console.error("[Stripe Webhook] Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const body = await request.text();
  const headersList = await headers();
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
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Processing event: ${event.type}`);

  try {
    switch (event.type) {
      // Handle checkout completion - backup for subscription activation
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const subscriptionType = validateSubscriptionType(
          session.metadata?.subscriptionType,
        );

        if (userId && subscriptionType && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;

          try {
            const subscriptionResponse =
              await getStripe().subscriptions.retrieve(subscriptionId);
            const subscription = subscriptionResponse as unknown as {
              id: string;
              status: string;
              trial_end: number | null;
            };

            // Skip if already processed by customer.subscription.created
            if (
              await isAlreadyProcessed(
                userId,
                subscription.status === "trialing" ? "trialing" : "active",
                subscription.id,
              )
            ) {
              console.log(
                `[Stripe Webhook] checkout.session.completed: already processed for user ${userId}, skipping`,
              );
              break;
            }

            if (subscription.status === "trialing" && subscription.trial_end) {
              const trialEndDate = new Date(subscription.trial_end * 1000);
              if (!Number.isNaN(trialEndDate.getTime())) {
                await startTrial({
                  userId,
                  subscriptionType,
                  stripeSubscriptionId: subscription.id,
                  trialEndDate,
                });
                console.log(
                  `[Stripe Webhook] checkout.session.completed: started trial for user ${userId}`,
                );

                // Apply Mailchimp trial tag + send email
                await applyMailchimpTags(userId, "trial");
                after(async () => {
                  try {
                    const profile = await getUserFullProfile({ userId });
                    if (profile?.email) {
                      const planDetails = PLAN_DETAILS[subscriptionType];
                      await sendTrialStartedEmail({
                        email: profile.email,
                        displayName: profile.displayName,
                        trialEndDate,
                        planName: planDetails?.name || subscriptionType,
                      });
                    }
                  } catch (emailError) {
                    console.error(
                      "[Stripe Webhook] Failed to send trial email:",
                      emailError,
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
              console.log(
                `[Stripe Webhook] checkout.session.completed: activated subscription for user ${userId}`,
              );

              // Apply Mailchimp paid tag
              await applyMailchimpTags(userId, "paid", subscriptionType);
            }
          } catch (retrieveError) {
            console.error(
              `[Stripe Webhook] Failed to retrieve subscription ${subscriptionId}:`,
              retrieveError,
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
          // Check if already processed (idempotency)
          if (
            await isAlreadyProcessed(
              userId,
              subscription.status === "trialing" ? "trialing" : "active",
              subscription.id,
            )
          ) {
            console.log(
              `[Stripe Webhook] customer.subscription.created: already processed for user ${userId}, skipping`,
            );
            break;
          }

          if (subscription.status === "trialing" && subscription.trial_end) {
            const trialEndDate = new Date(subscription.trial_end * 1000);
            if (Number.isNaN(trialEndDate.getTime())) {
              console.error(
                `[Stripe Webhook] Invalid trial_end: ${subscription.trial_end}`,
              );
              break;
            }

            await startTrial({
              userId,
              subscriptionType,
              stripeSubscriptionId: subscription.id,
              trialEndDate,
            });
            console.log(
              `[Stripe Webhook] Started 14-day trial for ${subscriptionType} subscription for user ${userId}`,
            );

            // Apply Mailchimp trial tag inline (must complete before function exits)
            await applyMailchimpTags(userId, "trial");

            // Send trial started email (non-blocking, ok in after())
            after(async () => {
              try {
                const profile = await getUserFullProfile({ userId });
                if (profile?.email) {
                  const planDetails = PLAN_DETAILS[subscriptionType];
                  await sendTrialStartedEmail({
                    email: profile.email,
                    displayName: profile.displayName,
                    trialEndDate,
                    planName: planDetails?.name || subscriptionType,
                  });
                }
              } catch (emailError) {
                console.error(
                  "[Stripe Webhook] Failed to send trial email:",
                  emailError,
                );
              }
            });
          } else {
            await activateSubscription({
              userId,
              subscriptionType,
              stripeSubscriptionId: subscription.id,
            });
            console.log(
              `[Stripe Webhook] Activated ${subscriptionType} subscription for user ${userId}`,
            );

            // Apply Mailchimp paid tag inline
            await applyMailchimpTags(userId, "paid", subscriptionType);
          }
        }
        break;
      }

      // Handle subscription renewal / first payment after trial
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;

        // Get subscription ID from invoice - handle various Stripe API versions
        const invoiceAny = invoice as unknown as Record<string, unknown>;
        const subscriptionId =
          typeof invoiceAny.subscription === "string"
            ? invoiceAny.subscription
            : (invoiceAny.subscription as { id?: string })?.id ||
              (typeof invoice.parent?.subscription_details?.subscription ===
              "string"
                ? invoice.parent.subscription_details.subscription
                : null);

        if (subscriptionId) {
          try {
            const subscriptionResponse =
              await getStripe().subscriptions.retrieve(subscriptionId);
            const subscription = subscriptionResponse as unknown as {
              id: string;
              metadata: Record<string, string>;
              current_period_end: number;
            };
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
              console.log(
                `[Stripe Webhook] Payment received, activated ${subscriptionType} subscription for user ${userId}`,
              );

              // Apply Mailchimp paid tag inline (must complete before function exits)
              await applyMailchimpTags(userId, "paid", subscriptionType);

              // For annual and lifetime plans, cancel after first payment
              if (
                subscriptionType === "annual" ||
                subscriptionType === "lifetime"
              ) {
                await getStripe().subscriptions.update(subscription.id, {
                  cancel_at_period_end: true,
                });
                console.log(
                  `[Stripe Webhook] Set ${subscriptionType} subscription to cancel at period end`,
                );
              }
            } else if (subscription.current_period_end) {
              const periodEndMs = subscription.current_period_end * 1000;
              const periodEndDate = new Date(periodEndMs);

              if (Number.isNaN(periodEndDate.getTime())) {
                console.error(
                  `[Stripe Webhook] Invalid current_period_end value: ${subscription.current_period_end}`,
                );
              } else {
                await renewSubscription({
                  stripeSubscriptionId: subscription.id,
                  periodEnd: periodEndDate,
                });
                console.log(
                  `[Stripe Webhook] Renewed subscription ${subscription.id}`,
                );
              }
            } else {
              console.warn(
                `[Stripe Webhook] invoice.paid: No userId/subscriptionType in metadata and no current_period_end. Subscription: ${subscription.id}`,
              );
            }
          } catch (retrieveError) {
            console.error(
              `[Stripe Webhook] Failed to retrieve subscription ${subscriptionId}:`,
              retrieveError,
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
          console.log(
            `[Stripe Webhook] ${subscriptionType} subscription ${subscription.id} ended (user retains access)`,
          );
        } else {
          await expireSubscription(subscription.id);
          console.log(
            `[Stripe Webhook] Expired subscription ${subscription.id}`,
          );
        }
        break;
      }

      // Handle failed payment
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(
          `[Stripe Webhook] Payment failed for invoice ${invoice.id}`,
        );
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
