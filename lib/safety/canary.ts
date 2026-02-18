import "server-only";

import { createHash } from "node:crypto";

/**
 * Canary token for system prompt leak detection.
 *
 * A canary is a detection mechanism embedded in the system prompt.
 * If the AI model leaks the system prompt in its output, the canary
 * will be detected and a security event logged.
 *
 * Uses a SHA256 hash of AUTH_SECRET to make the token deployment-specific,
 * preventing cross-environment false positives and raw secret leakage.
 */

const CANARY_PREFIX = "ALECCI_CANARY_";

/**
 * Returns a deployment-specific canary token string.
 * Format: ALECCI_CANARY_ + first 8 hex chars of SHA256(AUTH_SECRET).
 * Uses SHA256 instead of raw secret slice to prevent secret material leakage (PROMPT-08).
 */
export function getCanaryToken(): string {
	const secret = process.env.AUTH_SECRET || "default";
	const hash = createHash("sha256").update(secret).digest("hex").slice(0, 8);
	return `${CANARY_PREFIX}${hash}`;
}

/**
 * Checks if text contains the canary prefix, indicating a system prompt leak.
 * Uses the prefix rather than the full token to catch partial leaks too.
 */
export function containsCanary(text: string): boolean {
	if (!text) return false;
	return text.includes(CANARY_PREFIX);
}
