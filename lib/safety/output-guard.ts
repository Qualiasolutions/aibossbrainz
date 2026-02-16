import "server-only";

import type { LanguageModelMiddleware } from "ai";

import { logger } from "@/lib/logger";

import { containsCanary } from "./canary";
import { redactPII } from "./pii-redactor";

const CANARY_REPLACEMENT =
	"I apologize, but I encountered an issue generating that response. Could you rephrase your question?";

/**
 * AI SDK safety middleware for non-streaming output (title generation, summaries, etc.).
 *
 * Intercepts `doGenerate` results to:
 * 1. Redact any PII found in text content (credit cards, SSNs, emails, phones)
 * 2. Detect canary token leaks indicating system prompt exposure
 *
 * Does NOT wrap streaming (`wrapStream`) -- streaming PII detection is handled
 * by the post-hoc scan in the chat route's `onFinish` callback. Buffering/modifying
 * stream chunks would defeat the purpose of streaming.
 */
export const safetyMiddleware: LanguageModelMiddleware = {
	middlewareVersion: "v2",

	wrapGenerate: async ({ doGenerate }) => {
		const result = await doGenerate();

		const modifiedContent = result.content.map((part) => {
			if (part.type !== "text") return part;

			// 1. Check for canary leak (system prompt exposure)
			if (containsCanary(part.text)) {
				logger.error(
					{ middleware: "safety" },
					"CANARY LEAK: Non-streaming AI output contains system prompt fragment",
				);
				return { ...part, text: CANARY_REPLACEMENT };
			}

			// 2. Redact PII from text output
			const { text, redactedCount, redactedTypes } = redactPII(part.text);
			if (redactedCount > 0) {
				logger.warn(
					{ middleware: "safety", redactedCount, redactedTypes },
					"PII redacted from non-streaming AI output",
				);
				return { ...part, text };
			}

			return part;
		});

		return { ...result, content: modifiedContent };
	},
};
