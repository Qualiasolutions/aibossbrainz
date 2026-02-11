"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Globe,
  Rocket,
  Search,
  Target,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

interface FocusModeChipsProps {
  botType: BotType;
  currentMode: FocusMode;
  onModeChange: (mode: FocusMode) => void;
  className?: string;
}

export function FocusModeChips({
  botType,
  currentMode,
  onModeChange,
  className,
}: FocusModeChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const availableModes = getFocusModesForBot(botType);

  // Check scroll position to show/hide arrows
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 150;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Don't show if only default mode
  if (availableModes.length <= 1) {
    return null;
  }

  return (
    <div className={cn("relative w-full", className)}>
      {/* Left scroll arrow */}
      <AnimatePresence>
        {showLeftArrow && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:bg-white"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-zinc-600" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Scrollable chips container */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex justify-between gap-3 overflow-x-auto px-1 py-1 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {availableModes.map((mode) => {
          const Icon = ICON_MAP[mode.icon] || Briefcase;
          const isSelected = mode.id === currentMode;

          return (
            <motion.button
              key={mode.id}
              type="button"
              onClick={() => onModeChange(mode.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                "border shadow-sm",
                isSelected
                  ? "border-red-500/50 bg-red-500/10 text-red-600 shadow-red-500/10"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-red-300 hover:bg-red-50/50 hover:text-red-500",
              )}
            >
              <Icon
                className={cn(
                  "h-3 w-3",
                  isSelected ? "text-red-500" : "text-zinc-400",
                )}
              />
              <span className="whitespace-nowrap">{mode.name}</span>
              {isSelected && (
                <motion.div
                  layoutId="focus-indicator"
                  className="ml-0.5 h-1.5 w-1.5 rounded-full bg-red-500"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Right scroll arrow */}
      <AnimatePresence>
        {showRightArrow && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:bg-white"
          >
            <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact single-line version showing only selected mode with change button
export function FocusModeCompact({
  botType,
  currentMode,
  onModeChange,
  className,
}: FocusModeChipsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const availableModes = getFocusModesForBot(botType);
  const currentModeConfig = FOCUS_MODES[currentMode];
  const Icon = ICON_MAP[currentModeConfig.icon] || Briefcase;

  if (availableModes.length <= 1) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1.5"
          >
            {availableModes.map((mode) => {
              const ModeIcon = ICON_MAP[mode.icon] || Briefcase;
              const isSelected = mode.id === currentMode;

              return (
                <motion.button
                  key={mode.id}
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => {
                    onModeChange(mode.id);
                    setIsExpanded(false);
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                    "border",
                    isSelected
                      ? "border-red-500/50 bg-red-500/10 text-red-600"
                      : "border-zinc-200 bg-white text-zinc-500 hover:border-red-300 hover:text-red-500",
                  )}
                >
                  <ModeIcon className="h-2.5 w-2.5" />
                  <span>{mode.name}</span>
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            onClick={() => setIsExpanded(true)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
              currentMode !== "default"
                ? "border-red-500/30 bg-red-50 text-red-600"
                : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-zinc-300",
            )}
          >
            <Icon className="h-2.5 w-2.5" />
            <span>{currentModeConfig.name}</span>
            <ChevronRight className="h-2.5 w-2.5 opacity-50" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
