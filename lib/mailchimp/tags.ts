import "server-only";
import { createHash } from "node:crypto";
import { sendAdminNotification } from "../email/admin-notifications";
import {
	getMailchimpClient,
	MAILCHIMP_AUDIENCE_ID,
	MAILCHIMP_TAGS,
} from "./client";

type TagResult = { success: boolean; error?: string };

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
	const client = getMailchimpClient();
	if (!client) {
		// Graceful degradation - don't block if Mailchimp not configured
		console.warn(
			`[Mailchimp] Skipping ${operation} tag - client not configured`,
		);
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

			console.log(
				`[Mailchimp] Successfully applied ${operation} tag to ${email}`,
			);
			return { success: true };
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(
				`[Mailchimp] Attempt ${attempt}/${maxRetries} failed for ${operation} tag on ${email}: ${errorMessage}`,
			);

			if (attempt < maxRetries) {
				const delay = retryDelays[attempt - 1];
				console.log(`[Mailchimp] Retrying in ${delay}ms...`);
				await sleep(delay);
			} else {
				// All retries exhausted - notify admin and return failure
				const fullError = `Failed to apply ${operation} tag to ${email} after ${maxRetries} attempts. Last error: ${errorMessage}`;
				console.error(`[Mailchimp] ${fullError}`);

				await sendAdminNotification({
					subject: `Mailchimp Tag Failure: ${operation}`,
					message: `Email: ${email}\nOperation: ${operation}\nTag: ${tagName}\nError: ${errorMessage}\n\nThis user may not receive the expected email sequence.`,
				});

				return { success: false, error: fullError };
			}
		}
	}

	// This should never be reached due to the return in the loop
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
	subscriptionType: "monthly" | "annual" | "lifetime",
): Promise<TagResult> {
	// Map subscription type to the correct tag
	const tagName =
		subscriptionType === "monthly"
			? MAILCHIMP_TAGS.PAID_MONTHLY
			: MAILCHIMP_TAGS.PAID_ANNUAL_OR_LIFETIME;

	const operation = `paid ${subscriptionType}`;

	return applyTagWithRetry(email, tagName, operation);
}
