import { generateText } from "ai";
import { z } from "zod";
import { getKnowledgeBaseContent } from "@/lib/ai/knowledge-base";
import { systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import {
	getVoiceConfig,
	MAX_TTS_TEXT_LENGTH,
	type VoiceConfig,
} from "@/lib/ai/voice-config";
import { apiRequestLogger } from "@/lib/api-logging";
import { getMessageCountByUserId, saveMessages } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import {
	CircuitBreakerError,
	withAIGatewayResilience,
	withElevenLabsResilience,
} from "@/lib/resilience";
import {
	checkRateLimit,
	getRateLimitHeaders,
} from "@/lib/security/rate-limiter";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient } from "@/lib/supabase/server";
import type { DBMessage } from "@/lib/supabase/types";
import {
	parseCollaborativeSegments,
	stripMarkdownForTTS,
} from "@/lib/voice/strip-markdown-tts";

const realtimeStreamSchema = z.object({
	message: z
		.string()
		.min(1, "Message is required")
		.max(5000, "Message too long"),
	botType: z
		.enum(["alexandria", "kim", "collaborative"])
		.default("collaborative"),
	chatId: z.string().uuid("Invalid chat ID").optional(),
});

export const maxDuration = 60;

// Rate limits for realtime API
const MAX_REALTIME_REQUESTS_PER_DAY = 200;

/**
 * Generate audio for a single segment using ElevenLabs API with request stitching.
 * Uses the streaming endpoint and previous_request_ids for prosody-aligned audio.
 */
async function generateAudioForSegment(
	text: string,
	voiceConfig: VoiceConfig,
	apiKey: string,
	previousRequestIds: string[] = [],
): Promise<{ buffer: ArrayBuffer; requestId: string | null }> {
	const response = await withElevenLabsResilience(async () => {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 45000);

		try {
			const res = await fetch(
				`https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}/stream`,
				{
					method: "POST",
					headers: {
						"xi-api-key": apiKey,
						"Content-Type": "application/json",
						Accept: "audio/mpeg",
					},
					body: JSON.stringify({
						text,
						model_id: voiceConfig.modelId,
						voice_settings: {
							stability: voiceConfig.settings.stability,
							similarity_boost: voiceConfig.settings.similarityBoost,
							style: voiceConfig.settings.style ?? 0,
							use_speaker_boost: voiceConfig.settings.useSpeakerBoost ?? true,
						},
						optimize_streaming_latency: 2,
						previous_request_ids: previousRequestIds.slice(-3),
					}),
					signal: controller.signal,
				},
			);
			clearTimeout(timeoutId);

			if (!res.ok) {
				console.error("ElevenLabs API error:", res.status, res.statusText);
				if (res.status === 401) {
					throw new Error("INVALID_API_KEY");
				}
				throw new Error(`ElevenLabs API error: ${res.status}`);
			}

			return res;
		} catch (err) {
			clearTimeout(timeoutId);
			throw err;
		}
	});

	const requestId = response.headers.get("request-id");
	const buffer = await response.arrayBuffer();
	return { buffer, requestId };
}

