import "server-only";
import { createHash } from "node:crypto";
import { sendAdminNotification } from "../email/admin-notifications";
import { logger } from "../logger";
import {
	getMailchimpClient,
	MAILCHIMP_AUDIENCE_ID,
	MAILCHIMP_TAGS,
} from "./client";

type TagResult = { success: boolean; error?: string };
type SubscriptionType = "monthly" | "annual" | "lifetime";

/**
 * Generate MD5 hash of lowercase email for Mailchimp subscriber lookup.
 * Mailchimp uses this as the subscriber ID.
 */
export function getSubscriberHash(email: string): string {
	return createHash("md5").update(email.toLowerCase()).digest("hex");
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Apply a tag to a Mailchimp contact with retry logic.
 * Creates/updates the contact if they don't exist.
 *
 * @param email - Subscriber email address
 * @param tagName - Tag to apply
 * @param operation - Description for logging (e.g., "trial", "paid monthly")
 * @returns Result indicating success or failure with error message
 */
async function applyTagWithRetry(
	email: string,
	tagName: string,
	operation: string,
): Promise<TagResult> {
	if (!email || !email.includes("@")) {
		return { success: false, error: `Invalid email format: ${email}` };
	}

	const client = getMailchimpClient();
	if (!client) {
		// Graceful degradation - don't block if Mailchimp not configured
		return { success: true }; // Return success to not block user flow
	}

	const subscriberHash = getSubscriberHash(email);
	const maxRetries = 3;
	const retryDelays = [500, 1000, 2000]; // Exponential backoff

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			// Upsert contact (create if not exists, update if exists)
			await client.lists.setListMember(MAILCHIMP_AUDIENCE_ID, subscriberHash, {
				email_address: email,
				status_if_new: "subscribed",
			});

			// Apply the tag
			await client.lists.updateListMemberTags(
				MAILCHIMP_AUDIENCE_ID,
				subscriberHash,
				{
					tags: [{ name: tagName, status: "active" }],
				},
			);

			// Notify admin of successful tagging (fire-and-forget)
			sendAdminNotification({
				subject: `Mailchimp Tag Applied: ${operation}`,
				message: `Email: ${email}\nTag: ${tagName}\nOperation: ${operation}`,
				type: "success",
			}).catch(() => {});

			return { success: true };
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			if (attempt < maxRetries) {
				const delay = retryDelays[attempt - 1];
				await sleep(delay);
			} else {
				// All retries exhausted - notify admin and return failure
				const fullError = `Failed to apply ${operation} tag to ${email} after ${maxRetries} attempts. Last error: ${errorMessage}`;

				try {
					await sendAdminNotification({
						subject: `Mailchimp Tag Failure: ${operation}`,
						message: `Email: ${email}\nOperation: ${operation}\nTag: ${tagName}\nError: ${errorMessage}\n\nThis user may not receive the expected email sequence.`,
					});
				} catch (notifyErr) {
					logger.error(
						{ err: notifyErr, operation, email },
						"Failed to send Mailchimp admin notification",
					);
				}

				return { success: false, error: fullError };
			}
		}
	}

	// Unreachable - satisfies TypeScript control flow analysis
	return { success: false, error: "Unexpected error in retry logic" };
}

/**
 * Apply the trial tag to a user who has verified their email.
 * This adds them to the 14-day trial email automation.
 *
 * @param email - User's email address
 * @returns Result indicating success or failure
 */
export async function applyTrialTag(email: string): Promise<TagResult> {
	return applyTagWithRetry(email, MAILCHIMP_TAGS.TRIAL, "trial");
}

function getTrialPlanTag(subscriptionType: SubscriptionType): string {
	switch (subscriptionType) {
		case "monthly":
			return MAILCHIMP_TAGS.TRIAL_MONTHLY;
		case "annual":
			return MAILCHIMP_TAGS.TRIAL_ANNUAL;
		case "lifetime":
			return MAILCHIMP_TAGS.TRIAL_LIFETIME;
	}
}

/**
 * Apply a "plan choice" tag during trial so the user is segmented by
 * the plan they selected at checkout (monthly/annual/lifetime), even
 * before the first payment posts.
 *
 * This is intentionally separate from paid tags to avoid triggering
 * paid automations during the trial window.
 */
export async function applyTrialPlanChoiceTag(
	email: string,
	subscriptionType: SubscriptionType,
): Promise<TagResult> {
	const tagName = getTrialPlanTag(subscriptionType);
	const operation = `trial choice ${subscriptionType}`;
	return applyTagWithRetry(email, tagName, operation);
}

/**
 * Apply the trial tag and (optionally) the plan-choice tag.
 */
export async function applyTrialTags(
	email: string,
	subscriptionType?: SubscriptionType | null,
): Promise<TagResult> {
	const base = await applyTrialTag(email);
	if (!base.success) return base;

	if (!subscriptionType) return base;
	const plan = await applyTrialPlanChoiceTag(email, subscriptionType);
	if (!plan.success) {
		return {
			success: false,
			error: plan.error || "Failed to apply trial plan-choice tag",
		};
	}
	return { success: true };
}

/**
 * Apply the appropriate paid tag based on subscription type.
 * The trial tag is intentionally kept for journey tracking.
 *
 * @param email - User's email address
 * @param subscriptionType - Type of subscription purchased
 * @returns Result indicating success or failure
 */
export async function applyPaidTag(
	email: string,
	subscriptionType: SubscriptionType,
): Promise<TagResult> {
	// Map each subscription type to its own tag
	const tagMap: Record<typeof subscriptionType, string> = {
		monthly: MAILCHIMP_TAGS.PAID_MONTHLY,
		annual: MAILCHIMP_TAGS.PAID_ANNUAL,
		lifetime: MAILCHIMP_TAGS.PAID_LIFETIME,
	};

	const tagName = tagMap[subscriptionType];
	const operation = `paid ${subscriptionType}`;

	return applyTagWithRetry(email, tagName, operation);
}
