import { streamText } from "ai";
import { after } from "next/server";
import { z } from "zod";
import { getKnowledgeBaseContent } from "@/lib/ai/knowledge-base";
import { systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import {
	getVoiceConfig,
	MAX_TTS_TEXT_LENGTH,
	type VoiceConfig,
} from "@/lib/ai/voice-config";
import { recordAnalytics } from "@/lib/analytics/queries";
import { apiRequestLogger } from "@/lib/api-logging";
import { recordAICost } from "@/lib/cost/tracker";
import { checkUserSubscription, saveMessages } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
	CircuitBreakerError,
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
import type { DBMessage } from "@/lib/supabase/types";
import { buildCacheParams, cacheAudio, getCachedAudio } from "@/lib/tts-cache";
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
	chatId: z.string().uuid("Invalid chat ID").nullish(),
	history: z
		.array(
			z.object({
				role: z.enum(["user", "assistant"]),
				content: z.string().max(5000),
			}),
		)
		.max(20)
		.default([]),
});

export const maxDuration = 60;

// Rate limits for realtime API
const MAX_REALTIME_REQUESTS_PER_DAY = 200;

/** Sentence boundary: `. `, `! `, `? ` followed by uppercase or end of text */
const SENTENCE_END_RE = /[.!?]\s+(?=[A-Z])|[.!?]$/;

/**
 * Split accumulated text at the first complete sentence boundary.
 * Returns [firstSentence, remainder] or null if no boundary found.
 */
function splitAtSentence(text: string): [string, string] | null {
	const match = SENTENCE_END_RE.exec(text);
	if (!match) return null;
	const splitIndex = match.index + match[0].trimEnd().length;
	return [text.slice(0, splitIndex).trim(), text.slice(splitIndex).trim()];
}

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
				logger.error(
					{ status: res.status, statusText: res.statusText },
					"ElevenLabs API error",
				);
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

/**
 * Generate collaborative audio (sequential segments with request stitching).
 * Returns combined audio buffer as base64, or null on failure.
 */
