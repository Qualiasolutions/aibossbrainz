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
import { useState } from "react";
import { SPEED_PRESETS, useVoiceSpeed } from "@/hooks/use-voice-speed";
import { useVoiceVolume, VOLUME_PRESETS } from "@/hooks/use-voice-volume";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Slider } from "./ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface AutoSpeakToggleProps {
  isEnabled: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  isPaused?: boolean;
  onToggle: () => void;
  onStop: () => void;
  onTogglePause?: () => void;
  className?: string;
}

export const AutoSpeakToggle = ({
  isEnabled,
  isLoading,
  isPlaying,
  isPaused = false,
  onToggle,
  onStop,
  onTogglePause,
  className,
}: AutoSpeakToggleProps) => {
  const { speed, setSpeed } = useVoiceSpeed();
  const { volume, setVolume, isMuted, toggleMute } = useVoiceVolume();
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);

  const handleClick = () => {
    if (isLoading) {
      // Cancel loading request
      onStop();
    } else if (isPlaying || isPaused) {
      // Pause/resume instead of stopping
      if (onTogglePause) {
        onTogglePause();
      } else {
        onStop();
      }
    } else {
      onToggle();
    }
  };

  const getTooltipText = () => {
    if (isLoading) return "Cancel voice generation";
    if (isPlaying) return "Pause speaking";
    if (isPaused) return "Resume speaking";
    if (isEnabled) return "Auto-speak on (click to disable)";
    return "Auto-speak off (click to enable)";
  };

  const getAriaLabel = () => {
    if (isPlaying) return "Pause speaking";
    if (isPaused) return "Resume speaking";
    if (isEnabled) return "Disable auto-speak";
    return "Enable auto-speak";
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
              aria-label={getAriaLabel()}
              className={`${className} rounded-r-none`}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              size="icon"
              type="button"
              variant="ghost"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin text-rose-500" />
              ) : isPlaying ? (
                <Pause className="size-4 text-rose-500" />
              ) : isPaused ? (
                <Play className="size-4 text-rose-500" />
              ) : isEnabled ? (
                <Volume2 className="size-4 text-rose-500" />
              ) : (
                <Volume2 className="size-4 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs" side="bottom">
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
              className="h-8 w-6 rounded-l-none border-l border-border/40 px-1 text-muted-foreground hover:text-foreground"
              type="button"
              variant="ghost"
            >
              <ChevronDown size={12} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-3" side="bottom">
            <div className="space-y-4">
              {/* Auto-speak toggle at top */}
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Auto-speak</span>
                <Button
                  className={`h-7 px-3 text-xs ${isEnabled ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : ""}`}
                  onClick={onToggle}
                  size="sm"
                  type="button"
                  variant={isEnabled ? "secondary" : "ghost"}
                >
                  {isEnabled ? "On" : "Off"}
                </Button>
              </div>

              {/* Divider */}
              <div className="border-t border-border/50" />

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
                  onValueChange={([value]) => setVolume(value)}
                  step={5}
                  value={[volume]}
                />
                <div className="flex flex-wrap gap-1">
                  {VOLUME_PRESETS.map((preset) => (
                    <Button
                      className="h-6 px-2 text-xs"
                      disabled={isMuted}
                      key={preset.value}
                      onClick={() => setVolume(preset.value)}
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
              <div className="border-t border-border/50" />

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
                  max={2}
                  min={0.5}
                  onValueChange={([value]) => setSpeed(value)}
                  step={0.25}
                  value={[speed]}
                />
                <div className="flex flex-wrap gap-1">
                  {SPEED_PRESETS.filter((p) =>
                    [0.75, 1.0, 1.25, 1.5].includes(p.value),
                  ).map((preset) => (
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
