import { logger } from "@/lib/logger";

// MED-1: Shared abuse pattern filtering for all AI routes
const ABUSE_PATTERNS = [
	/ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|rules?|prompts?)/i,
	/you\s+are\s+now\s+(in\s+)?DAN/i,
	/jailbreak/i,
	/\bdo\s+anything\s+now\b/i,
	/disregard\s+(your|all|the)\s+(rules?|instructions?|guidelines?)/i,
	/pretend\s+you\s+(have\s+)?no\s+(restrictions?|rules?|limits?)/i,
];

/**
 * Check if a message contains prompt injection / abuse patterns.
 * Returns true if abuse is detected.
 */
export function containsAbusePatterns(
	text: string,
	context?: { userId?: string; chatId?: string; route?: string },
): boolean {
	const hasAbuse = ABUSE_PATTERNS.some((pattern) => pattern.test(text));
	if (hasAbuse) {
		logger.warn(
			{ ...context },
			"Content moderation: prompt injection attempt blocked",
		);
	}
	return hasAbuse;
}