async function generateCollaborativeAudio(
	responseText: string,
	apiKey: string,
): Promise<string | null> {
	const truncatedText = responseText.slice(0, MAX_TTS_TEXT_LENGTH);
	const segments = parseCollaborativeSegments(truncatedText);
	const validSegments = segments
		.map((s) => ({ ...s, text: stripMarkdownForTTS(s.text) }))
		.filter((s) => s.text.trim());

	if (validSegments.length === 0) return null;

	const audioBuffers: ArrayBuffer[] = [];
	const previousRequestIds: string[] = [];

	for (let i = 0; i < validSegments.length; i++) {
		const segment = validSegments[i];
		try {
			const voiceConfig = getVoiceConfig(segment.speaker);

			// Check TTS cache
			const cacheParams = buildCacheParams(segment.text, voiceConfig);
			const cachedUrl = await getCachedAudio(cacheParams);

			if (cachedUrl) {
				const cachedResponse = await fetch(cachedUrl);
				const cachedBuffer = await cachedResponse.arrayBuffer();
				audioBuffers.push(cachedBuffer);
				continue;
			}

			const segResult = await generateAudioForSegment(
				segment.text,
				voiceConfig,
				apiKey,
				previousRequestIds,
			);
			audioBuffers.push(segResult.buffer);
			if (segResult.requestId) {
				previousRequestIds.push(segResult.requestId);
			}

			// Cache in background
			cacheAudio(cacheParams, segResult.buffer).catch(() => {});
		} catch (err) {
			logger.warn(
				{ err, segmentIndex: i, speaker: segment.speaker },
				"Collaborative segment TTS failed, skipping",
			);
		}
	}

	if (audioBuffers.length === 0) return null;

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

	return Buffer.from(combined.buffer).toString("base64");
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

		// Check subscription status before consuming AI and ElevenLabs resources
		const subscriptionStatus = await checkUserSubscription(user.id);
		if (!subscriptionStatus.isActive) {
			return new ChatSDKError("subscription_expired:chat").toResponse();
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
		const {
			message,
			botType,
			chatId: existingChatId,
			history,
		} = parseResult.data;

		// MED-1: Check for abuse patterns before AI processing
		if (
			containsAbusePatterns(message, {
				userId: user.id,
				route: "/api/realtime/stream",
			})
		) {
			return new ChatSDKError("bad_request:api").toResponse();
		}

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

		const apiKey = process.env.ELEVENLABS_API_KEY;

		// --- Collaborative mode: keep sequential approach (needs previous_request_ids) ---
		if (botType === "collaborative") {
			return handleCollaborativeResponse({
				message,
				botType,
				realtimePrompt,
				existingChatId,
				apiKey,
				userId: user.id,
				apiLog,
				history,
			});
		}

		// --- Single-voice mode: sentence-level streaming ---
		const voiceConfig = getVoiceConfig(botType);
		const encoder = new TextEncoder();

		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Build messages with conversation history
					const aiMessages = [
						...history.map((h) => ({
							role: h.role as "user" | "assistant",
							content: h.content,
						})),
						{ role: "user" as const, content: message },
					];

					const result = streamText({
						model: myProvider.languageModel("chat-model"),
						system: realtimePrompt,
						messages: aiMessages,
						maxOutputTokens: 250,
						abortSignal: AbortSignal.timeout(55_000),
					});

					let accumulated = "";
					let fullText = "";
					let firstSentenceSent = false;

					for await (const chunk of result.textStream) {
						accumulated += chunk;
						fullText += chunk;

						// Try to extract a complete first sentence
						if (!firstSentenceSent) {
							const split = splitAtSentence(accumulated);
							if (split) {
								const [sentence, remainder] = split;
								accumulated = remainder;
								firstSentenceSent = true;

								// Generate TTS for first sentence immediately
								if (apiKey && sentence.trim()) {
									try {
										const cleanText = stripMarkdownForTTS(sentence);
										if (cleanText.trim()) {
											const { buffer } = await generateAudioForSegment(
												cleanText,
												voiceConfig,
												apiKey,
											);
											const base64 = Buffer.from(buffer).toString("base64");
											const line = JSON.stringify({
												type: "audio",
												data: base64,
											});
											controller.enqueue(encoder.encode(`${line}\n`));

											// Cache first sentence in background
											after(() => {
												const cacheParams = buildCacheParams(
													cleanText,
													voiceConfig,
												);
												cacheAudio(cacheParams, buffer).catch(() => {});
											});
										}
									} catch (err) {
										logger.warn({ err }, "First sentence TTS failed");
									}
								}
							}
						}
					}

					// Collect usage for cost tracking
					const usage = await result.usage;

					// M-3: Post-hoc safety scan
					if (fullText) {
						try {
							const piiResult = redactPII(fullText);
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
							if (containsCanary(fullText)) {
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

					// Generate TTS for remaining text (everything after first sentence)
					const remainingText = firstSentenceSent ? accumulated : fullText;

					if (apiKey && remainingText.trim()) {
						try {
							const cleanRemaining = stripMarkdownForTTS(remainingText);
							if (cleanRemaining.trim()) {
								const { buffer } = await generateAudioForSegment(
									cleanRemaining,
									voiceConfig,
									apiKey,
								);
								const base64 = Buffer.from(buffer).toString("base64");
								const line = JSON.stringify({
									type: "audio",
									data: base64,
									text: fullText,
								});
								controller.enqueue(encoder.encode(`${line}\n`));

								// Cache remaining in background
								after(() => {
									const cacheParams = buildCacheParams(
										cleanRemaining,
										voiceConfig,
									);
									cacheAudio(cacheParams, buffer).catch(() => {});
								});
							}
						} catch (err) {
							logger.warn({ err }, "Remaining text TTS failed");
						}
					} else if (!apiKey) {
						// No TTS available — send text-only response
						const line = JSON.stringify({
							type: "audio",
							text: fullText,
						});
						controller.enqueue(encoder.encode(`${line}\n`));
					}

					// If first sentence was never sent (short response), send full text as single audio
					if (!firstSentenceSent && apiKey && fullText.trim()) {
						try {
							const cleanFull = stripMarkdownForTTS(fullText);
							if (cleanFull.trim()) {
								const { buffer } = await generateAudioForSegment(
									cleanFull,
									voiceConfig,
									apiKey,
								);
								const base64 = Buffer.from(buffer).toString("base64");
								const line = JSON.stringify({
									type: "audio",
									data: base64,
									text: fullText,
								});
								controller.enqueue(encoder.encode(`${line}\n`));

								after(() => {
									const cacheParams = buildCacheParams(cleanFull, voiceConfig);
									cacheAudio(cacheParams, buffer).catch(() => {});
								});
							}
						} catch (err) {
							logger.warn({ err }, "Full text TTS failed");
						}
					}

					// Send final metadata line (chatId for client to track)
					const metaLine = JSON.stringify({ type: "done" });
					controller.enqueue(encoder.encode(`${metaLine}\n`));
					controller.close();

					// Defer all DB writes to after() — not blocking response
					after(async () => {
						try {
							const afterSupabase = await createClient();
							let savedChatId = existingChatId || null;

							if (!savedChatId) {
								const chatId = crypto.randomUUID();
								let title = message.trim();
								if (title.length > 50) {
									title = `${title.slice(0, 50).replace(/\s+\S*$/, "")}...`;
								}
								if (!title) title = "Voice Call";

								const { error: insertError } = await afterSupabase
									.from("Chat")
									.insert({
										id: chatId,
										userId: user.id,
										title,
										chatType: "voice",
									});

								if (!insertError) savedChatId = chatId;
								else
									logger.error(
										{ err: insertError, chatId },
										"Failed to create voice call chat",
									);
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
										parts: [{ type: "text", text: fullText }],
										attachments: [],
										botType,
										deletedAt: null,
										createdAt: new Date(Date.now() + 1).toISOString(),
									},
								];
								await saveMessages({ messages });
							}

							// Voice analytics
							if (fullText) {
								const cleanForEstimate = stripMarkdownForTTS(fullText);
								const estimatedMinutes = Math.max(
									1,
									Math.ceil(cleanForEstimate.length / 750),
								);
								recordAnalytics(user.id, "voice", estimatedMinutes);
								recordAnalytics(user.id, "voice_request", 1);
							}

							// AI cost tracking
							recordAICost({
								userId: user.id,
								chatId: savedChatId,
								modelId: "chat-model",
								inputTokens: usage.inputTokens ?? 0,
								outputTokens: usage.outputTokens ?? 0,
								costUSD: 0,
							});

							apiLog.success({
								botType,
								hasAudio: !!apiKey,
								audioDelivery: apiKey ? "streaming" : "none",
								chatId: savedChatId,
							});
						} catch (afterError) {
							logger.error(
								{ err: afterError },
								"Failed in after() for voice stream",
							);
						}
					});
				} catch (err) {
					logger.error({ err }, "Voice stream error");
					const errorLine = JSON.stringify({
						type: "error",
						message: "Stream failed",
					});
					controller.enqueue(encoder.encode(`${errorLine}\n`));
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "application/x-ndjson",
				"Cache-Control": "no-cache",
				"Transfer-Encoding": "chunked",
			},
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

/**
 * Handle collaborative mode — sequential generation + TTS (needs request stitching).
 * Falls back to single JSON response since collaborative requires previous_request_ids.
 */
async function handleCollaborativeResponse({
	message,
	botType,
	realtimePrompt,
	existingChatId,
	apiKey,
	userId,
	apiLog,
	history,
}: {
	message: string;
	botType: "collaborative";
	realtimePrompt: string;
	existingChatId: string | null | undefined;
	apiKey: string | undefined;
	userId: string;
	apiLog: ReturnType<typeof apiRequestLogger>;
	history: Array<{ role: "user" | "assistant"; content: string }>;
}) {
	// Build messages with conversation history
	const aiMessages = [
		...history.map((h) => ({
			role: h.role as "user" | "assistant",
			content: h.content,
		})),
		{ role: "user" as const, content: message },
	];

	// Use streamText but collect full text (collaborative needs full text for segment parsing)
	const result = streamText({
		model: myProvider.languageModel("chat-model"),
		system: realtimePrompt,
		messages: aiMessages,
		maxOutputTokens: 250,
		abortSignal: AbortSignal.timeout(55_000),
	});

	// Collect full text
	let responseText = "";
	for await (const chunk of result.textStream) {
		responseText += chunk;
	}

	const usage = await result.usage;

	// M-3: Post-hoc safety scan
	if (responseText) {
		try {
			const piiResult = redactPII(responseText);
			if (piiResult.redactedCount > 0) {
				logger.warn(
					{
						userId,
						redactedCount: piiResult.redactedCount,
						redactedTypes: piiResult.redactedTypes,
					},
					"PII detected in realtime AI response (post-hoc scan)",
				);
			}
			if (containsCanary(responseText)) {
				logger.error(
					{ userId },
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

	// Generate collaborative audio
	let audioBase64: string | null = null;
	if (apiKey && responseText) {
		try {
			audioBase64 = await generateCollaborativeAudio(responseText, apiKey);
		} catch (error) {
			logger.error({ err: error }, "Collaborative TTS error");
		}
	}

	// Defer DB writes
	after(async () => {
		try {
			const afterSupabase = await createClient();
			let savedChatId = existingChatId || null;

			if (!savedChatId) {
				const chatId = crypto.randomUUID();
				let title = message.trim();
				if (title.length > 50) {
					title = `${title.slice(0, 50).replace(/\s+\S*$/, "")}...`;
				}
				if (!title) title = "Voice Call";

				const { error: insertError } = await afterSupabase.from("Chat").insert({
					id: chatId,
					userId,
					title,
					chatType: "voice",
				});

				if (!insertError) savedChatId = chatId;
				else
					logger.error(
						{ err: insertError, chatId },
						"Failed to create voice call chat",
					);
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

			if (responseText) {
				const cleanForEstimate = stripMarkdownForTTS(responseText);
				const estimatedMinutes = Math.max(
					1,
					Math.ceil(cleanForEstimate.length / 750),
				);
				recordAnalytics(userId, "voice", estimatedMinutes);
				recordAnalytics(userId, "voice_request", 1);
			}

			recordAICost({
				userId,
				chatId: savedChatId,
				modelId: "chat-model",
				inputTokens: usage.inputTokens ?? 0,
				outputTokens: usage.outputTokens ?? 0,
				costUSD: 0,
			});

			apiLog.success({
				botType,
				hasAudio: !!audioBase64,
				audioDelivery: audioBase64 ? "base64" : "none",
				chatId: savedChatId,
			});
		} catch (afterError) {
			logger.error(
				{ err: afterError },
				"Failed in after() for collaborative voice",
			);
		}
	});

	// Collaborative returns single JSON (not NDJSON)
	return Response.json({
		text: responseText,
		audioData: audioBase64,
		chatId: existingChatId || null,
	});
}
