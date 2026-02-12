import "server-only";
import mailchimp from "@mailchimp/mailchimp_marketing";

// Lazy initialization to avoid build-time errors when env vars missing
let clientInitialized = false;

/**
 * Get the Mailchimp client, initializing it lazily.
 * Returns null if API key is not configured (graceful degradation).
 */
export function getMailchimpClient(): typeof mailchimp | null {
	if (!process.env.MAILCHIMP_API_KEY) {
		console.warn(
			"[Mailchimp] API key not configured - Mailchimp integration disabled",
		);
		return null;
	}

	if (!process.env.MAILCHIMP_SERVER_PREFIX) {
		console.warn(
			"[Mailchimp] Server prefix not configured - Mailchimp integration disabled",
		);
		return null;
	}

	// Only configure once
	if (!clientInitialized) {
		mailchimp.setConfig({
			apiKey: process.env.MAILCHIMP_API_KEY,
			server: process.env.MAILCHIMP_SERVER_PREFIX,
		});
		clientInitialized = true;
	}

	return mailchimp;
}

/**
 * Mailchimp tag names for AI Boss Brainz.
 * These match existing tags in Alexandria's Mailchimp account.
 */
export const MAILCHIMP_TAGS = {
	/** Applied when user verifies email during trial signup */
	TRIAL: "14-Day Free Trial: AI Boss Brainz",
	/** Applied when user purchases monthly subscription */
	PAID_MONTHLY: "AI Boss Brainz Monthly",
	/** Applied when user purchases annual or lifetime subscription */
	PAID_ANNUAL_OR_LIFETIME: "AI Boss Brainz Full",
} as const;

/**
 * Mailchimp Audience ID for the "Alecci Media" list.
 * Can be overridden via environment variable.
 */
export const MAILCHIMP_AUDIENCE_ID =
	process.env.MAILCHIMP_AUDIENCE_ID || "d5fc73df51";
