/**
 * Client-side error logging utility using Sentry SDK.
 *
 * USAGE:
 * - Use this in client components ("use client") and hooks
 * - Always provide component and action context for better error tracking
 * - In production: Logs to Sentry with structured tags
 * - In development: Logs to console for visibility
 *
 * WHEN TO USE:
 * - Client-side errors in components, hooks, and event handlers
 * - User-triggered actions (button clicks, form submissions)
 * - Browser API errors (speech recognition, media access)
 *
 * DO NOT USE:
 * - Server-side code (use logger.ts with Pino instead)
 * - Error boundaries (use Sentry.captureException directly for Error objects)
 *
 * @example
 * import { logClientError } from "@/lib/client-logger";
 *
 * try {
 *   await saveProfile(data);
 * } catch (error) {
 *   logClientError(error, {
 *     component: "AccountClient",
 *     action: "save_profile",
 *     userId: user.id,
 *   });
 * }
 */

import * as Sentry from "@sentry/nextjs";

/**
 * Log an error from client-side code with structured context.
 *
 * @param error - The error to log (Error object, string, or unknown)
 * @param context - Structured context for error tracking
 * @param context.component - Component name (e.g., "ChatInput", "PaywallModal")
 * @param context.action - Action that failed (e.g., "fetch_messages", "checkout")
 * @param context.userId - User ID if available from auth context
 */
export function logClientError(
	error: unknown,
	context: {
		component?: string;
		action?: string;
		userId?: string;
		[key: string]: unknown;
	},
) {
	// In production: Send to Sentry with structured tags
	if (process.env.NODE_ENV === "production") {
		Sentry.captureException(error, {
			tags: {
				component: context.component,
				action: context.action,
			},
			extra: context,
		});
	}

	// In development: Log to console for visibility
	if (process.env.NODE_ENV === "development") {
		console.error(`[${context.component}] ${context.action}:`, error, context);
	}
}
