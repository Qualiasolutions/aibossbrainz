"use client";

import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VoiceInputButtonProps {
	isRecording: boolean;
	isSupported: boolean;
	disabled?: boolean;
	onToggle: () => void;
	className?: string;
}

export function VoiceInputButton({
	isRecording,
	isSupported,
	disabled = false,
	onToggle,
	className,
}: VoiceInputButtonProps) {
	if (!isSupported) {
		return null;
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					className={cn(
						"relative overflow-hidden border border-transparent transition-all duration-300",
						isRecording &&
							"border-rose-400/60 bg-rose-500/10 text-rose-600 shadow-[0_0_0_2px_rgba(244,114,182,0.12)]",
						!isRecording &&
							"hover:border-rose-300/60 hover:bg-rose-50/60 hover:text-rose-600",
						disabled && "cursor-not-allowed opacity-50",
						className,
					)}
					disabled={disabled}
					onClick={onToggle}
					size="sm"
					type="button"
					variant="ghost"
				>
					<div className="transition-transform duration-200">
						{isRecording ? (
							<MicOff className="h-3 w-3" />
						) : (
							<Mic className="h-3 w-3" />
						)}
					</div>

					{isRecording && (
						<div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-rose-500/40 via-rose-500/20 to-red-500/20 opacity-50" />
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>{isRecording ? "Stop dictation" : "Dictate text"}</p>
			</TooltipContent>
		</Tooltip>
	);
}
