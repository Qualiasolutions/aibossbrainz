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
	 * Send transcript to AI and play response
	 */
	const handleAIResponse = useCallback(
		async (text: string) => {
			if (!text.trim()) return;

			try {
				setCallState("thinking");
				setTranscript(text);

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

				const data: StreamResponse = await response.json();

				// Play audio response
				if (data.audioUrl || data.audioData) {
					const audioSrc = data.audioUrl || data.audioData;
					if (audioSrc) {
						setCallState("speaking");

						const audio = new Audio(audioSrc);
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

				// No audio, show text response briefly then return to listening
				if (data.text) {
					setTranscript(data.text);
				}

				if (shouldListenRef.current) {
					setCallState("listening");
					startRecognitionInstance();
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
		[executive, startRecognitionInstance],
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
