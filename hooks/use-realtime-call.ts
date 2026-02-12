"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getCsrfToken } from "@/lib/utils";

export type CallStatus = "idle" | "connecting" | "active" | "ended";

interface UseRealtimeCallOptions {
	chatId: string;
	botType: "alexandria" | "kim" | "collaborative";
	onMessage?: (message: string, isUser: boolean) => void;
}

interface UseRealtimeCallReturn {
	status: CallStatus;
	isListening: boolean;
	isSpeaking: boolean;
	startCall: () => Promise<void>;
	endCall: () => void;
	toggleMute: () => void;
	isMuted: boolean;
	transcript: string;
	aiResponse: string;
}

export function useRealtimeCall({
	chatId,
	botType,
	onMessage,
}: UseRealtimeCallOptions): UseRealtimeCallReturn {
	const [status, setStatus] = useState<CallStatus>("idle");
	const [isListening, setIsListening] = useState(false);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [isMuted, setIsMuted] = useState(false);
	const [transcript, setTranscript] = useState("");
	const [aiResponse, setAiResponse] = useState("");

	// Refs to avoid stale closures in recognition/audio event handlers
	const statusRef = useRef(status);
	const isMutedRef = useRef(isMuted);
	const isSpeakingRef = useRef(isSpeaking);
	useEffect(() => {
		statusRef.current = status;
	}, [status]);
	useEffect(() => {
		isMutedRef.current = isMuted;
	}, [isMuted]);
	useEffect(() => {
		isSpeakingRef.current = isSpeaking;
	}, [isSpeaking]);

	const recognitionRef = useRef<SpeechRecognition | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const currentAudioRef = useRef<HTMLAudioElement | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);
	const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Initialize speech recognition
	const initSpeechRecognition = useCallback(() => {
		if (typeof window === "undefined") return null;

		const SpeechRecognition =
			window.SpeechRecognition || (window as any).webkitSpeechRecognition;

		if (!SpeechRecognition) {
			toast.error("Speech recognition not supported in this browser");
			return null;
		}

		const recognition = new SpeechRecognition();
		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.lang = "en-US";

		return recognition;
	}, []);

	// Send text to AI and get response
	const sendToAI = useCallback(
		async (text: string) => {
			if (!text.trim()) return;

			try {
				setIsSpeaking(true);
				onMessage?.(text, true);

				abortControllerRef.current = new AbortController();

				const csrfHeaders: Record<string, string> = {};
				const csrf = getCsrfToken();
				if (csrf) csrfHeaders["x-csrf-token"] = csrf;

				const response = await fetch("/api/realtime", {
					method: "POST",
					headers: { "Content-Type": "application/json", ...csrfHeaders },
					credentials: "include",
					body: JSON.stringify({
						message: text,
						chatId,
						botType,
					}),
					signal: abortControllerRef.current.signal,
				});

				if (!response.ok) {
					throw new Error("Failed to get AI response");
				}

				const data = await response.json();
				const aiText = data.text;
				const audioUrl = data.audioUrl;

				setAiResponse(aiText);
				onMessage?.(aiText, false);

				// Play audio response
				if (audioUrl) {
					const audio = new Audio(audioUrl);
					currentAudioRef.current = audio;

					audio.onended = () => {
						setIsSpeaking(false);
						// Resume listening after AI finishes speaking
						if (
							statusRef.current === "active" &&
							recognitionRef.current &&
							!isMutedRef.current
						) {
							try {
								recognitionRef.current.start();
								setIsListening(true);
							} catch (_e) {
								// Already started
							}
						}
					};

					audio.onerror = () => {
						setIsSpeaking(false);
					};

					await audio.play();
				} else {
					setIsSpeaking(false);
				}
			} catch (error: any) {
				if (error.name !== "AbortError") {
					console.error("AI response error:", error);
					toast.error("Failed to get AI response");
				}
				setIsSpeaking(false);
			}
		},
		[chatId, botType, onMessage],
	);

	// Start the call
	const startCall = useCallback(async () => {
		setStatus("connecting");

		try {
			// Request microphone permission
			await navigator.mediaDevices.getUserMedia({ audio: true });

			// Initialize audio context
			audioContextRef.current = new AudioContext();

			// Initialize speech recognition
			const recognition = initSpeechRecognition();
			if (!recognition) {
				setStatus("idle");
				return;
			}

			recognitionRef.current = recognition;

			let finalTranscript = "";

			recognition.onresult = (event) => {
				let interim = "";
				for (let i = event.resultIndex; i < event.results.length; i++) {
					const result = event.results[i];
					if (result.isFinal) {
						finalTranscript += `${result[0].transcript} `;

						// Clear silence timeout
						if (silenceTimeoutRef.current) {
							clearTimeout(silenceTimeoutRef.current);
						}

						// Set timeout to send after brief silence
						silenceTimeoutRef.current = setTimeout(() => {
							if (finalTranscript.trim()) {
								const textToSend = finalTranscript.trim();
								finalTranscript = "";
								setTranscript("");

								// Stop listening while processing
								recognition.stop();
								setIsListening(false);

								sendToAI(textToSend);
							}
						}, 1500); // 1.5 second silence threshold
					} else {
						interim += result[0].transcript;
					}
				}
				setTranscript(finalTranscript + interim);
			};

			recognition.onerror = (event) => {
				console.error("Speech recognition error:", event.error);
				if (event.error === "not-allowed") {
					toast.error("Microphone access denied");
					setStatus("idle");
				} else if (event.error !== "aborted") {
					// Try to restart recognition
					setTimeout(() => {
						if (statusRef.current === "active" && !isMutedRef.current) {
							try {
								recognition.start();
							} catch (_e) {
								// Ignore
							}
						}
					}, 1000);
				}
			};

			recognition.onend = () => {
				// Restart recognition if call is still active and not muted
				if (
					statusRef.current === "active" &&
					!isMutedRef.current &&
					!isSpeakingRef.current
				) {
					try {
						recognition.start();
					} catch (_e) {
						// Already started
					}
				}
			};

			// Start recognition
			recognition.start();
			setIsListening(true);
			setStatus("active");

			toast.success("Call started! Speak now...");
		} catch (error) {
			console.error("Failed to start call:", error);
			toast.error("Failed to start call. Check microphone permissions.");
			setStatus("idle");
		}
	}, [initSpeechRecognition, sendToAI]);

	// End the call
	const endCall = useCallback(() => {
		// Stop speech recognition
		if (recognitionRef.current) {
			recognitionRef.current.stop();
			recognitionRef.current = null;
		}

		// Stop any playing audio
		if (currentAudioRef.current) {
			currentAudioRef.current.pause();
			currentAudioRef.current = null;
		}

		// Abort any pending requests
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}

		// Clear timeouts
		if (silenceTimeoutRef.current) {
			clearTimeout(silenceTimeoutRef.current);
			silenceTimeoutRef.current = null;
		}

		// Close audio context
		if (audioContextRef.current) {
			audioContextRef.current.close();
			audioContextRef.current = null;
		}

		setStatus("ended");
		setIsListening(false);
		setIsSpeaking(false);
		setTranscript("");
		setAiResponse("");

		// Reset to idle after showing ended state briefly
		setTimeout(() => setStatus("idle"), 2000);

		toast.success("Call ended");
	}, []);

	// Toggle mute
	const toggleMute = useCallback(() => {
		setIsMuted((prev) => {
			const newMuted = !prev;

			if (newMuted) {
				// Stop listening
				if (recognitionRef.current) {
					recognitionRef.current.stop();
				}
				setIsListening(false);
			} else {
				// Resume listening if call is active and AI is not speaking
				if (
					statusRef.current === "active" &&
					recognitionRef.current &&
					!isSpeakingRef.current
				) {
					try {
						recognitionRef.current.start();
						setIsListening(true);
					} catch (_e) {
						// Already started
					}
				}
			}

			return newMuted;
		});
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (recognitionRef.current) {
				recognitionRef.current.stop();
			}
			if (currentAudioRef.current) {
				currentAudioRef.current.pause();
			}
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
			if (silenceTimeoutRef.current) {
				clearTimeout(silenceTimeoutRef.current);
			}
			if (audioContextRef.current) {
				audioContextRef.current.close();
			}
		};
	}, []);

	return {
		status,
		isListening,
		isSpeaking,
		startCall,
		endCall,
		toggleMute,
		isMuted,
		transcript,
		aiResponse,
	};
}
