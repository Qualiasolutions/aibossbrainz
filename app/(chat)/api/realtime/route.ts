import { generateText } from "ai";
import { after } from "next/server";
import { z } from "zod";
import { getKnowledgeBaseContent } from "@/lib/ai/knowledge-base";
import { systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { getVoiceConfig } from "@/lib/ai/voice-config";
import { recordAnalytics } from "@/lib/analytics/queries";
import { apiRequestLogger } from "@/lib/api-logging";
import { recordAICost } from "@/lib/cost/tracker";
import { checkUserSubscription } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
	CircuitBreakerError,
	withAIGatewayResilience,
	withElevenLabsResilience,
} from "@/lib/resilience";
import { containsCanary } from "@/lib/safety/canary";
import { redactPII } from "@/lib/safety/pii-redactor";
import { containsAbusePatterns } from "@/lib/security/input-moderation";
import {
	checkRateLimit,
	getRateLimitHeaders,
} from "@/lib/security/rate-limiter";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { buildCacheParams, cacheAudio, getCachedAudio } from "@/lib/tts-cache";
import { stripMarkdownForTTS } from "@/lib/voice/strip-markdown-tts";

const realtimeRequestSchema = z.object({
	message: z
		.string()
		.min(1, "Message is required")
		.max(5000, "Message too long"),
	botType: z
		.enum(["alexandria", "kim", "collaborative"])
		.default("collaborative"),
});

export const maxDuration = 30;

// Rate limits for realtime API (match stream route)
const MAX_REALTIME_REQUESTS_PER_DAY = 200;

