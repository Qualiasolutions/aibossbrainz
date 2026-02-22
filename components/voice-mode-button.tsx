"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VoiceModeButtonProps {
	isVoiceMode: boolean;
	isListening: boolean;
	isProcessing: boolean;
	isSupported: boolean;
	disabled?: boolean;
	onToggle: () => void;
	className?: string;
}

export function VoiceModeButton({
	isVoiceMode,
	isListening,
	isProcessing,
	isSupported,
	disabled = false,
	onToggle,
	className,
}: VoiceModeButtonProps) {
	if (!isSupported) {
		return null;
	}

	const getTooltip = () => {
		if (isVoiceMode && isListening)
			return "Listening... click to end voice mode";
		if (isVoiceMode && isProcessing) return "Sending...";
		if (isVoiceMode) return "Waiting for response... click to end voice mode";
		return "Start voice conversation";
	};

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					className={cn(
						"relative size-8 shrink-0 overflow-hidden rounded-lg border border-transparent transition-all duration-300",
						isVoiceMode &&
							isListening &&
							"border-rose-400/60 bg-rose-500/10 text-rose-600 shadow-[0_0_0_2px_rgba(244,114,182,0.12)]",
						isVoiceMode &&
							!isListening &&
							!isProcessing &&
							"border-purple-400/60 bg-purple-500/10 text-purple-600",
						isVoiceMode &&
							isProcessing &&
							"border-blue-400/60 bg-blue-500/10 text-blue-600",
						!isVoiceMode &&
							"text-muted-foreground/70 hover:border-rose-300/60 hover:bg-rose-50/10 hover:text-rose-500",
						disabled && "cursor-not-allowed opacity-50",
						className,
					)}
					disabled={disabled}
					onClick={onToggle}
					size="sm"
					type="button"
					variant="ghost"
				>
					<AnimatePresence mode="wait">
						{isVoiceMode && isProcessing ? (
							<motion.div
								animate={{ scale: 1 }}
								exit={{ scale: 0 }}
								initial={{ scale: 0 }}
								key="processing"
							>
								<Loader2 className="h-4 w-4 animate-spin" />
							</motion.div>
						) : isVoiceMode && isListening ? (
							<motion.div
								animate={{ scale: 1, rotate: 0 }}
								exit={{ scale: 0, rotate: 180 }}
								initial={{ scale: 0, rotate: -180 }}
								key="listening"
								transition={{ type: "spring", stiffness: 200, damping: 15 }}
							>
								<AudioLines className="h-4 w-4" />
							</motion.div>
						) : isVoiceMode ? (
							<motion.div
								animate={{ scale: [1, 1.1, 1] }}
								key="waiting"
								transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
							>
								<AudioLines className="h-4 w-4 text-purple-500" />
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
								<AudioLines className="h-4 w-4" />
							</motion.div>
						)}
					</AnimatePresence>

					{isVoiceMode && isListening && (
						<motion.div
							animate={{ scale: 2 }}
							className="absolute inset-0 rounded-lg bg-gradient-to-br from-rose-500/40 via-rose-500/20 to-red-500/20 opacity-50"
							exit={{ scale: 0 }}
							initial={{ scale: 0 }}
							transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
						/>
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent side="top">
				<p>{getTooltip()}</p>
			</TooltipContent>
		</Tooltip>
	);
}
