"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCsrf } from "@/hooks/use-csrf";
import type { BotType } from "@/lib/bot-personalities";
import { logClientError } from "@/lib/client-logger";

export type CallState =
	| "idle"
	| "connecting"
	| "listening"
	| "thinking"
	| "speaking"
	| "error";

interface VoiceCallHookOptions {
	executive: BotType;
}

interface StreamResponse {
	audioUrl?: string;
	audioData?: string;
	text?: string;
}

interface NdjsonChunk {
	type: "audio" | "done" | "error";
	data?: string;
	text?: string;
	message?: string;
}

/**
 * Hook to manage real-time voice call lifecycle.
 *
 * State machine: idle → connecting → listening → thinking → speaking → (loop back to listening)
 *
 * SpeechRecognition → AI response → TTS playback
 */
export function useVoiceCall({ executive }: VoiceCallHookOptions) {
	const [callState, setCallState] = useState<CallState>("idle");
	const [transcript, setTranscript] = useState<string>("");
	const [errorMessage, setErrorMessage] = useState<string>("");

	const { csrfFetch } = useCsrf();

	// Refs for persistent objects across renders — avoids stale closures
	const recognitionRef = useRef<SpeechRecognition | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const audioQueueRef = useRef<string[]>([]);
	const isPlayingRef = useRef(false);
	const shouldListenRef = useRef(false);
	const callStateRef = useRef<CallState>("idle");
	const csrfFetchRef = useRef(csrfFetch);
	const handleAIResponseRef = useRef<(text: string) => Promise<void>>(
		async () => {},
	);
	const startedRef = useRef(false);

	// Keep refs in sync
	csrfFetchRef.current = csrfFetch;
	callStateRef.current = callState;

	/**
	 * Create and start a new speech recognition instance.
	 * Uses refs exclusively — no dependency on React state — so it's safe
	 * to call from any callback without stale closure issues.
	 */
	const startRecognitionInstance = useCallback(() => {
		// Clean up existing recognition
		if (recognitionRef.current) {
			try {
				recognitionRef.current.stop();
			} catch {
				// Ignore — may already be stopped
			}
			recognitionRef.current = null;
		}

		if (
			!("webkitSpeechRecognition" in window) &&
			!("SpeechRecognition" in window)
		) {
			setCallState("error");
			setErrorMessage(
				"Speech recognition is not supported in this browser. Please use Chrome.",
			);
			return;
		}

		const SpeechRecognition =
			window.SpeechRecognition || window.webkitSpeechRecognition;
		const recognition = new SpeechRecognition();

		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.lang = "en-US";

		let finalTranscript = "";

		recognition.onresult = (event: SpeechRecognitionEvent) => {
			let interimTranscript = "";

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i];
				if (result.isFinal) {
					finalTranscript += result[0].transcript;
				} else {
					interimTranscript += result[0].transcript;
				}
			}

			setTranscript(finalTranscript + interimTranscript);

			if (finalTranscript.trim()) {
				recognition.stop();
				handleAIResponseRef.current(finalTranscript.trim());
				finalTranscript = "";
			}
		};

		recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			if (event.error === "no-speech" || event.error === "aborted") {
				if (shouldListenRef.current) {
					try {
						recognition.start();
					} catch {
						// Ignore — may already be running
					}
				}
				return;
			}

			if (event.error === "not-allowed") {
				setCallState("error");
				setErrorMessage(
					"Microphone access was denied. Please allow microphone access and try again.",
				);
				return;
			}

			logClientError(new Error(`Speech recognition error: ${event.error}`), {
				component: "useVoiceCall",
				action: "recognition_error",
				errorType: event.error,
			});
		};

		recognition.onend = () => {
			// Reads from ref — not from a stale closure
			if (shouldListenRef.current && callStateRef.current === "listening") {
				try {
					recognition.start();
				} catch {
					// Ignore — may already be running
				}
			}
		};

		recognitionRef.current = recognition;

		try {
			recognition.start();
		} catch (error) {
			logClientError(error, {
				component: "useVoiceCall",
				action: "start_recognition",
			});
		}
	}, []);

	/**
	 * Play queued audio chunks sequentially.
	 * First chunk triggers "speaking" state, subsequent chain via onended.
	 */
	const playNextInQueue = useCallback(() => {
		if (audioQueueRef.current.length === 0) {
			isPlayingRef.current = false;
			// All audio finished — return to listening
			if (shouldListenRef.current) {
				setCallState("listening");
				startRecognitionInstance();
			}
			return;
		}

		isPlayingRef.current = true;
		const base64 = audioQueueRef.current.shift()!;
		const audioSrc = `data:audio/mpeg;base64,${base64}`;
		const audio = new Audio(audioSrc);
		audioRef.current = audio;

		audio.onended = () => {
			playNextInQueue();
		};

		audio.onerror = (error) => {
			logClientError(error, {
				component: "useVoiceCall",
				action: "audio_playback",
				executive,
			});
			playNextInQueue();
		};

		audio.play().catch((err) => {
			logClientError(err, {
				component: "useVoiceCall",
				action: "audio_play_promise",
				executive,
			});
			playNextInQueue();
		});
	}, [executive, startRecognitionInstance]);

	/**
	 * Enqueue a base64 audio chunk. Starts playback if not already playing.
	 */
	const enqueueAudio = useCallback(
		(base64: string) => {
			audioQueueRef.current.push(base64);

			if (!isPlayingRef.current) {
				setCallState("speaking");
				playNextInQueue();
			}
		},
		[playNextInQueue],
	);

	/**
	 * Handle NDJSON streaming response (single voice — alexandria/kim).
	 * Reads audio chunks as they arrive and queues them for playback.
	 */
	const handleStreamingResponse = useCallback(
		async (response: Response) => {
			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error("Response body is not readable");
			}

			const decoder = new TextDecoder();
			let buffer = "";

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });

					// Process complete NDJSON lines
					const lines = buffer.split("\n");
					// Keep the last incomplete line in buffer
					buffer = lines.pop() || "";

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed) continue;

						try {
							const chunk: NdjsonChunk = JSON.parse(trimmed);

							if (chunk.type === "audio" && chunk.data) {
								enqueueAudio(chunk.data);
							} else if (chunk.type === "error") {
								throw new Error(chunk.message || "Stream error");
							}
							// "done" type — stream complete, no action needed
						} catch (parseErr) {
							// Skip malformed lines
							if (parseErr instanceof SyntaxError === false) {
								throw parseErr;
							}
						}
					}
				}

				// Process any remaining buffer
				if (buffer.trim()) {
					try {
						const chunk: NdjsonChunk = JSON.parse(buffer.trim());
						if (chunk.type === "audio" && chunk.data) {
							enqueueAudio(chunk.data);
						}
					} catch {
						// Ignore trailing partial data
					}
				}
			} finally {
				reader.releaseLock();
			}

			// If no audio was queued at all, go back to listening
			if (
				audioQueueRef.current.length === 0 &&
				!isPlayingRef.current &&
				shouldListenRef.current
			) {
				setCallState("listening");
				startRecognitionInstance();
			}
		},
		[enqueueAudio, startRecognitionInstance],
	);

	/**
	 * Handle legacy JSON response (collaborative mode).
	 */
	const handleLegacyResponse = useCallback(
		async (data: StreamResponse) => {
			if (data.audioUrl || data.audioData) {
				const audioSrc = data.audioUrl || data.audioData;
				if (audioSrc) {
					setCallState("speaking");

					const audio = new Audio(
						data.audioUrl ? audioSrc : `data:audio/mpeg;base64,${audioSrc}`,
					);
					audioRef.current = audio;

					audio.onended = () => {
						if (shouldListenRef.current) {
							setCallState("listening");
							startRecognitionInstance();
						}
					};

					audio.onerror = (error) => {
						logClientError(error, {
							component: "useVoiceCall",
							action: "audio_playback",
							executive,
						});
						if (shouldListenRef.current) {
							setCallState("listening");
							startRecognitionInstance();
						}
					};

					await audio.play();
					return;
				}
			}

			// No audio — show text briefly then return to listening
			if (data.text) {
				setTranscript(data.text);
			}

			if (shouldListenRef.current) {
				setCallState("listening");
				startRecognitionInstance();
			}
		},
		[executive, startRecognitionInstance],
	);

	/**
	 * Send transcript to AI and play response
	 */
	const handleAIResponse = useCallback(
		async (text: string) => {
			if (!text.trim()) return;

			try {
				setCallState("thinking");
				setTranscript(text);

				// Reset audio queue
				audioQueueRef.current = [];
				isPlayingRef.current = false;

				const response = await csrfFetchRef.current("/api/realtime/stream", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						message: text,
						botType: executive,
					}),
				});

				if (!response.ok) {
					throw new Error(`AI request failed: ${response.status}`);
				}

				const contentType = response.headers.get("content-type") || "";

				if (contentType.includes("ndjson")) {
					// Streaming NDJSON response (single voice)
					await handleStreamingResponse(response);
				} else {
					// Legacy JSON response (collaborative mode)
					const data: StreamResponse = await response.json();
					await handleLegacyResponse(data);
				}
			} catch (error) {
				logClientError(error, {
					component: "useVoiceCall",
					action: "ai_response",
					executive,
				});

				if (shouldListenRef.current) {
					setCallState("listening");
					startRecognitionInstance();
				}
			}
		},
		[
			executive,
			startRecognitionInstance,
			handleStreamingResponse,
			handleLegacyResponse,
		],
	);

	// Keep handleAIResponse ref in sync for use in recognition callbacks
	handleAIResponseRef.current = handleAIResponse;

	/**
	 * Start the voice call — request mic permission and begin listening.
	 * Guarded by startedRef to prevent double-invocation from useEffect re-fires.
	 */
	const startCall = useCallback(async () => {
		if (startedRef.current) return;
		startedRef.current = true;

		try {
			setCallState("connecting");

			// Request microphone permission
			await navigator.mediaDevices.getUserMedia({ audio: true });

			shouldListenRef.current = true;
			setCallState("listening");
			startRecognitionInstance();
		} catch (error) {
			logClientError(error, {
				component: "useVoiceCall",
				action: "start_call",
				errorType: "microphone_permission",
			});
			setCallState("error");
			setErrorMessage(
				"Could not access microphone. Please allow microphone access and try again.",
			);
		}
	}, [startRecognitionInstance]);

	/**
	 * Stop the voice call — stop recognition, pause audio, reset state
	 */
	const stopCall = useCallback(() => {
		shouldListenRef.current = false;
		startedRef.current = false;

		if (recognitionRef.current) {
			try {
				recognitionRef.current.stop();
			} catch {
				// Ignore — likely already stopped
			}
			recognitionRef.current = null;
		}

		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current = null;
		}

		// Clear audio queue
		audioQueueRef.current = [];
		isPlayingRef.current = false;

		setCallState("idle");
		setTranscript("");
		setErrorMessage("");
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			shouldListenRef.current = false;
			if (recognitionRef.current) {
				try {
					recognitionRef.current.stop();
				} catch {
					// Ignore
				}
				recognitionRef.current = null;
			}
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current = null;
			}
			audioQueueRef.current = [];
			isPlayingRef.current = false;
		};
	}, []);

	return {
		callState,
		transcript,
		errorMessage,
		startCall,
		stopCall,
		isListening: callState === "listening",
		isThinking: callState === "thinking",
		isSpeaking: callState === "speaking",
		isConnecting: callState === "connecting",
		hasError: callState === "error",
	};
}
