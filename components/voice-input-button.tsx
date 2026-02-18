"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Use native SpeechRecognition types with webkit prefix support
type SpeechRecognitionType = typeof window.SpeechRecognition;

// Get SpeechRecognition constructor (handles webkit prefix)
function getSpeechRecognition(): SpeechRecognitionType | null {
	if (typeof window === "undefined") return null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (
		(window as any).SpeechRecognition ||
		(window as any).webkitSpeechRecognition ||
		null
	);
}

interface VoiceInputButtonProps {
	onTranscript: (transcript: string) => void;
	disabled?: boolean;
	className?: string;
	size?: "sm" | "md" | "lg";
}

export function VoiceInputButton({
	onTranscript,
	disabled = false,
	className,
	size = "md",
}: VoiceInputButtonProps) {
	const [isListening, setIsListening] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isSupported, setIsSupported] = useState(true);
	const [errorState, setErrorState] = useState<string | null>(null);
	const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const recognitionRef = useRef<globalThis.SpeechRecognition | null>(null);
	// Store both final and interim transcripts
	const finalTranscriptRef = useRef<string>("");
	const interimTranscriptRef = useRef<string>("");

	const iconSizes = {
		sm: "h-3 w-3",
		md: "h-4 w-4",
		lg: "h-5 w-5",
	};

	// Check for browser support on mount
	useEffect(() => {
		const SpeechRecognitionAPI = getSpeechRecognition();
		if (!SpeechRecognitionAPI) {
			setIsSupported(false);
		}
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (recognitionRef.current) {
				recognitionRef.current.abort();
			}
			if (errorTimeoutRef.current) {
				clearTimeout(errorTimeoutRef.current);
			}
		};
	}, []);

	const startListening = useCallback(() => {
		const SpeechRecognitionAPI = getSpeechRecognition();
		if (!SpeechRecognitionAPI) {
			toast.error("Speech recognition is not supported in your browser");
			return;
		}

		try {
			const recognition = new SpeechRecognitionAPI();
			recognitionRef.current = recognition;
			finalTranscriptRef.current = "";
			interimTranscriptRef.current = "";

			// Use non-continuous mode for more reliable results on mobile
			// The recognition will auto-stop after silence, which is fine for dictation
			recognition.continuous = false;
			recognition.interimResults = true;
			recognition.lang = "en-US";
			recognition.maxAlternatives = 1;

			recognition.onstart = () => {
				setIsListening(true);
				setIsProcessing(false);
			};

			recognition.onresult = (event) => {
				let interim = "";
				let final = "";

				// Process all results from the beginning (not just from resultIndex)
				// This ensures we capture the complete transcript
				for (let i = 0; i < event.results.length; i++) {
					const result = event.results[i];
					const transcript = result[0].transcript;

					if (result.isFinal) {
						final += transcript;
					} else {
						interim += transcript;
					}
				}

				// Update refs with current state
				if (final) {
					finalTranscriptRef.current = final;
				}
				interimTranscriptRef.current = interim;
			};

			recognition.onerror = (event) => {
				setIsListening(false);
				setIsProcessing(false);

				// Clear any existing error timeout
				if (errorTimeoutRef.current) {
					clearTimeout(errorTimeoutRef.current);
				}

				if (event.error === "not-allowed") {
					setErrorState("Microphone denied");
					toast.error(
						"Microphone access denied. Please enable microphone permissions.",
					);
				} else if (event.error === "no-speech") {
					// Don't show error for no-speech, just silently end
					return;
				} else if (event.error === "aborted") {
					// User aborted or component unmounted, no error needed
					return;
				} else if (event.error === "network") {
					setErrorState("Network error");
					toast.error(
						"Network error. Speech recognition requires an internet connection.",
					);
				} else {
					setErrorState("Error");
					console.error("Speech recognition error:", event.error);
					toast.error(`Speech recognition error: ${event.error}`);
				}

				// Auto-clear error state after 3 seconds
				errorTimeoutRef.current = setTimeout(() => {
					setErrorState(null);
					errorTimeoutRef.current = null;
				}, 3000);
			};

			recognition.onend = () => {
				setIsListening(false);

				// Use final transcript if available, otherwise use interim
				// This captures speech even if it wasn't finalized before stop
				const transcript =
					finalTranscriptRef.current || interimTranscriptRef.current;

				if (transcript.trim()) {
					setIsProcessing(true);
					// Small delay for UX
					setTimeout(() => {
						onTranscript(transcript.trim());
						setIsProcessing(false);
						finalTranscriptRef.current = "";
						interimTranscriptRef.current = "";
					}, 150);
				} else {
					finalTranscriptRef.current = "";
					interimTranscriptRef.current = "";
				}
			};

			recognition.start();
		} catch (error) {
			console.error("Error starting speech recognition:", error);
			toast.error("Failed to start speech recognition");
			setIsListening(false);
		}
	}, [onTranscript]);

	const stopListening = useCallback(() => {
		if (recognitionRef.current) {
			recognitionRef.current.stop();
		}
	}, []);

	const handleClick = useCallback(() => {
		// Clear error state on click
		if (errorState) {
			setErrorState(null);
			if (errorTimeoutRef.current) {
				clearTimeout(errorTimeoutRef.current);
				errorTimeoutRef.current = null;
			}
		}

		if (isListening) {
			stopListening();
		} else {
			startListening();
		}
	}, [isListening, startListening, stopListening, errorState]);

	// Don't render if speech recognition is not supported
	if (!isSupported) {
		return null;
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					className={cn(
						"relative overflow-hidden border border-transparent transition-all duration-300",
						isListening &&
							"border-rose-400/60 bg-rose-500/10 text-rose-600 shadow-[0_0_0_2px_rgba(244,114,182,0.12)]",
						errorState &&
							!isListening &&
							"border-red-400/80 bg-red-50 text-red-600",
						!isListening &&
							!errorState &&
							"hover:border-rose-300/60 hover:bg-rose-50/60 hover:text-rose-600",
						disabled && "cursor-not-allowed opacity-50",
						className,
					)}
					disabled={disabled || isProcessing}
					onClick={handleClick}
					size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
					type="button"
					variant="ghost"
				>
					<AnimatePresence mode="wait">
						{isListening ? (
							<motion.div
								animate={{ scale: 1, rotate: 0 }}
								exit={{ scale: 0, rotate: 180 }}
								initial={{ scale: 0, rotate: -180 }}
								key="listening"
								transition={{ type: "spring", stiffness: 200, damping: 15 }}
							>
								<MicOff className={iconSizes[size]} />
							</motion.div>
						) : isProcessing ? (
							<motion.div
								animate={{ scale: 1 }}
								exit={{ scale: 0 }}
								initial={{ scale: 0 }}
								key="processing"
							>
								<Loader2 className={cn(iconSizes[size], "animate-spin")} />
							</motion.div>
						) : errorState ? (
							<motion.div
								animate={{ scale: 1 }}
								exit={{ scale: 0 }}
								initial={{ scale: 0 }}
								key="error"
							>
								<MicOff className={cn(iconSizes[size], "text-red-500")} />
							</motion.div>
						) : (
							<motion.div
								animate={{ scale: 1 }}
								exit={{ scale: 0 }}
								initial={{ scale: 0 }}
								key="idle"
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.9 }}
							>
								<Mic className={iconSizes[size]} />
							</motion.div>
						)}
					</AnimatePresence>

					{isListening && (
						<motion.div
							animate={{ scale: 2 }}
							className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-500/40 via-rose-500/20 to-red-500/20 opacity-50"
							exit={{ scale: 0 }}
							initial={{ scale: 0 }}
							transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
						/>
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>
					{isListening
						? "Click to stop recording"
						: isProcessing
							? "Processing voice..."
							: errorState
								? `${errorState} — click to retry`
								: "Click to start voice input"}
				</p>
			</TooltipContent>
		</Tooltip>
	);
}
