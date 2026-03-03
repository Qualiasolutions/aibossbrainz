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

export interface ConversationEntry {
	role: "user" | "assistant";
	content: string;
}

interface VoiceCallHookOptions {
	executive: BotType;
}

interface NdjsonChunk {
	type: "audio" | "done" | "error";
	data?: string;
	text?: string;
	message?: string;
}

/** Wait this long after last speech before sending to AI */
const SILENCE_TIMEOUT_MS = 1500;
/** Max conversation history messages to send */
const MAX_HISTORY = 20;

export function useVoiceCall({ executive }: VoiceCallHookOptions) {
	const [callState, setCallState] = useState<CallState>("idle");
	const [transcript, setTranscript] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [isMuted, setIsMuted] = useState(false);
	const [callDuration, setCallDuration] = useState(0);
	const [conversation, setConversation] = useState<ConversationEntry[]>([]);

	const { csrfFetch } = useCsrf();

	// ---- Refs (persistent across renders, no stale closures) ----
	const recognitionRef = useRef<SpeechRecognition | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const audioQueueRef = useRef<string[]>([]);
	const isPlayingRef = useRef(false);
	const shouldListenRef = useRef(false);
	const callStateRef = useRef<CallState>("idle");
	const csrfFetchRef = useRef(csrfFetch);
	const startedRef = useRef(false);
	const isMutedRef = useRef(false);

	// Silence detection
	const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const accumulatedRef = useRef("");

	// Conversation history
	const conversationRef = useRef<ConversationEntry[]>([]);

	// Call timer
	const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null,
	);
	const callStartRef = useRef(0);

	// Audio analysis for visualizer
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);

	// Abort controller for in-flight fetch requests
	const abortControllerRef = useRef<AbortController | null>(null);

	// Function refs to break circular deps
	const sendToAIRef = useRef<
		(text: string, skipHistory?: boolean) => Promise<void>
	>(async () => {});
	const startRecognitionRef = useRef<() => void>(() => {});

	// Keep refs in sync
	csrfFetchRef.current = csrfFetch;
	callStateRef.current = callState;
	isMutedRef.current = isMuted;

	// ---- Helpers ----

	const clearSilenceTimer = useCallback(() => {
		if (silenceTimerRef.current) {
			clearTimeout(silenceTimerRef.current);
			silenceTimerRef.current = null;
		}
	}, []);

	const stopAudioPlayback = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
			audioRef.current = null;
		}
		audioQueueRef.current = [];
		isPlayingRef.current = false;
	}, []);

	// ---- Speech Recognition with silence-based turn detection ----

	const startRecognitionInstance = useCallback(() => {
		if (recognitionRef.current) {
			try {
				recognitionRef.current.stop();
			} catch {}
			recognitionRef.current = null;
		}

		if (
			!("webkitSpeechRecognition" in window) &&
			!("SpeechRecognition" in window)
		) {
			setCallState("error");
			setErrorMessage(
				"Speech recognition not supported. Please use Chrome or Edge.",
			);
			return;
		}

		const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
		const recognition = new SR();

		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.lang = "en-US";

		recognition.onresult = (event: SpeechRecognitionEvent) => {
			if (isMutedRef.current) return;

			// If AI is speaking, this is an interruption
			if (
				callStateRef.current === "speaking" ||
				callStateRef.current === "thinking"
			) {
				// Check if this is actual speech (not just noise)
				let hasContent = false;
				for (let i = event.resultIndex; i < event.results.length; i++) {
					if (event.results[i][0].transcript.trim().length > 2) {
						hasContent = true;
						break;
					}
				}
				if (hasContent && callStateRef.current === "speaking") {
					// Interrupt: stop audio, switch to listening
					stopAudioPlayback();
					setCallState("listening");
					callStateRef.current = "listening";
				}
			}

			let finalText = "";
			let interimText = "";

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i];
				if (result.isFinal) {
					finalText += result[0].transcript;
				} else {
					interimText += result[0].transcript;
				}
			}

			if (finalText) {
				accumulatedRef.current += finalText;
			}

			// Show live transcript (accumulated final + current interim)
			setTranscript(accumulatedRef.current + interimText);

			// Reset silence timer on any speech activity
			clearSilenceTimer();

			// If we got final text, start the silence countdown
			if (finalText && accumulatedRef.current.trim()) {
				silenceTimerRef.current = setTimeout(() => {
					const text = accumulatedRef.current.trim();
					if (text) {
						accumulatedRef.current = "";
						try {
							recognition.stop();
						} catch {}
						sendToAIRef.current(text);
					}
				}, SILENCE_TIMEOUT_MS);
			}
		};

		recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			if (event.error === "no-speech" || event.error === "aborted") {
				if (shouldListenRef.current && !isMutedRef.current) {
					try {
						recognition.start();
					} catch {}
				}
				return;
			}

			if (event.error === "not-allowed") {
				setCallState("error");
				setErrorMessage(
					"Microphone access denied. Please allow mic access and try again.",
				);
				return;
			}

			logClientError(new Error(`Speech recognition: ${event.error}`), {
				component: "useVoiceCall",
				action: "recognition_error",
				errorType: event.error,
			});
		};

		recognition.onend = () => {
			if (
				shouldListenRef.current &&
				!isMutedRef.current &&
				(callStateRef.current === "listening" ||
					callStateRef.current === "speaking")
			) {
				try {
					recognition.start();
				} catch {}
			}
		};

		recognitionRef.current = recognition;

		try {
			recognition.start();
		} catch (err) {
			logClientError(err, {
				component: "useVoiceCall",
				action: "start_recognition",
			});
		}
	}, [clearSilenceTimer, stopAudioPlayback]);

	// Keep ref in sync
	startRecognitionRef.current = startRecognitionInstance;

	// ---- Audio Playback ----

	const playNextInQueue = useCallback(() => {
		// Bail if call ended
		if (!shouldListenRef.current && callStateRef.current === "idle") {
			audioQueueRef.current = [];
			isPlayingRef.current = false;
			return;
		}

		if (audioQueueRef.current.length === 0) {
			isPlayingRef.current = false;
			if (shouldListenRef.current) {
				setCallState("listening");
				startRecognitionRef.current();
			}
			return;
		}

		isPlayingRef.current = true;
		const base64 = audioQueueRef.current.shift()!;
		const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
		audioRef.current = audio;

		audio.onended = () => playNextInQueue();

		audio.onerror = (error) => {
			logClientError(error, {
				component: "useVoiceCall",
				action: "audio_playback",
			});
			playNextInQueue();
		};

		audio.play().catch((err) => {
			logClientError(err, {
				component: "useVoiceCall",
				action: "audio_play",
			});
			playNextInQueue();
		});
	}, []);

	const enqueueAudio = useCallback(
		(base64: string) => {
			// Don't enqueue if call has ended
			if (!shouldListenRef.current && callStateRef.current === "idle") return;

			audioQueueRef.current.push(base64);
			if (!isPlayingRef.current) {
				setCallState("speaking");
				playNextInQueue();
			}
		},
		[playNextInQueue],
	);

	// ---- NDJSON Stream Handler ----

	const handleStreamingResponse = useCallback(
		async (response: Response) => {
			const reader = response.body?.getReader();
			if (!reader) throw new Error("Response body not readable");

			const decoder = new TextDecoder();
			let buffer = "";
			let fullText = "";

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					// Bail early if call ended while streaming
					if (!shouldListenRef.current && callStateRef.current === "idle") {
						reader.cancel();
						break;
					}

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed) continue;

						try {
							const chunk: NdjsonChunk = JSON.parse(trimmed);

							if (chunk.type === "audio" && chunk.data) {
								enqueueAudio(chunk.data);
							}
							if (chunk.text) {
								fullText = chunk.text;
							}
							if (chunk.type === "error") {
								throw new Error(chunk.message || "Stream error");
							}
						} catch (parseErr) {
							if (!(parseErr instanceof SyntaxError)) throw parseErr;
						}
					}
				}

				// Process remaining buffer
				if (buffer.trim()) {
					try {
						const chunk: NdjsonChunk = JSON.parse(buffer.trim());
						if (chunk.type === "audio" && chunk.data) {
							enqueueAudio(chunk.data);
						}
						if (chunk.text) fullText = chunk.text;
					} catch {}
				}
			} finally {
				reader.releaseLock();
			}

			// Add AI response to conversation history
			if (fullText) {
				const entry: ConversationEntry = {
					role: "assistant",
					content: fullText,
				};
				conversationRef.current = [...conversationRef.current, entry].slice(
					-MAX_HISTORY,
				);
				setConversation([...conversationRef.current]);
			}

			// If no audio queued, go back to listening
			if (
				audioQueueRef.current.length === 0 &&
				!isPlayingRef.current &&
				shouldListenRef.current
			) {
				setCallState("listening");
				startRecognitionRef.current();
			}
		},
		[enqueueAudio],
	);

	// ---- Legacy JSON Handler (collaborative mode) ----

	const handleLegacyResponse = useCallback(
		async (data: { audioUrl?: string; audioData?: string; text?: string }) => {
			// Add to conversation
			if (data.text) {
				const entry: ConversationEntry = {
					role: "assistant",
					content: data.text,
				};
				conversationRef.current = [...conversationRef.current, entry].slice(
					-MAX_HISTORY,
				);
				setConversation([...conversationRef.current]);
			}

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
						startRecognitionRef.current();
					}
				};

				audio.onerror = () => {
					if (shouldListenRef.current) {
						setCallState("listening");
						startRecognitionRef.current();
					}
				};

				await audio.play();
				return;
			}

			if (shouldListenRef.current) {
				setCallState("listening");
				startRecognitionRef.current();
			}
		},
		[],
	);

	// ---- Send to AI ----

	const sendToAI = useCallback(
		async (text: string, skipHistory = false) => {
			if (!text.trim()) return;

			try {
				// Stop any current audio (interruption)
				stopAudioPlayback();

				setCallState("thinking");
				setTranscript(skipHistory ? "" : text);

				// Add user message to conversation (skip for system-triggered greetings)
				if (!skipHistory) {
					const userEntry: ConversationEntry = { role: "user", content: text };
					conversationRef.current = [
						...conversationRef.current,
						userEntry,
					].slice(-MAX_HISTORY);
					setConversation([...conversationRef.current]);
				}

				// Build history for API (exclude the message we're about to send)
				const history = skipHistory ? [] : conversationRef.current.slice(0, -1);

				// Abort any previous in-flight request
				if (abortControllerRef.current) {
					abortControllerRef.current.abort();
				}
				const abortController = new AbortController();
				abortControllerRef.current = abortController;

				const response = await csrfFetchRef.current("/api/realtime/stream", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						message: text,
						botType: executive,
						history,
					}),
					signal: abortController.signal,
				});

				if (!response.ok) {
					throw new Error(`AI request failed: ${response.status}`);
				}

				const contentType = response.headers.get("content-type") || "";

				if (contentType.includes("ndjson")) {
					await handleStreamingResponse(response);
				} else {
					const data = await response.json();
					await handleLegacyResponse(data);
				}
			} catch (error) {
				// Ignore abort errors — they're expected on hangup
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}

				logClientError(error, {
					component: "useVoiceCall",
					action: "ai_response",
					executive,
				});

				if (shouldListenRef.current) {
					setCallState("listening");
					startRecognitionRef.current();
				}
			}
		},
		[
			executive,
			stopAudioPlayback,
			handleStreamingResponse,
			handleLegacyResponse,
		],
	);

	// Keep ref in sync
	sendToAIRef.current = sendToAI;

	// ---- Start Call ----

	const startCall = useCallback(async () => {
		if (startedRef.current) return;
		startedRef.current = true;

		try {
			setCallState("connecting");

			// Request mic
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaStreamRef.current = stream;

			// Create AudioContext + AnalyserNode for visualizer
			try {
				const ctx = new AudioContext();
				audioContextRef.current = ctx;
				const source = ctx.createMediaStreamSource(stream);
				const analyser = ctx.createAnalyser();
				analyser.fftSize = 128;
				analyser.smoothingTimeConstant = 0.8;
				source.connect(analyser);
				analyserRef.current = analyser;
			} catch {
				// Non-fatal — visualizer just won't be audio-reactive
			}

			shouldListenRef.current = true;
			callStartRef.current = Date.now();

			// Start call timer
			durationIntervalRef.current = setInterval(() => {
				setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000));
			}, 1000);

			// Auto-trigger greeting: AI speaks first (skip history to avoid polluting conversation)
			setCallState("thinking");
			sendToAIRef.current(
				"Greet the caller. You're speaking to them for the first time on this call. Keep it warm, brief (1-2 sentences), and then ask how you can help them today.",
				true,
			);
		} catch (error) {
			logClientError(error, {
				component: "useVoiceCall",
				action: "start_call",
			});
			setCallState("error");
			setErrorMessage(
				"Could not access microphone. Please allow mic access and try again.",
			);
		}
	}, []);

	// ---- Stop Call ----

	const stopCall = useCallback(() => {
		shouldListenRef.current = false;
		startedRef.current = false;
		clearSilenceTimer();
		accumulatedRef.current = "";

		// Abort any in-flight fetch request (stops streaming audio from server)
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}

		if (recognitionRef.current) {
			try {
				recognitionRef.current.stop();
			} catch {}
			recognitionRef.current = null;
		}

		stopAudioPlayback();

		// Stop timer
		if (durationIntervalRef.current) {
			clearInterval(durationIntervalRef.current);
			durationIntervalRef.current = null;
		}

		// Close audio context
		if (audioContextRef.current) {
			try {
				audioContextRef.current.close();
			} catch {}
			audioContextRef.current = null;
			analyserRef.current = null;
		}

		// Stop mic stream
		if (mediaStreamRef.current) {
			for (const track of mediaStreamRef.current.getTracks()) {
				track.stop();
			}
			mediaStreamRef.current = null;
		}

		setCallState("idle");
		setTranscript("");
		setErrorMessage("");
		setIsMuted(false);
		setCallDuration(0);
		setConversation([]);
		conversationRef.current = [];
	}, [clearSilenceTimer, stopAudioPlayback]);

	// ---- Mute Toggle ----

	const toggleMute = useCallback(() => {
		const newMuted = !isMutedRef.current;
		setIsMuted(newMuted);
		isMutedRef.current = newMuted;

		// Mute/unmute mic tracks
		if (mediaStreamRef.current) {
			for (const track of mediaStreamRef.current.getAudioTracks()) {
				track.enabled = !newMuted;
			}
		}

		if (newMuted) {
			// Stop recognition while muted
			clearSilenceTimer();
			accumulatedRef.current = "";
			if (recognitionRef.current) {
				try {
					recognitionRef.current.stop();
				} catch {}
			}
		} else if (
			shouldListenRef.current &&
			callStateRef.current === "listening"
		) {
			// Restart recognition when unmuting
			startRecognitionRef.current();
		}
	}, [clearSilenceTimer]);

	// ---- Cleanup on unmount ----

	useEffect(() => {
		return () => {
			shouldListenRef.current = false;

			// Abort any in-flight request
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}

			if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
			if (durationIntervalRef.current)
				clearInterval(durationIntervalRef.current);

			if (recognitionRef.current) {
				try {
					recognitionRef.current.stop();
				} catch {}
			}
			if (audioRef.current) {
				audioRef.current.pause();
			}
			if (audioContextRef.current) {
				try {
					audioContextRef.current.close();
				} catch {}
			}
			if (mediaStreamRef.current) {
				for (const track of mediaStreamRef.current.getTracks()) {
					track.stop();
				}
			}

			audioQueueRef.current = [];
			isPlayingRef.current = false;
		};
	}, []);

	return {
		callState,
		transcript,
		errorMessage,
		isMuted,
		callDuration,
		conversation,
		analyserNode: analyserRef.current,
		startCall,
		stopCall,
		toggleMute,
		isListening: callState === "listening",
		isThinking: callState === "thinking",
		isSpeaking: callState === "speaking",
		isConnecting: callState === "connecting",
		hasError: callState === "error",
	};
}
