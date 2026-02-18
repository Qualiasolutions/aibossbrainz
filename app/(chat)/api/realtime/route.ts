import { generateText } from "ai";
import { z } from "zod";
import { getKnowledgeBaseContent } from "@/lib/ai/knowledge-base";
import { systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { getVoiceConfig } from "@/lib/ai/voice-config";
import { apiRequestLogger } from "@/lib/api-logging";
import { checkUserSubscription } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
	CircuitBreakerError,
	withAIGatewayResilience,
	withElevenLabsResilience,
} from "@/lib/resilience";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient } from "@/lib/supabase/server";
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
			}),
		);

		const responseText = result.text;

		// Generate audio using ElevenLabs
		let audioUrl: string | null = null;

		const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
		if (elevenLabsApiKey && responseText) {
			try {
				const voiceConfig = getVoiceConfig(botType);

				// Clean text for TTS using shared utility
				const cleanText = stripMarkdownForTTS(responseText).slice(0, 4000);

				if (cleanText) {
					// Use resilience wrapper for ElevenLabs TTS (circuit breaker + retry)
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
								throw new Error(`ElevenLabs API error: ${ttsResponse.status}`);
							}

							return ttsResponse.arrayBuffer();
						} catch (err) {
							clearTimeout(timeoutId);
							throw err;
						}
					});

					const base64Audio = Buffer.from(audioData).toString("base64");
					audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
				}
			} catch (error) {
				logger.error({ err: error }, "TTS error in realtime route");
				// Continue without audio
			}
		}

		apiLog.success({ botType, hasAudio: !!audioUrl });

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
