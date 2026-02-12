import "server-only";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";

// Validate OpenRouter API key at module load (fail fast)
if (!process.env.OPENROUTER_API_KEY && !isTestEnvironment) {
	console.error(
		"CRITICAL: OPENROUTER_API_KEY is not set. Chat functionality will fail.",
	);
}

// OpenRouter configuration - using FAST Gemini Flash models
const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY || "",
});

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
				// Gemini 3 Flash Preview - latest fast model
				"chat-model": openrouter("google/gemini-3-flash-preview"),
				// Gemini 3 Flash Preview - for reasoning tasks
				"chat-model-reasoning": openrouter("google/gemini-3-flash-preview"),
				// Title: Use fast Flash model
				"title-model": openrouter("google/gemini-3-flash-preview"),
				// Artifacts: Gemini 3 for quality document generation
				"artifact-model": openrouter("google/gemini-3-flash-preview"),
			},
		});
