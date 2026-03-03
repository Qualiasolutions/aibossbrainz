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

	// Determine state label
	const getStateLabel = () => {
		if (hasError) return "Call failed";
		if (isConnecting) return "Connecting...";
		if (isListening) return "Listening...";
		if (callState === "thinking") return "Thinking...";
		if (isSpeaking) return "Speaking...";
		return "Connecting...";
	};

	// Visualizer is active when listening or speaking
	const isVisualizerActive = isListening || isSpeaking;

	return (
		<div className="flex flex-col items-center justify-between min-h-[400px] py-8 px-6 space-y-8">
			{/* Executive name */}
			<div className="text-center space-y-1">
				<h2 className="text-2xl font-semibold">{EXECUTIVE_NAMES[executive]}</h2>
				<p
					className={`text-sm ${hasError ? "text-red-500" : "text-muted-foreground"}`}
				>
					{getStateLabel()}
				</p>
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