export const POST = withCsrf(async (request: Request) => {
	const apiLog = apiRequestLogger("/api/realtime/stream");

	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		apiLog.start({ userId: user.id });

		// Rate limiting
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
			// SECURITY: Redis unavailable — fall back to DB count (fail closed)
			const messageCount = await getMessageCountByUserId({
				id: user.id,
				differenceInHours: 24,
			});

			if (messageCount >= MAX_REALTIME_REQUESTS_PER_DAY) {
				return new ChatSDKError("rate_limit:chat").toResponse();
			}
		}

		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return new ChatSDKError("bad_request:api").toResponse();
		}
		const parseResult = realtimeStreamSchema.safeParse(body);
		if (!parseResult.success) {
			return new ChatSDKError("bad_request:api").toResponse();
		}
		const { message, botType, chatId: existingChatId } = parseResult.data;

		// Get knowledge base content
		const knowledgeBaseContent = await getKnowledgeBaseContent(botType);

		// Build system prompt with realtime-specific instructions
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

		// Add realtime-specific instructions
		const realtimePrompt = `${systemPromptText}

## VOICE CONVERSATION MODE
You are in a real-time voice call. Keep responses:
- Concise (2-4 sentences max for simple questions)
- Conversational and natural
- Without markdown formatting
- Without bullet points or numbered lists (use natural speech)
- Do NOT include the suggestions JSON block
- Speak as if talking to someone on the phone

Remember: This is a voice call, not a text chat. Be direct and conversational.`;

		// Generate AI response (optimized for voice, with circuit breaker + retry)
		const result = await withAIGatewayResilience(() =>
			generateText({
				model: myProvider.languageModel("chat-model"),
				system: realtimePrompt,
				messages: [
					{
						role: "user",
						content: message,
					},
				],
				maxOutputTokens: 400, // Shorter for voice
			}),
		);

		const responseText = result.text;

		// Generate audio
		let audioUrl: string | null = null;
		const apiKey = process.env.ELEVENLABS_API_KEY;

		if (apiKey && responseText) {
			try {
				const truncatedText = responseText.slice(0, MAX_TTS_TEXT_LENGTH);

				// Handle collaborative mode with multiple speakers
				if (botType === "collaborative") {
					const segments = parseCollaborativeSegments(truncatedText);
					const validSegments = segments
						.map((s) => ({ ...s, text: stripMarkdownForTTS(s.text) }))
						.filter((s) => s.text.trim());

					if (validSegments.length > 0) {
						// Generate segments sequentially with request stitching for prosody-aligned audio
						const audioBuffers: ArrayBuffer[] = [];
						const previousRequestIds: string[] = [];

						for (const segment of validSegments) {
							const voiceConfig = getVoiceConfig(segment.speaker);
							const result = await generateAudioForSegment(
								segment.text,
								voiceConfig,
								apiKey,
								previousRequestIds,
							);
							audioBuffers.push(result.buffer);
							if (result.requestId) {
								previousRequestIds.push(result.requestId);
							}
						}

						// Concatenate audio (now prosody-aligned via request stitching)
						const totalLength = audioBuffers.reduce(
							(sum, buf) => sum + buf.byteLength,
							0,
						);
						const combined = new Uint8Array(totalLength);
						let offset = 0;
						for (const buffer of audioBuffers) {
							combined.set(new Uint8Array(buffer), offset);
							offset += buffer.byteLength;
						}

						const base64Audio = Buffer.from(combined).toString("base64");
						audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
					}
				} else {
					// Single voice
					const cleanText = stripMarkdownForTTS(truncatedText);
					if (cleanText.trim()) {
						const voiceConfig = getVoiceConfig(botType);
						const { buffer: audioData } = await generateAudioForSegment(
							cleanText,
							voiceConfig,
							apiKey,
						);
						const base64Audio = Buffer.from(audioData).toString("base64");
						audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
					}
				}
			} catch (error) {
				console.error("TTS error:", error);
				// Continue without audio
			}
		}

		// Save messages to chat history for real-time calls
		// Reuse existing chat if chatId provided, otherwise create a new one
		let savedChatId: string | null = existingChatId || null;
		try {
			const supabase = await createClient();

			if (!savedChatId) {
				// Create a new chat for this voice call session
				const chatId = crypto.randomUUID();

				let title = message.trim();
				if (title.length > 50) {
					title = `${title.slice(0, 50).replace(/\s+\S*$/, "")}...`;
				}
				if (!title) {
					title = "Voice Call";
				}

				const { error: insertError } = await supabase.from("Chat").insert({
					id: chatId,
					userId: user.id,
					title,
				});

				if (insertError) {
					console.error("Failed to create voice call chat:", insertError);
				} else {
					savedChatId = chatId;
				}
			}

			if (savedChatId) {
				const now = new Date().toISOString();

				const messages: DBMessage[] = [
					{
						id: crypto.randomUUID(),
						chatId: savedChatId,
						role: "user",
						parts: [{ type: "text", text: message }],
						attachments: [],
						botType: null,
						deletedAt: null,
						createdAt: now,
					},
					{
						id: crypto.randomUUID(),
						chatId: savedChatId,
						role: "assistant",
						parts: [{ type: "text", text: responseText }],
						attachments: [],
						botType,
						deletedAt: null,
						createdAt: new Date(Date.now() + 1).toISOString(),
					},
				];

				await saveMessages({ messages });
			}
		} catch (saveError) {
			console.error("Failed to save voice call messages:", saveError);
		}

		apiLog.success({ botType, hasAudio: !!audioUrl, chatId: savedChatId });

		return Response.json({
			text: responseText,
			audioUrl,
			chatId: savedChatId, // Return chatId so frontend can redirect
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
