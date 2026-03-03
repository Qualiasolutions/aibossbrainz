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

const EXECUTIVE_TITLES: Record<BotType, string> = {
	alexandria: "Chief Marketing Officer",
	kim: "Chief Sales Officer",
	collaborative: "Executive Team",
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
		<div className="relative flex flex-col items-center justify-between min-h-[460px] py-8 px-6">
			{/* Subtle gradient overlay */}
			<div className="absolute inset-0 bg-gradient-to-b from-rose-100/40 via-transparent to-amber-50/20 pointer-events-none rounded-2xl" />

			<div className="relative z-10 flex flex-col items-center justify-between w-full h-full gap-2">
				{/* Header: name + title + timer */}
				<div className="text-center space-y-1.5">
					<h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">
						{EXECUTIVE_NAMES[executive]}
					</h2>
					<p className="text-xs font-medium text-neutral-400 uppercase tracking-widest">
						{EXECUTIVE_TITLES[executive]}
					</p>

					{isActive && !hasError && (
						<div className="inline-flex items-center gap-2 px-3 py-1 mt-1 rounded-full bg-neutral-100 border border-neutral-200/80">
							<span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
							<span className="text-sm text-neutral-500 tabular-nums font-mono">
								{formatDuration(callDuration)}
							</span>
						</div>
					)}

					{isConnecting && (
						<div className="flex items-center justify-center gap-2 animate-in fade-in duration-300">
							<span className="size-2 rounded-full bg-rose-400 animate-pulse" />
							<p className="text-sm text-neutral-400">Connecting...</p>
						</div>
					)}

					{hasError && (
						<p className="text-sm text-red-500 font-medium">Call failed</p>
					)}
				</div>

				{/* Visualizer or error */}
				<div className="flex-1 flex items-center justify-center w-full my-2">
					{hasError ? (
						<div className="flex flex-col items-center gap-3 text-center px-4">
							<AlertCircle className="h-12 w-12 text-red-400" />
							<p className="text-sm text-neutral-500 max-w-[280px]">
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
				<div className="w-full min-h-[72px] text-center space-y-2 mb-2">
					{/* Thinking indicator */}
					{isThinking && (
						<div className="flex items-center justify-center gap-1.5 animate-in fade-in duration-300">
							<span className="size-1.5 rounded-full bg-neutral-400 animate-pulse" />
							<span className="size-1.5 rounded-full bg-neutral-400 animate-pulse [animation-delay:150ms]" />
							<span className="size-1.5 rounded-full bg-neutral-400 animate-pulse [animation-delay:300ms]" />
						</div>
					)}

					{isListening && !isMuted && !transcript && (
						<p className="text-xs text-neutral-400 animate-in fade-in duration-300">
							Listening...
						</p>
					)}

					{isMuted && isListening && (
						<p className="text-xs text-red-400 font-medium animate-in fade-in duration-300">
							Muted
						</p>
					)}

					{/* Live transcript (what user is saying) */}
					{transcript && (isListening || isThinking) && (
						<p className="text-sm text-neutral-500 italic line-clamp-2 animate-in fade-in duration-300">
							&ldquo;{transcript}&rdquo;
						</p>
					)}

					{/* Last AI response (while speaking) */}
					{isSpeaking && lastAIMessage && (
						<p className="text-xs text-neutral-400 line-clamp-2 px-4 animate-in fade-in duration-300">
							{lastAIMessage.content.slice(0, 120)}
							{lastAIMessage.content.length > 120 ? "..." : ""}
						</p>
					)}
				</div>

				{/* Controls — always visible during active call */}
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
						className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
					>
						{hasError ? "Close" : "Cancel"}
					</button>
				)}
			</div>
		</div>
	);
}
