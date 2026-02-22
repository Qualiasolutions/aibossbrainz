"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VoiceInputButtonProps {
	isVoiceMode: boolean;
	isListening: boolean;
	isProcessing: boolean;
	isSupported: boolean;
	disabled?: boolean;
	onToggle: () => void;
	className?: string;
	size?: "sm" | "md" | "lg";
}

export function VoiceInputButton({
	isVoiceMode,
	isListening,
	isProcessing,
	isSupported,
	disabled = false,
	onToggle,
	className,
	size = "md",
}: VoiceInputButtonProps) {
	const iconSizes = {
		sm: "h-3 w-3",
		md: "h-4 w-4",
		lg: "h-5 w-5",
	};

	if (!isSupported) {
		return null;
	}

	const getTooltip = () => {
		if (isVoiceMode && isListening) return "Listening... click to end voice mode";
		if (isVoiceMode && isProcessing) return "Sending...";
		if (isVoiceMode) return "Waiting for response... click to end voice mode";
		return "Start voice mode";
	};

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					className={cn(
						"relative overflow-hidden border border-transparent transition-all duration-300",
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
							"hover:border-rose-300/60 hover:bg-rose-50/60 hover:text-rose-600",
						disabled && "cursor-not-allowed opacity-50",
						className,
					)}
					disabled={disabled}
					onClick={onToggle}
					size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
					type="button"
					variant="ghost"
				>
					<AnimatePresence mode="wait">
						{isVoiceMode && isListening ? (
							<motion.div
								animate={{ scale: 1, rotate: 0 }}
								exit={{ scale: 0, rotate: 180 }}
								initial={{ scale: 0, rotate: -180 }}
								key="listening"
								transition={{ type: "spring", stiffness: 200, damping: 15 }}
							>
								<MicOff className={iconSizes[size]} />
							</motion.div>
						) : isVoiceMode && isProcessing ? (
							<motion.div
								animate={{ scale: 1 }}
								exit={{ scale: 0 }}
								initial={{ scale: 0 }}
								key="processing"
							>
								<Loader2 className={cn(iconSizes[size], "animate-spin")} />
							</motion.div>
						) : isVoiceMode ? (
							<motion.div
								animate={{ scale: [1, 1.1, 1] }}
								key="waiting"
								transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
							>
								<Mic className={cn(iconSizes[size], "text-purple-500")} />
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

					{isVoiceMode && isListening && (
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
				<p>{getTooltip()}</p>
			</TooltipContent>
		</Tooltip>
	);
}
