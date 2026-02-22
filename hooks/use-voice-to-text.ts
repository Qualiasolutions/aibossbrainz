"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

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

interface UseVoiceToTextProps {
	setInput: Dispatch<SetStateAction<string>>;
}

interface UseVoiceToTextReturn {
	isRecording: boolean;
	isSupported: boolean;
	toggleRecording: () => void;
	startRecording: () => void;
	stopRecording: () => void;
}

/**
 * One-shot speech-to-text hook for dictation.
 *
 * Tap mic -> speak -> text appears in textarea -> user sends manually.
 * No auto-send, no TTS, no continuous cycling.
 */
export function useVoiceToText({
	setInput,
}: UseVoiceToTextProps): UseVoiceToTextReturn {
	const [isRecording, setIsRecording] = useState(false);
	const [isSupported, setIsSupported] = useState(true);
	const recognitionRef = useRef<globalThis.SpeechRecognition | null>(null);

	// Check browser support
	useEffect(() => {
		if (!getSpeechRecognition()) {
			setIsSupported(false);
		}
	}, []);

	const stopRecording = useCallback(() => {
		setIsRecording(false);
		if (recognitionRef.current) {
			try {
				recognitionRef.current.stop();
			} catch {
				// Ignore
			}
			recognitionRef.current = null;
		}
	}, []);

	const startRecording = useCallback(() => {
		const SpeechRecognitionAPI = getSpeechRecognition();
		if (!SpeechRecognitionAPI) return;

		// Clean up any existing session
		if (recognitionRef.current) {
			try {
				recognitionRef.current.abort();
			} catch {
				// Ignore
			}
		}

		const recognition = new SpeechRecognitionAPI();
		recognition.continuous = false; // One-shot: stops after silence
		recognition.interimResults = true;
		recognition.lang = "en-US";
		recognition.maxAlternatives = 1;

		let committed = "";

		recognition.onstart = () => {
			setIsRecording(true);
		};

		recognition.onresult = (event) => {
			let interim = "";
			let final = "";

			for (let i = 0; i < event.results.length; i++) {
				const result = event.results[i];
				if (result.isFinal) {
					final += result[0].transcript;
				} else {
					interim += result[0].transcript;
				}
			}

			if (final) {
				committed += final;
				// Append final text to existing input
				const textToAppend = committed;
				setInput((prev) => {
					const separator = prev.trim() ? " " : "";
					return prev.trim() + separator + textToAppend;
				});
				committed = "";
			}

			// Show interim text as preview (will be replaced by final)
			if (interim) {
				setInput((prev) => {
					// Strip any previous interim preview and append new one
					const base = prev.replace(/\u200B.*$/, "");
					// Use zero-width space as marker for interim text
					return `${base}\u200B${interim}`;
				});
			}
		};

		recognition.onerror = (event) => {
			if (event.error === "not-allowed") {
				setIsRecording(false);
				recognitionRef.current = null;
				return;
			}
			// For no-speech or aborted, just stop cleanly
			if (event.error === "no-speech" || event.error === "aborted") {
				setIsRecording(false);
				recognitionRef.current = null;
				return;
			}
			console.error("Speech recognition error:", event.error);
		};

		recognition.onend = () => {
			setIsRecording(false);
			recognitionRef.current = null;

			// Clean up any remaining interim markers
			setInput((prev) => prev.replace(/\u200B.*$/, ""));
		};

		recognitionRef.current = recognition;

		try {
			recognition.start();
		} catch (err) {
			console.error("Failed to start dictation:", err);
			setIsRecording(false);
		}
	}, [setInput]);

	const toggleRecording = useCallback(() => {
		if (isRecording) {
			stopRecording();
		} else {
			startRecording();
		}
	}, [isRecording, startRecording, stopRecording]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
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
		isRecording,
		isSupported,
		toggleRecording,
		startRecording,
		stopRecording,
	};
}
