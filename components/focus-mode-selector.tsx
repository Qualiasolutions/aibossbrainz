"use client";

import {
  AlertTriangle,
  Briefcase,
  ChevronDown,
  Globe,
  Rocket,
  Search,
  Target,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type BotType,
  FOCUS_MODES,
  type FocusMode,
  getFocusModesForBot,
} from "@/lib/bot-personalities";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, typeof Briefcase> = {
  Briefcase,
  AlertTriangle,
  Rocket,
  Search,
  Target,
  Globe,
  Users,
};

interface FocusModeSelectorProps {
  botType: BotType;
  currentMode: FocusMode;
  onModeChange: (mode: FocusMode) => void;
  className?: string;
}

export function FocusModeSelector({
  botType,
  currentMode,
  onModeChange,
  className,
}: FocusModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const availableModes = getFocusModesForBot(botType);
  const currentModeConfig = FOCUS_MODES[currentMode];
  const CurrentIcon = ICON_MAP[currentModeConfig.icon] || Briefcase;

  const handleSelect = (mode: FocusMode) => {
    onModeChange(mode);
    setIsOpen(false);
  };

  // Don't show selector if there's only the default mode
  if (availableModes.length <= 1) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 text-sm h-9 px-4",
            "bg-white/10 border-2 border-red-500/50 hover:border-red-500",
            "hover:bg-red-500/20 transition-all duration-200",
            "shadow-md shadow-black/20",
            currentMode !== "default" && "border-red-500 bg-red-500/20",
            className,
          )}
        >
          <CurrentIcon
            className={cn(
              "h-4 w-4",
              currentMode !== "default"
                ? "text-red-500"
                : currentModeConfig.color.replace("bg-", "text-"),
            )}
          />
          <span className="hidden sm:inline font-bold text-zinc-900">
            {currentModeConfig.name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground px-2 py-1">
            Select a focus mode for specialized advice
          </p>
          {availableModes.map((mode) => {
            const Icon = ICON_MAP[mode.icon] || Briefcase;
            const isSelected = mode.id === currentMode;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleSelect(mode.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-2 rounded-md text-left transition-colors",
                  isSelected
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                    mode.color,
                  )}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{mode.name}</span>
                    {isSelected && (
                      <Badge variant="secondary" className="text-[10px] h-4">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {mode.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Compact badge version for displaying current mode
export function FocusModeBadge({
  mode,
  className,
}: {
  mode: FocusMode;
  className?: string;
}) {
  if (mode === "default") return null;

  const modeConfig = FOCUS_MODES[mode];
  const Icon = ICON_MAP[modeConfig.icon] || Briefcase;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px] h-5 px-1.5",
        modeConfig.color.replace("bg-", "border-"),
        modeConfig.color.replace("bg-", "text-"),
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {modeConfig.name}
    </Badge>
  );
}
