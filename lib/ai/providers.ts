import "server-only";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { customProvider, wrapLanguageModel } from "ai";
import { logger } from "@/lib/logger";
import { safetyMiddleware } from "@/lib/safety/output-guard";
import { isTestEnvironment } from "../constants";

// Validate OpenRouter API key at module load (fail fast)
if (!process.env.OPENROUTER_API_KEY && !isTestEnvironment) {
	logger.error("CRITICAL: OPENROUTER_API_KEY is not set. Chat functionality will fail.");
}

// OpenRouter configuration - using stable Gemini 2.5 Flash with fallback chain
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
				// Gemini 2.5 Flash (stable) - main chat model with fallback
				"chat-model": wrapLanguageModel({
					model: openrouter("google/gemini-2.5-flash", {
						extraBody: {
							models: [
								"google/gemini-2.5-flash",
								"google/gemini-2.5-flash-lite",
							],
						},
					}),
					middleware: safetyMiddleware,
				}),
				// Gemini 2.5 Flash (stable) - for reasoning tasks with fallback
				"chat-model-reasoning": wrapLanguageModel({
					model: openrouter("google/gemini-2.5-flash", {
						extraBody: {
							models: [
								"google/gemini-2.5-flash",
								"google/gemini-2.5-flash-lite",
							],
						},
					}),
					middleware: safetyMiddleware,
				}),
				// Gemini 2.5 Flash (stable) - title generation with fallback
				"title-model": wrapLanguageModel({
					model: openrouter("google/gemini-2.5-flash", {
						extraBody: {
							models: [
								"google/gemini-2.5-flash",
								"google/gemini-2.5-flash-lite",
							],
						},
					}),
					middleware: safetyMiddleware,
				}),
				// Gemini 2.5 Flash (stable) - document generation with fallback
				"artifact-model": wrapLanguageModel({
					model: openrouter("google/gemini-2.5-flash", {
						extraBody: {
							models: [
								"google/gemini-2.5-flash",
								"google/gemini-2.5-flash-lite",
							],
						},
					}),
					middleware: safetyMiddleware,
				}),
			},
		});
