"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	isAudioPlaying,
	subscribeToAudioChanges,
} from "@/lib/audio-manager";

type SpeechRecognitionConstructor = typeof window.SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
	if (typeof window === "undefined") return null;
	return (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).SpeechRecognition ||
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).webkitSpeechRecognition ||
		null
	);
}

interface UseInlineVoiceProps {
	status: "ready" | "submitted" | "streaming" | "error";
	sendMessage: (message: {
		role: "user";
		parts: { type: "text"; text: string }[];
	}) => void;
}

interface UseInlineVoiceReturn {
	isVoiceMode: boolean;
	isListening: boolean;
	isProcessing: boolean;
	isSupported: boolean;
	transcript: string;
	startVoiceMode: () => void;
	stopVoiceMode: () => void;
	toggleVoiceMode: () => void;
}

/**
 * Inline voice mode hook — ChatGPT-style continuous voice conversation.
 *
 * Cycle: listen → transcribe → auto-send → wait for AI + TTS → re-listen
 */
export function useInlineVoice({
	status,
	sendMessage,
}: UseInlineVoiceProps): UseInlineVoiceReturn {
	const [isVoiceMode, setIsVoiceMode] = useState(false);
	const [isListening, setIsListening] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isSupported, setIsSupported] = useState(true);
	const [transcript, setTranscript] = useState("");

	// Refs to avoid stale closures
	const voiceModeActiveRef = useRef(false);
	const waitingForResponseRef = useRef(false);
	const recognitionRef = useRef<globalThis.SpeechRecognition | null>(null);
	const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Check browser support
	useEffect(() => {
		if (!getSpeechRecognition()) {
			setIsSupported(false);
		}
	}, []);

	// Start speech recognition
	const startListening = useCallback(() => {
		if (!voiceModeActiveRef.current) return;

		const SpeechRecognitionAPI = getSpeechRecognition();
		if (!SpeechRecognitionAPI) return;

		// Clean up any existing recognition
		if (recognitionRef.current) {
			try {
				recognitionRef.current.abort();
			} catch {
				// Ignore
			}
		}

		const recognition = new SpeechRecognitionAPI();
		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.lang = "en-US";
		recognition.maxAlternatives = 1;

		let finalTranscript = "";
		let silenceTimeout: NodeJS.Timeout | null = null;

		recognition.onstart = () => {
			if (voiceModeActiveRef.current) {
				setIsListening(true);
				setIsProcessing(false);
				setTranscript("");
			}
		};

		recognition.onresult = (event) => {
			if (!voiceModeActiveRef.current) return;

			let interim = "";

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i];
				if (result.isFinal) {
					finalTranscript += result[0].transcript;

					// Clear any previous silence timeout
					if (silenceTimeout) {
						clearTimeout(silenceTimeout);
					}

					// Wait 1.2s of silence after final result before sending
					silenceTimeout = setTimeout(() => {
						if (finalTranscript.trim() && voiceModeActiveRef.current) {
							const textToSend = finalTranscript.trim();
							finalTranscript = "";

							try {
								recognition.stop();
							} catch {
								// Ignore
							}

							setIsListening(false);
							setIsProcessing(true);
							setTranscript(textToSend);
							waitingForResponseRef.current = true;

							sendMessage({
								role: "user" as const,
								parts: [{ type: "text", text: textToSend }],
							});

							// Clear processing state after a short delay
							setTimeout(() => {
								setIsProcessing(false);
								setTranscript("");
							}, 500);
						}
					}, 1200);
				} else {
					interim += result[0].transcript;
				}
			}

			setTranscript(finalTranscript + interim);
		};

		recognition.onerror = (event) => {
			if (!voiceModeActiveRef.current) return;

			if (event.error === "not-allowed") {
				setIsVoiceMode(false);
				voiceModeActiveRef.current = false;
				setIsListening(false);
				return;
			}

			// For no-speech or aborted, restart if still in voice mode
			if (event.error === "no-speech" || event.error === "aborted") {
				if (voiceModeActiveRef.current && !waitingForResponseRef.current) {
					restartTimeoutRef.current = setTimeout(() => {
						if (voiceModeActiveRef.current && !waitingForResponseRef.current) {
							startListening();
						}
					}, 100);
				}
				return;
			}

			console.error("Speech recognition error:", event.error);
		};

		recognition.onend = () => {
			setIsListening(false);
			// Clean up silence timeout
			if (silenceTimeout) {
				clearTimeout(silenceTimeout);
			}

			// Auto-restart if still in voice mode and not waiting for response
			if (voiceModeActiveRef.current && !waitingForResponseRef.current) {
				restartTimeoutRef.current = setTimeout(() => {
					if (voiceModeActiveRef.current && !waitingForResponseRef.current) {
						startListening();
					}
				}, 100);
			}
		};

		recognitionRef.current = recognition;

		try {
			recognition.start();
		} catch (err) {
			console.error("Failed to start recognition:", err);
			// Retry after a delay
			if (voiceModeActiveRef.current) {
				restartTimeoutRef.current = setTimeout(() => {
					if (voiceModeActiveRef.current) {
						startListening();
					}
				}, 500);
			}
		}
	}, [sendMessage]);

	// Watch for AI response completion + TTS end to restart listening
	useEffect(() => {
		if (!voiceModeActiveRef.current || !waitingForResponseRef.current) return;

		// When status returns to ready, the AI has finished responding
		if (status === "ready") {
			// Now wait for auto-speak TTS to finish
			// Check if audio is currently playing
			if (isAudioPlaying()) {
				// Subscribe to audio changes, restart listening when audio ends
				const unsubscribe = subscribeToAudioChanges((playing) => {
					if (!playing && voiceModeActiveRef.current) {
						waitingForResponseRef.current = false;
						unsubscribe();
						// Small delay after TTS ends before starting to listen again
						restartTimeoutRef.current = setTimeout(() => {
							if (voiceModeActiveRef.current) {
								startListening();
							}
						}, 300);
					}
				});
				return unsubscribe;
			}

			// No audio playing — auto-speak might be disabled or failed
			// Wait a brief moment then restart listening
			const timeout = setTimeout(() => {
				if (voiceModeActiveRef.current) {
					waitingForResponseRef.current = false;
					startListening();
				}
			}, 500);
			return () => clearTimeout(timeout);
		}
	}, [status, startListening]);

	const startVoiceMode = useCallback(() => {
		voiceModeActiveRef.current = true;
		waitingForResponseRef.current = false;
		setIsVoiceMode(true);
		setTranscript("");

		// Request mic permission then start listening
		navigator.mediaDevices
			.getUserMedia({ audio: true })
			.then((stream) => {
				// Stop tracks immediately — just needed for permission
				for (const track of stream.getTracks()) {
					track.stop();
				}
				if (voiceModeActiveRef.current) {
					startListening();
				}
			})
			.catch((err) => {
				console.error("Microphone permission error:", err);
				setIsVoiceMode(false);
				voiceModeActiveRef.current = false;
			});
	}, [startListening]);

	const stopVoiceMode = useCallback(() => {
		voiceModeActiveRef.current = false;
		waitingForResponseRef.current = false;
		setIsVoiceMode(false);
		setIsListening(false);
		setIsProcessing(false);
		setTranscript("");

		if (restartTimeoutRef.current) {
			clearTimeout(restartTimeoutRef.current);
			restartTimeoutRef.current = null;
		}

		if (recognitionRef.current) {
			try {
				recognitionRef.current.stop();
			} catch {
				// Ignore
			}
			recognitionRef.current = null;
		}
	}, []);

	const toggleVoiceMode = useCallback(() => {
		if (voiceModeActiveRef.current) {
			stopVoiceMode();
		} else {
			startVoiceMode();
		}
	}, [startVoiceMode, stopVoiceMode]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			voiceModeActiveRef.current = false;
			if (restartTimeoutRef.current) {
				clearTimeout(restartTimeoutRef.current);
			}
			if (recognitionRef.current) {
				try {
					recognitionRef.current.abort();
				} catch {
					// Ignore
				}
			}
		};
	}, []);

	return {
		isVoiceMode,
		isListening,
		isProcessing,
		isSupported,
		transcript,
		startVoiceMode,
		stopVoiceMode,
		toggleVoiceMode,
	};
}
