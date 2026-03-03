"use client";

import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useVoiceCall } from "@/hooks/use-voice-call";
import type { BotType } from "@/lib/bot-personalities";
import { CallControls } from "./call-controls";
import { VoiceVisualizer } from "./voice-visualizer";

interface VoiceCallInterfaceProps {
	executive: BotType;
	onHangup: () => void;
}

const EXECUTIVE_NAMES: Record<BotType, string> = {
	alexandria: "Alexandria Alecci",
	kim: "Kim Mylls",
	collaborative: "Alexandria & Kim",
};

export function VoiceCallInterface({
	executive,
	onHangup,
}: VoiceCallInterfaceProps) {
	const {
		callState,
		transcript,
		errorMessage,
		startCall,
		stopCall,
		isListening,
		isSpeaking,
		isConnecting,
		hasError,
	} = useVoiceCall({ executive });

	// Start call on mount
	useEffect(() => {
		startCall();
	}, [startCall]);

	// Handle hangup
	const handleHangup = () => {
		stopCall();
		onHangup();
	};

	const isThinking = callState === "thinking";

	// Visualizer is active when listening or speaking
	const isVisualizerActive = isListening || isSpeaking;

	return (
		<div className="flex flex-col items-center justify-between min-h-[400px] py-8 px-6 space-y-8">
			{/* Executive name + subtle state indicators */}
			<div className="text-center space-y-2">
				<h2 className="text-2xl font-semibold">{EXECUTIVE_NAMES[executive]}</h2>
				{/* Only show text for connecting and error states */}
				{(isConnecting || hasError) && (
					<p
						className={`text-sm ${hasError ? "text-red-500" : "text-muted-foreground"}`}
					>
						{hasError ? "Call failed" : "Connecting..."}
					</p>
				)}
				{/* Pulsing dot during thinking — subtle, no text */}
				{isThinking && (
					<div className="flex items-center justify-center gap-1 h-5">
						<span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
						<span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:150ms]" />
						<span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:300ms]" />
					</div>
				)}
			</div>

			{/* Voice visualizer or error */}
			<div className="flex-1 flex items-center justify-center">
				{hasError ? (
					<div className="flex flex-col items-center gap-3 text-center px-4">
						<AlertCircle className="h-12 w-12 text-red-500/60" />
						<p className="text-sm text-muted-foreground max-w-[280px]">
							{errorMessage}
						</p>
					</div>
				) : (
					<VoiceVisualizer isActive={isVisualizerActive} />
				)}
			</div>

			{/* Transcript */}
			<div className="w-full min-h-[60px] text-center">
				{transcript && !hasError && (
					<p className="text-sm text-muted-foreground/80 italic">
						"{transcript}"
					</p>
				)}
			</div>

			{/* Controls */}
			<CallControls onHangup={handleHangup} />
		</div>
	);
}
