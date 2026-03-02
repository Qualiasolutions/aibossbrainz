"use client";

import { useEffect } from "react";
import type { BotType } from "@/lib/bot-personalities";
import { useVoiceCall } from "@/hooks/use-voice-call";
import { VoiceVisualizer } from "./voice-visualizer";
import { CallControls } from "./call-controls";

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
	const { callState, transcript, startCall, stopCall, isListening, isSpeaking } =
		useVoiceCall({ executive });

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
				<h2 className="text-2xl font-semibold">
					{EXECUTIVE_NAMES[executive]}
				</h2>
				<p className="text-sm text-muted-foreground">{getStateLabel()}</p>
			</div>

			{/* Voice visualizer */}
			<div className="flex-1 flex items-center justify-center">
				<VoiceVisualizer isActive={isVisualizerActive} />
			</div>

			{/* Transcript */}
			<div className="w-full min-h-[60px] text-center">
				{transcript && (
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
