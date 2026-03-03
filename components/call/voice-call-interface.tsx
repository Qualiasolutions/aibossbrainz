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

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceCallInterface({
	executive,
	onHangup,
}: VoiceCallInterfaceProps) {
	const {
		callState,
		transcript,
		errorMessage,
		isMuted,
		callDuration,
		conversation,
		analyserNode,
		startCall,
		stopCall,
		toggleMute,
		isListening,
		isSpeaking,
		isConnecting,
		hasError,
	} = useVoiceCall({ executive });

	// Start call on mount
	useEffect(() => {
		startCall();
	}, [startCall]);

	const handleHangup = () => {
		stopCall();
		onHangup();
	};

	const isThinking = callState === "thinking";
	const isActive = isListening || isSpeaking || isThinking;

	// Get the most recent AI response for display
	const lastAIMessage =
		conversation.length > 0
			? [...conversation].reverse().find((c) => c.role === "assistant")
			: null;

	return (
		<div className="relative flex flex-col items-center justify-between min-h-[420px] py-6 px-6">
			<div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent pointer-events-none rounded-lg" />
			<div className="relative z-10 flex flex-col items-center justify-between w-full h-full">
				{/* Header: name + timer */}
				<div className="text-center space-y-1">
					<h2 className="text-2xl font-semibold bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
						{EXECUTIVE_NAMES[executive]}
					</h2>
					{isActive && !hasError && (
						<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
							<span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
							<p className="text-sm text-muted-foreground tabular-nums font-mono">
								{formatDuration(callDuration)}
							</p>
						</div>
					)}
					{isConnecting && (
						<div className="flex items-center gap-2 animate-in fade-in duration-300">
							<span className="size-2 rounded-full bg-rose-400 animate-pulse" />
							<p className="text-sm text-muted-foreground">Connecting...</p>
						</div>
					)}
					{hasError && <p className="text-sm text-red-500">Call failed</p>}
				</div>

				{/* Visualizer or error */}
				<div className="flex-1 flex items-center justify-center w-full my-4">
					{hasError ? (
						<div className="flex flex-col items-center gap-3 text-center px-4">
							<AlertCircle className="h-12 w-12 text-red-500/60" />
							<p className="text-sm text-muted-foreground max-w-[280px]">
								{errorMessage}
							</p>
						</div>
					) : (
						<VoiceVisualizer
							analyserNode={analyserNode}
							isActive={isActive}
							isSpeaking={isSpeaking}
							isConnecting={isConnecting}
						/>
					)}
				</div>

				{/* Status + transcript area */}
				<div className="w-full min-h-[80px] text-center space-y-2 mb-4">
					{/* State indicator */}
					{isThinking && (
						<div className="flex items-center justify-center gap-1.5 animate-in fade-in duration-300">
							<span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
							<span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:150ms]" />
							<span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:300ms]" />
						</div>
					)}

					{isListening && !isMuted && !transcript && (
						<p className="text-xs text-muted-foreground/50 animate-in fade-in duration-300">
							Listening...
						</p>
					)}

					{isMuted && isListening && (
						<p className="text-xs text-red-400/70 animate-in fade-in duration-300">
							Muted
						</p>
					)}

					{/* Live transcript (what user is saying) */}
					{transcript && (isListening || isThinking) && (
						<p className="text-sm text-muted-foreground/80 italic line-clamp-2 animate-in fade-in duration-300">
							&ldquo;{transcript}&rdquo;
						</p>
					)}

					{/* Last AI response (while speaking) */}
					{isSpeaking && lastAIMessage && (
						<p className="text-xs text-muted-foreground/50 line-clamp-2 px-4 animate-in fade-in duration-300">
							{lastAIMessage.content.slice(0, 120)}
							{lastAIMessage.content.length > 120 ? "..." : ""}
						</p>
					)}
				</div>

				{/* Controls */}
				{!hasError && !isConnecting && (
					<CallControls
						onHangup={handleHangup}
						onToggleMute={toggleMute}
						isMuted={isMuted}
					/>
				)}

				{/* Simple hangup for error/connecting states */}
				{(hasError || isConnecting) && (
					<button
						type="button"
						onClick={handleHangup}
						className="text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						{hasError ? "Close" : "Cancel"}
					</button>
				)}
			</div>
		</div>
	);
}
