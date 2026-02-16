import "server-only";

/**
 * Canary token for system prompt leak detection.
 *
 * A canary is a detection mechanism embedded in the system prompt.
 * If the AI model leaks the system prompt in its output, the canary
 * will be detected and a security event logged.
 *
 * Uses a slice of AUTH_SECRET to make the token deployment-specific,
 * preventing cross-environment false positives.
 */

const CANARY_PREFIX = "ALECCI_CANARY_";

/**
 * Returns a deployment-specific canary token string.
 * Format: ALECCI_CANARY_ + first 8 chars of AUTH_SECRET (or "default" fallback).
 */
export function getCanaryToken(): string {
	const secret = process.env.AUTH_SECRET || "default";
	return `${CANARY_PREFIX}${secret.slice(0, 8)}`;
}

/**
 * Checks if text contains the canary prefix, indicating a system prompt leak.
 * Uses the prefix rather than the full token to catch partial leaks too.
 */
export function containsCanary(text: string): boolean {
	if (!text) return false;
	return text.includes(CANARY_PREFIX);
}
