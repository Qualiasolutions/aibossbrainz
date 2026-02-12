"use client";

import {
	ChevronDown,
	Gauge,
	Loader2,
	Pause,
	Play,
	Volume2,
	VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useVoicePlayer } from "@/hooks/use-voice-player";
import { SPEED_PRESETS, useVoiceSpeed } from "@/hooks/use-voice-speed";
import { useVoiceVolume, VOLUME_PRESETS } from "@/hooks/use-voice-volume";
import {
	isAudioPaused,
	isAudioPlaying,
	pauseAudio,
	resumeAudio,
	subscribeToAudioChanges,
	updatePlaybackRate,
	updateVolume,
} from "@/lib/audio-manager";
import type { BotType } from "@/lib/bot-personalities";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Slider } from "./ui/slider";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";

interface VoicePlayerButtonProps {
	text: string;
	botType: BotType;
	className?: string;
}

export const VoicePlayerButton = ({
	text,
	botType,
	className,
}: VoicePlayerButtonProps) => {
	const voicePlayer = useVoicePlayer();
	const { speed, setSpeed: setSpeedBase } = useVoiceSpeed();
	const {
		volume,
		setVolume: setVolumeBase,
		isMuted,
		toggleMute,
		volumeLevel,
	} = useVoiceVolume();
	const [showSettingsPopover, setShowSettingsPopover] = useState(false);

	// Track global audio state (for auto-speak sync)
	const [globalAudioPlaying, setGlobalAudioPlaying] = useState(false);
	const [globalAudioPaused, setGlobalAudioPaused] = useState(false);

	// Subscribe to global audio state changes
	useEffect(() => {
		const updateGlobalState = () => {
			const playing = isAudioPlaying();
			const paused = isAudioPaused();
			setGlobalAudioPlaying(playing && !paused);
			setGlobalAudioPaused(paused);
		};

		// Set initial state
		updateGlobalState();

		const unsubscribe = subscribeToAudioChanges(() => {
			updateGlobalState();
		});
		return unsubscribe;
	}, []);

	// Wrap setSpeed to also update currently playing audio
	const setSpeed = useCallback(
		(newSpeed: number) => {
			setSpeedBase(newSpeed);
			updatePlaybackRate(newSpeed);
		},
		[setSpeedBase],
	);

	// Wrap setVolume to also update currently playing audio
	const handleSetVolume = useCallback(
		(newVolume: number) => {
			setVolumeBase(newVolume);
			updateVolume(newVolume / 100);
		},
		[setVolumeBase],
	);

	// Determine effective playing/paused state (local or global)
	const effectiveIsPlaying = voicePlayer.isPlaying || globalAudioPlaying;
	const effectiveIsPaused = voicePlayer.isPaused || globalAudioPaused;

	const handleClick = () => {
		// If global audio is playing (from auto-speak), pause it
		if (globalAudioPlaying && !voicePlayer.isPlaying) {
			pauseAudio();
			return;
		}
		// If global audio is paused (from auto-speak), resume it
		if (globalAudioPaused && !voicePlayer.isPaused) {
			resumeAudio();
			return;
		}
		// Otherwise use local voice player
		if (voicePlayer.isPlaying) {
			voicePlayer.pause();
		} else if (voicePlayer.isPaused) {
			voicePlayer.resume();
		} else {
			voicePlayer.play(text, botType, speed, volumeLevel);
		}
	};

	const getTooltipText = () => {
		if (voicePlayer.isLoading) return "Generating voice...";
		if (effectiveIsPlaying) return "Pause";
		if (effectiveIsPaused) return "Resume";
		if (voicePlayer.isError) return voicePlayer.error ?? "Voice error";
		return "Listen to response";
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleClick();
		}
	};

	return (
		<TooltipProvider>
			<div className="flex items-center">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							aria-label={
								effectiveIsPlaying
									? "Pause"
									: effectiveIsPaused
										? "Resume"
										: "Listen to response"
							}
							className={`${className} rounded-r-none`}
							disabled={voicePlayer.isLoading}
							onClick={handleClick}
							onKeyDown={handleKeyDown}
							size="icon"
							type="button"
							variant="ghost"
						>
							{voicePlayer.isLoading ? (
								<Loader2 className="size-4 animate-spin text-muted-foreground" />
							) : effectiveIsPlaying ? (
								<Pause className="size-4 text-rose-500" />
							) : effectiveIsPaused ? (
								<Play className="size-4 text-emerald-500" />
							) : (
								<Volume2
									className={`size-4 ${
										voicePlayer.isError
											? "text-destructive"
											: "text-muted-foreground"
									}`}
								/>
							)}
						</Button>
					</TooltipTrigger>
					<TooltipContent className="text-xs" side="top">
						{getTooltipText()}
					</TooltipContent>
				</Tooltip>

				<Popover
					onOpenChange={setShowSettingsPopover}
					open={showSettingsPopover}
				>
					<PopoverTrigger asChild>
						<Button
							aria-label="Voice settings"
							className="h-8 w-6 rounded-l-none border-border/40 border-l px-1 text-muted-foreground hover:text-foreground"
							type="button"
							variant="ghost"
						>
							<ChevronDown size={12} />
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end" className="w-52 p-3">
						<div className="space-y-4">
							{/* Volume Control */}
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="flex items-center gap-1.5 font-medium text-sm">
										<Button
											aria-label={isMuted ? "Unmute" : "Mute"}
											className="h-6 w-6 p-0"
											onClick={toggleMute}
											size="sm"
											type="button"
											variant="ghost"
										>
											{isMuted ? (
												<VolumeX size={14} className="text-muted-foreground" />
											) : (
												<Volume2 size={14} />
											)}
										</Button>
										Volume
									</span>
									<span className="text-muted-foreground text-sm">
										{isMuted ? "Muted" : `${volume}%`}
									</span>
								</div>
								<Slider
									className="w-full"
									disabled={isMuted}
									max={100}
									min={0}
									onValueChange={([value]) => handleSetVolume(value)}
									step={5}
									value={[volume]}
								/>
								<div className="flex flex-wrap gap-1">
									{VOLUME_PRESETS.map((preset) => (
										<Button
											className="h-6 px-2 text-xs"
											disabled={isMuted}
											key={preset.value}
											onClick={() => handleSetVolume(preset.value)}
											size="sm"
											type="button"
											variant={volume === preset.value ? "secondary" : "ghost"}
										>
											{preset.label}
										</Button>
									))}
								</div>
							</div>

							{/* Divider */}
							<div className="border-border/50 border-t" />

							{/* Speed Control */}
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="flex items-center gap-1.5 font-medium text-sm">
										<Gauge size={14} />
										Speed
									</span>
									<span className="text-muted-foreground text-sm">
										{speed}x
									</span>
								</div>
								<Slider
									className="w-full"
									max={3}
									min={0.5}
									onValueChange={([value]) => setSpeed(value)}
									step={0.25}
									value={[speed]}
								/>
								<div className="flex flex-wrap gap-1">
									{SPEED_PRESETS.map((preset) => (
										<Button
											className="h-6 px-2 text-xs"
											key={preset.value}
											onClick={() => setSpeed(preset.value)}
											size="sm"
											type="button"
											variant={speed === preset.value ? "secondary" : "ghost"}
										>
											{preset.label}
										</Button>
									))}
								</div>
							</div>
						</div>
					</PopoverContent>
				</Popover>
			</div>
		</TooltipProvider>
	);
};
