import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { customProvider, wrapLanguageModel } from "ai";
import { createFallback } from "ai-fallback";
import { logger } from "@/lib/logger";
import { safetyMiddleware } from "@/lib/safety/output-guard";
import { isTestEnvironment } from "../constants";

/**
 * Model Version Configuration
 *
 * Primary: google/gemini-2.5-flash (OpenRouter stable alias)
 *   - Auto-updates when Google promotes new stable versions
 *   - OpenRouter fallback chain: gemini-2.5-flash -> gemini-2.5-flash-lite
 *
 * Secondary (direct Google fallback): gemini-2.0-flash
 *   - Used when OpenRouter is completely down
 *   - Set GOOGLE_AI_API_KEY env var to enable
 *
 * For date-pinned versions (testing only):
 *   google/gemini-2.5-flash-preview-09-2025
 *
 * Monitor actual model via OpenRouter response header: x-model-id
 *
 * Last verified: 2026-02-19
 */

// Validate OpenRouter API key at module load (fail fast)
if (!process.env.OPENROUTER_API_KEY && !isTestEnvironment) {
	logger.error(
		"CRITICAL: OPENROUTER_API_KEY is not set. Chat functionality will fail.",
	);
}

// OpenRouter configuration - using stable Gemini 2.5 Flash with fallback chain
const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY || "",
});

// Secondary provider: direct Google Gemini for when OpenRouter is completely down
const googleDirect = process.env.GOOGLE_AI_API_KEY
	? createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_AI_API_KEY })
	: null;

if (!googleDirect && !isTestEnvironment) {
	logger.warn(
		"GOOGLE_AI_API_KEY not set - no secondary AI provider fallback available",
	);
}

/**
 * Create a language model with optional fallback to direct Google Gemini.
 * Safety middleware wraps the outer model so it applies regardless of which provider responds.
 *
 * - If GOOGLE_AI_API_KEY is set: OpenRouter -> direct Google Gemini fallback
 * - If GOOGLE_AI_API_KEY is not set: OpenRouter only (no fallback, no crash)
 */
function createModelWithFallback(
	openRouterModel: Parameters<typeof wrapLanguageModel>[0]["model"],
	googleModelId: string,
) {
	if (!googleDirect) {
		// No fallback available -- wrap OpenRouter model directly (current behavior)
		return wrapLanguageModel({
			model: openRouterModel,
			middleware: safetyMiddleware,
		});
	}

	// Wrap fallback chain with safety middleware on the outside
	return wrapLanguageModel({
		model: createFallback({
			models: [openRouterModel, googleDirect(googleModelId)],
			onError: (error, modelId) =>
				logger.warn(
					{ err: error, modelId },
					"AI model failed, trying fallback",
				),
			modelResetInterval: 60_000, // Try primary again after 1 minute
		}),
		middleware: safetyMiddleware,
	});
}

export const myProvider = isTestEnvironment
	? (() => {
			const {
				artifactModel,
				chatModel,
				reasoningModel,
				titleModel,
			} = require("./models.mock");
			return customProvider({
				languageModels: {
					"chat-model": chatModel,
					"chat-model-reasoning": reasoningModel,
					"title-model": titleModel,
					"artifact-model": artifactModel,
				},
			});
		})()
	: customProvider({
			languageModels: {
				// Gemini 2.5 Flash (stable) - main chat model with fallback
				"chat-model": createModelWithFallback(
					openrouter("google/gemini-2.5-flash", {
						extraBody: {
							models: [
								"google/gemini-2.5-flash",
								"google/gemini-2.5-flash-lite",
							],
						},
					}),
					"gemini-2.0-flash",
				),
				// Gemini 2.5 Flash (stable) - for reasoning tasks with fallback
				"chat-model-reasoning": createModelWithFallback(
					openrouter("google/gemini-2.5-flash", {
						extraBody: {
							models: [
								"google/gemini-2.5-flash",
								"google/gemini-2.5-flash-lite",
							],
						},
					}),
					"gemini-2.0-flash",
				),
				// Gemini 2.5 Flash (stable) - title generation with fallback
				"title-model": createModelWithFallback(
					openrouter("google/gemini-2.5-flash", {
						extraBody: {
							models: [
								"google/gemini-2.5-flash",
								"google/gemini-2.5-flash-lite",
							],
						},
					}),
					"gemini-2.0-flash",
				),
				// Gemini 2.5 Flash (stable) - document generation with fallback
				"artifact-model": createModelWithFallback(
					openrouter("google/gemini-2.5-flash", {
						extraBody: {
							models: [
								"google/gemini-2.5-flash",
								"google/gemini-2.5-flash-lite",
							],
						},
					}),
					"gemini-2.0-flash",
				),
			},
		});
