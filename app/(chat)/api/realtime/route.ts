import { generateText } from "ai";
import { getKnowledgeBaseContent } from "@/lib/ai/knowledge-base";
import { systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { getVoiceForBot } from "@/lib/ai/voice-config";
import { apiRequestLogger } from "@/lib/api-logging";
import { ChatSDKError } from "@/lib/errors";
import {
	CircuitBreakerError,
	withAIGatewayResilience,
	withElevenLabsResilience,
} from "@/lib/resilience";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient } from "@/lib/supabase/server";

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

		apiLog.start({ userId: user.id });

		const { message, botType = "collaborative" } = await request.json();

		const validBotTypes = ["alexandria", "kim", "collaborative"] as const;
		if (botType && !validBotTypes.includes(botType)) {
			return new Response("Invalid botType", { status: 400 });
		}

		if (!message || typeof message !== "string") {
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
			botType: botType as "alexandria" | "kim" | "collaborative",
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
				const voiceId = getVoiceForBot(botType);

				// Clean text for TTS (remove markdown, tables, etc.)
				const cleanText = responseText
					.replace(/```[\s\S]*?```/g, " See the code displayed. ")
					.replace(/\|[\s\S]*?\|/g, " See the table displayed. ")
					.replace(/#{1,6}\s/g, "")
					.replace(/\*\*/g, "")
					.replace(/\*/g, "")
					.replace(/`/g, "")
					.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
					.replace(/\n+/g, " ")
					.trim()
					.slice(0, 4000); // ElevenLabs limit

				if (cleanText) {
					// Use resilience wrapper for ElevenLabs TTS (circuit breaker + retry)
					const audioData = await withElevenLabsResilience(async () => {
						const controller = new AbortController();
						const timeoutId = setTimeout(() => controller.abort(), 45000);

						try {
							const ttsResponse = await fetch(
								`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
								{
									method: "POST",
									headers: {
										"Content-Type": "application/json",
										"xi-api-key": elevenLabsApiKey,
									},
									body: JSON.stringify({
										text: cleanText,
										model_id: "eleven_flash_v2_5",
										voice_settings: {
											stability: 0.5,
											similarity_boost: 0.75,
											style: 0.0,
											use_speaker_boost: true,
										},
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
				console.error("TTS error:", error);
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