export const POST = withCsrf(async (request: Request) => {
	const apiLog = apiRequestLogger("/api/realtime");

	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		// Check subscription status before consuming AI and ElevenLabs resources
		const subscriptionStatus = await checkUserSubscription(user.id);
		if (!subscriptionStatus.isActive) {
			return new ChatSDKError("subscription_expired:chat").toResponse();
		}

		// Rate limiting (matching stream route pattern)
		const rateLimitResult = await checkRateLimit(
			`realtime:${user.id}`,
			MAX_REALTIME_REQUESTS_PER_DAY,
		);

		if (rateLimitResult.source === "redis") {
			if (!rateLimitResult.allowed) {
				const response = new ChatSDKError("rate_limit:chat").toResponse();
				const headers = getRateLimitHeaders(
					rateLimitResult.remaining,
					MAX_REALTIME_REQUESTS_PER_DAY,
					rateLimitResult.reset,
				);
				for (const [key, value] of Object.entries(headers)) {
					response.headers.set(key, value);
				}
				return response;
			}
		} else {
			// SECURITY: Redis unavailable - verify via UserAnalytics (fail closed)
			const supabaseService = createServiceClient();
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const { data, error } = await supabaseService
				.from("UserAnalytics")
				.select("voiceMinutes")
				.eq("userId", user.id)
				.gte("date", today.toISOString())
				.maybeSingle();

			if (error) {
				return new ChatSDKError("rate_limit:chat").toResponse();
			}

			// MED-8: Use voiceRequestCount for rate limiting (added via migration).
			// Falls back to voiceMinutes if column not yet migrated.
			const voiceRequests =
				Number(
					(data as Record<string, unknown>)?.voiceRequestCount ??
						data?.voiceMinutes,
				) || 0;
			if (voiceRequests >= MAX_REALTIME_REQUESTS_PER_DAY) {
				return new ChatSDKError("rate_limit:chat").toResponse();
			}
		}

		apiLog.start({ userId: user.id });

		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return new ChatSDKError("bad_request:api").toResponse();
		}
		const parseResult = realtimeRequestSchema.safeParse(body);
		if (!parseResult.success) {
			return new ChatSDKError("bad_request:api").toResponse();
		}
		const { message, botType } = parseResult.data;

		// MED-1: Check for abuse patterns before AI processing
		if (containsAbusePatterns(message, { userId: user.id, route: "/api/realtime" })) {
			return new ChatSDKError("bad_request:api").toResponse();
		}

		// Get knowledge base content for the bot
		const knowledgeBaseContent = await getKnowledgeBaseContent(botType);

		// Build system prompt (now async)
		const systemPromptText = await systemPrompt({
			selectedChatModel: "chat-model",
			requestHints: {
				latitude: undefined,
				longitude: undefined,
				city: undefined,
				country: undefined,
			},
			botType,
			knowledgeBaseContent,
		});

		// Generate AI response (with circuit breaker + retry)
		const result = await withAIGatewayResilience(() =>
			generateText({
				model: myProvider.languageModel("chat-model"),
				system: systemPromptText,
				messages: [
					{
						role: "user",
						content: message,
					},
				],
				maxOutputTokens: 500, // Keep responses concise for voice
				abortSignal: AbortSignal.timeout(25_000), // M-13: Just under maxDuration=30
			}),
		);

		const responseText = result.text;

		// M-3: Post-hoc safety scan for realtime responses
		if (responseText) {
			try {
				const piiResult = redactPII(responseText);
				if (piiResult.redactedCount > 0) {
					logger.warn(
						{
							userId: user.id,
							redactedCount: piiResult.redactedCount,
							redactedTypes: piiResult.redactedTypes,
						},
						"PII detected in realtime AI response (post-hoc scan)",
					);
				}
				if (containsCanary(responseText)) {
					logger.error(
						{ userId: user.id },
						"CANARY LEAK: Realtime response contains system prompt fragment",
					);
				}
			} catch (scanErr) {
				logger.warn(
					{ err: scanErr },
					"Post-hoc realtime safety scan failed (non-blocking)",
				);
			}
		}

		// Generate audio using ElevenLabs with TTS cache
		let audioUrl: string | null = null;

		const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
		if (elevenLabsApiKey && responseText) {
			try {
				const voiceConfig = getVoiceConfig(botType);

				// Clean text for TTS using shared utility
				const cleanText = stripMarkdownForTTS(responseText).slice(0, 4000);

				if (cleanText) {
					// Check TTS cache first
					const cacheParams = buildCacheParams(cleanText, voiceConfig);
					const cachedUrl = await getCachedAudio(cacheParams);

					if (cachedUrl) {
						audioUrl = cachedUrl;
					} else {
						// Cache miss -- generate with ElevenLabs
						const audioData = await withElevenLabsResilience(async () => {
							const controller = new AbortController();
							const timeoutId = setTimeout(() => controller.abort(), 45000);

							try {
								const ttsResponse = await fetch(
									`https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}/stream`,
									{
										method: "POST",
										headers: {
											"Content-Type": "application/json",
											"xi-api-key": elevenLabsApiKey,
											Accept: "audio/mpeg",
										},
										body: JSON.stringify({
											text: cleanText,
											model_id: voiceConfig.modelId,
											voice_settings: {
												stability: voiceConfig.settings.stability,
												similarity_boost: voiceConfig.settings.similarityBoost,
												style: voiceConfig.settings.style ?? 0,
												use_speaker_boost:
													voiceConfig.settings.useSpeakerBoost ?? true,
											},
											optimize_streaming_latency: 2,
										}),
										signal: controller.signal,
									},
								);
								clearTimeout(timeoutId);

								if (!ttsResponse.ok) {
									throw new Error(
										`ElevenLabs API error: ${ttsResponse.status}`,
									);
								}

								return ttsResponse.arrayBuffer();
							} catch (err) {
								clearTimeout(timeoutId);
								throw err;
							}
						});

						// Cache the generated audio and use CDN URL
						const blobUrl = await cacheAudio(cacheParams, audioData);
						audioUrl = blobUrl || null;
					}
				}
			} catch (error) {
				logger.error({ err: error }, "TTS error in realtime route");
				// Continue without audio
			}
		}

		apiLog.success({ botType, hasAudio: !!audioUrl });

		// Record voice analytics for realtime route (MED-7)
		if (responseText) {
			const cleanTextLength = stripMarkdownForTTS(responseText).length;
			const estimatedMinutes = Math.max(1, Math.ceil(cleanTextLength / 750));
			after(() => {
				recordAnalytics(user.id, "voice", estimatedMinutes);
				recordAnalytics(user.id, "voice_request", 1);
			});
		}

		// MED-21: Record AI cost for tracking
		after(() => {
			recordAICost({
				userId: user.id,
				chatId: null,
				modelId: "chat-model",
				inputTokens: result.usage.promptTokens,
				outputTokens: result.usage.completionTokens,
				costUSD: 0, // Actual cost tracked via OpenRouter billing
			});
		});

		return Response.json({
			text: responseText,
			audioUrl,
		});
	} catch (error) {
		apiLog.error(error);

		if (error instanceof CircuitBreakerError) {
			return new ChatSDKError("offline:chat").toResponse();
		}

		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}

		return new ChatSDKError("offline:chat").toResponse();
	}
});
