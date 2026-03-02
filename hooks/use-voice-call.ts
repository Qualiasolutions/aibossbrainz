"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCsrf } from "@/hooks/use-csrf";
import type { BotType } from "@/lib/bot-personalities";
import { logClientError } from "@/lib/client-logger";

export type CallState = "idle" | "listening" | "thinking" | "speaking";

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
 * State machine: idle → listening → thinking → speaking → (loop back to listening)
 *
 * SpeechRecognition → AI response → TTS playback
 */
export function useVoiceCall({ executive }: VoiceCallHookOptions) {
	const [callState, setCallState] = useState<CallState>("idle");
	const [transcript, setTranscript] = useState<string>("");
	const [isListening, setIsListening] = useState(false);
	const [isThinking, setIsThinking] = useState(false);
	const [isSpeaking, setIsSpeaking] = useState(false);

	const { csrfFetch } = useCsrf();

	// Refs for persistent objects across renders
	const recognitionRef = useRef<SpeechRecognition | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const shouldListenRef = useRef(false); // Controls whether to restart recognition
	const startRecognitionRef = useRef<() => void>(() => {});

	// Update state flags when callState changes
	useEffect(() => {
		setIsListening(callState === "listening");
		setIsThinking(callState === "thinking");
		setIsSpeaking(callState === "speaking");
	}, [callState]);

	/**
	 * Send transcript to AI and play response
	 */
	const handleAIResponse = useCallback(
		async (text: string) => {
			if (!text.trim()) return;

			try {
				setCallState("thinking");
				setTranscript(text);

				const response = await csrfFetch("/api/realtime/stream", {
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
							// Return to listening after audio finishes
							if (shouldListenRef.current) {
								setCallState("listening");
								startRecognitionRef.current();
							}
						};

						audio.onerror = (error) => {
							logClientError(error, {
								component: "useVoiceCall",
								action: "audio_playback",
								executive,
							});
							// Return to listening even on error
							if (shouldListenRef.current) {
								setCallState("listening");
								startRecognitionRef.current();
							}
						};

						await audio.play();
					}
				} else {
					// No audio, return to listening
					if (shouldListenRef.current) {
						setCallState("listening");
						startRecognitionRef.current();
					}
				}
			} catch (error) {
				logClientError(error, {
					component: "useVoiceCall",
					action: "ai_response",
					executive,
				});

				// Return to listening on error
				if (shouldListenRef.current) {
					setCallState("listening");
					startRecognitionRef.current();
				}
			}
		},
		[csrfFetch, executive],
	);

	/**
	 * Initialize and start speech recognition
	 */
	const startRecognition = useCallback(() => {
		if (
			!("webkitSpeechRecognition" in window) &&
			!("SpeechRecognition" in window)
		) {
			logClientError(new Error("Speech recognition not supported"), {
				component: "useVoiceCall",
				action: "check_browser_support",
			});
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

			// Update UI with interim results
			setTranscript(finalTranscript + interimTranscript);

			// Send final transcript to AI
			if (finalTranscript.trim()) {
				recognition.stop();
				handleAIResponse(finalTranscript.trim());
				finalTranscript = "";
			}
		};

		recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			// Transient errors - retry
			if (event.error === "no-speech" || event.error === "aborted") {
				if (shouldListenRef.current) {
					recognition.start();
				}
				return;
			}

			logClientError(new Error(`Speech recognition error: ${event.error}`), {
				component: "useVoiceCall",
				action: "recognition_error",
				errorType: event.error,
			});
		};

		recognition.onend = () => {
			// Auto-restart if still in listening state
			if (shouldListenRef.current && callState === "listening") {
				try {
					recognition.start();
				} catch (_error) {
					// Ignore - likely already started
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
	}, [callState, handleAIResponse]);

	// Keep ref in sync so handleAIResponse can call latest startRecognition
	startRecognitionRef.current = startRecognition;

	/**
	 * Start the voice call - request mic permission and begin listening
	 */
	const startCall = useCallback(async () => {
		try {
			// Request microphone permission
			await navigator.mediaDevices.getUserMedia({ audio: true });

			shouldListenRef.current = true;
			setCallState("listening");
			startRecognition();
		} catch (error) {
			logClientError(error, {
				component: "useVoiceCall",
				action: "start_call",
				errorType: "microphone_permission",
			});
		}
	}, [startRecognition]);

	/**
	 * Stop the voice call - stop recognition, pause audio, reset state
	 */
	const stopCall = useCallback(() => {
		shouldListenRef.current = false;

		// Stop recognition
		if (recognitionRef.current) {
			try {
				recognitionRef.current.stop();
			} catch (_error) {
				// Ignore - likely already stopped
			}
			recognitionRef.current = null;
		}

		// Stop audio
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current = null;
		}

		setCallState("idle");
		setTranscript("");
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopCall();
		};
	}, [stopCall]);

	return {
		callState,
		transcript,
		startCall,
		stopCall,
		isListening,
		isThinking,
		isSpeaking,
	};
}
