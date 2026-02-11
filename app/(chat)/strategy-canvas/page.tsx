"use client";

import {
  Compass,
  GridNine,
  Lightbulb,
  Moon,
  Path,
  Sun,
  Target,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrainstormBoard } from "@/components/strategy-canvas/brainstorm-board";
import { BusinessModelCanvas } from "@/components/strategy-canvas/business-model-canvas";
import { CustomerJourney } from "@/components/strategy-canvas/customer-journey";
import { SwotBoard } from "@/components/strategy-canvas/swot-board";
import type { CanvasType } from "@/components/strategy-canvas/types";
import { cn } from "@/lib/utils";

// Unified brand color palette - executive rose theme
const brandColors = {
  primary: "from-rose-500 to-red-600",
  primaryLight: "bg-rose-50 dark:bg-rose-900/20",
  primaryShadow: "shadow-rose-500/25",
  accent: "rose",
};

const canvasTypes = [
  {
    key: "swot" as CanvasType,
    label: "SWOT Analysis",
    shortLabel: "SWOT",
    icon: Target,
    description: "Strengths, Weaknesses, Opportunities, Threats",
    gradient: brandColors.primary,
    lightBg: brandColors.primaryLight,
    activeBg: `bg-gradient-to-r ${brandColors.primary}`,
    shadowColor: brandColors.primaryShadow,
    iconWeight: "duotone" as const,
  },
  {
    key: "bmc" as CanvasType,
    label: "Business Model Canvas",
    shortLabel: "BMC",
    icon: GridNine,
    description: "9 building blocks of your business",
    gradient: brandColors.primary,
    lightBg: brandColors.primaryLight,
    activeBg: `bg-gradient-to-r ${brandColors.primary}`,
    shadowColor: brandColors.primaryShadow,
    iconWeight: "duotone" as const,
  },
  {
    key: "journey" as CanvasType,
    label: "Customer Journey",
    shortLabel: "Journey",
    icon: Path,
    description: "Map the complete customer experience",
    gradient: brandColors.primary,
    lightBg: brandColors.primaryLight,
    activeBg: `bg-gradient-to-r ${brandColors.primary}`,
    shadowColor: brandColors.primaryShadow,
    iconWeight: "duotone" as const,
  },
  {
    key: "brainstorm" as CanvasType,
    label: "Brainstorming",
    shortLabel: "Ideas",
    icon: Lightbulb,
    description: "Capture and organize ideas freely",
    gradient: brandColors.primary,
    lightBg: brandColors.primaryLight,
    activeBg: `bg-gradient-to-r ${brandColors.primary}`,
    shadowColor: brandColors.primaryShadow,
    iconWeight: "duotone" as const,
  },
];

export default function StrategyCanvasPage() {
  const [activeCanvas, setActiveCanvas] = useState<CanvasType>("swot");
  const [isDark, setIsDark] = useState(false);
  const mobileTabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<CanvasType, HTMLButtonElement>>(new Map());

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDarkMode = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle("dark", newIsDark);
  };

  // Scroll active tab into view on mobile
  const scrollToActiveTab = useCallback((key: CanvasType) => {
    const tabElement = tabRefs.current.get(key);
    if (tabElement && mobileTabsRef.current) {
      tabElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, []);

  const handleTabChange = (key: CanvasType) => {
    setActiveCanvas(key);
    // Small delay to ensure DOM is updated
    setTimeout(() => scrollToActiveTab(key), 50);
  };

  const activeTab = canvasTypes.find((c) => c.key === activeCanvas);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      {/* Animated background - unified rose theme */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-40 size-96 rounded-full bg-gradient-to-br from-rose-200/40 to-red-200/30 blur-3xl dark:from-rose-900/15 dark:to-red-900/10"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 -right-40 size-96 rounded-full bg-gradient-to-br from-rose-200/30 to-red-200/20 blur-3xl dark:from-rose-900/10 dark:to-red-900/10"
          animate={{
            x: [0, -30, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Sticky Header - Premium glass morphism */}
      <header className="sticky top-0 z-50 border-b border-rose-200/30 bg-white/85 backdrop-blur-2xl dark:border-rose-800/20 dark:bg-neutral-900/85">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo and Back */}
            <div className="flex items-center gap-4">
              <Link href="/new">
                <motion.button
                  whileHover={{ scale: 1.02, x: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 rounded-xl border border-neutral-200/50 bg-white/60 px-4 py-2.5 text-sm font-medium text-neutral-600 shadow-sm transition-all hover:border-rose-200 hover:bg-white hover:shadow-md dark:border-neutral-700/50 dark:bg-neutral-800/60 dark:text-neutral-300 dark:hover:border-rose-800/50 dark:hover:bg-neutral-800"
                >
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">Back to Chat</span>
                </motion.button>
              </Link>
              <div className="hidden h-8 w-px bg-gradient-to-b from-transparent via-rose-200 to-transparent dark:via-rose-800/30 sm:block" />
              <div className="hidden items-center gap-3 sm:flex">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 3 }}
                  className="relative"
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 blur-lg opacity-40" />
                  <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/30">
                    <Compass weight="duotone" className="size-5 text-white" />
                  </div>
                </motion.div>
                <div>
                  <h1 className="font-bold text-lg text-neutral-900 dark:text-white">
                    Strategy Canvas
                  </h1>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Executive Planning Suite
                  </p>
                </div>
              </div>
            </div>

            {/* Theme Toggle - Premium styling */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex size-10 items-center justify-center rounded-xl border border-neutral-200/50 bg-white/60 text-neutral-500 shadow-sm transition-all hover:border-rose-200 hover:bg-white hover:text-rose-600 dark:border-neutral-700/50 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:border-rose-800/50 dark:hover:text-rose-400"
              onClick={toggleDarkMode}
              type="button"
            >
              {isDark ? (
                <Sun weight="duotone" className="size-5" />
              ) : (
                <Moon weight="duotone" className="size-5" />
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 lg:px-8">
        {/* Premium Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          {/* Desktop Tabs - Premium unified rose theme (lg+) */}
          <div className="hidden lg:block">
            <div className="relative rounded-2xl border border-rose-200/30 bg-gradient-to-b from-white/90 to-white/60 p-2 shadow-[0_8px_32px_rgba(244,63,94,0.08)] backdrop-blur-2xl dark:border-rose-800/20 dark:from-neutral-800/90 dark:to-neutral-900/70 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              {/* Subtle rose accent line at top */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-24 rounded-full bg-gradient-to-r from-transparent via-rose-400/50 to-transparent" />
              <div className="relative flex gap-1">
                {canvasTypes.map((canvas, index) => {
                  const Icon = canvas.icon;
                  const isActive = activeCanvas === canvas.key;

                  return (
                    <motion.button
                      key={canvas.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index }}
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleTabChange(canvas.key)}
                      className={cn(
                        "group relative flex flex-1 flex-col items-center gap-3 rounded-xl px-4 py-5 transition-all duration-300",
                        isActive
                          ? "text-white"
                          : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
                      )}
                      type="button"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 shadow-lg shadow-rose-500/30"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                          }}
                        >
                          {/* Inner highlight */}
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/10 to-white/10" />
                        </motion.div>
                      )}
                      {/* Hover effect for inactive */}
                      {!isActive && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-rose-50/0 to-rose-50/0 opacity-0 transition-all duration-300 group-hover:from-rose-50/60 group-hover:to-rose-100/30 group-hover:opacity-100 dark:group-hover:from-rose-900/20 dark:group-hover:to-rose-950/10" />
                      )}
                      <div className="relative z-10 flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-10 items-center justify-center rounded-xl transition-all duration-300",
                            isActive
                              ? "bg-white/20 shadow-inner shadow-black/10"
                              : "bg-gradient-to-br from-rose-50 to-rose-100/50 shadow-sm group-hover:shadow-md group-hover:scale-105 dark:from-rose-900/30 dark:to-rose-950/20",
                          )}
                        >
                          <Icon
                            weight={isActive ? "fill" : "duotone"}
                            className={cn(
                              "size-5 transition-all duration-300",
                              isActive
                                ? "text-white"
                                : "text-rose-600 dark:text-rose-400",
                            )}
                          />
                        </div>
                        <span className="font-semibold text-sm tracking-tight">
                          {canvas.label}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "relative z-10 text-center text-xs leading-relaxed transition-colors duration-300",
                          isActive
                            ? "text-white/90"
                            : "text-neutral-400 group-hover:text-rose-600/70 dark:text-neutral-500 dark:group-hover:text-rose-300/70",
                        )}
                      >
                        {canvas.description}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tablet Tabs - 2x2 Grid (md-lg) */}
          <div className="hidden md:block lg:hidden">
            <div className="rounded-2xl border border-rose-200/30 bg-gradient-to-b from-white/90 to-white/60 p-2 shadow-[0_8px_32px_rgba(244,63,94,0.08)] backdrop-blur-2xl dark:border-rose-800/20 dark:from-neutral-800/90 dark:to-neutral-900/70">
              <div className="grid grid-cols-2 gap-2">
                {canvasTypes.map((canvas, index) => {
                  const Icon = canvas.icon;
                  const isActive = activeCanvas === canvas.key;

                  return (
                    <motion.button
                      key={canvas.key}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.05 * index }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleTabChange(canvas.key)}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-4 py-4 transition-all duration-300",
                        isActive
                          ? "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30"
                          : "text-neutral-600 hover:bg-rose-50/60 dark:text-neutral-400 dark:hover:bg-rose-900/20",
                      )}
                      type="button"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTabletTab"
                          className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/10 to-white/10"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                          }}
                        />
                      )}
                      <div
                        className={cn(
                          "relative z-10 flex size-10 items-center justify-center rounded-xl transition-all",
                          isActive
                            ? "bg-white/20"
                            : "bg-rose-50 dark:bg-rose-900/30",
                        )}
                      >
                        <Icon
                          weight={isActive ? "fill" : "duotone"}
                          className={cn(
                            "size-5",
                            isActive
                              ? "text-white"
                              : "text-rose-600 dark:text-rose-400",
                          )}
                        />
                      </div>
                      <div className="relative z-10 flex flex-col items-start">
                        <span className="font-semibold text-sm">
                          {canvas.shortLabel}
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            isActive
                              ? "text-white/80"
                              : "text-neutral-400 dark:text-neutral-500",
                          )}
                        >
                          {canvas.description.split(",")[0]}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Tabs - Horizontal scrollable pills */}
          <div className="relative md:hidden">
            {/* Scroll fade indicators */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-2 z-10 w-6 bg-gradient-to-r from-neutral-50 to-transparent dark:from-neutral-950" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-2 z-10 w-6 bg-gradient-to-l from-neutral-50 to-transparent dark:from-neutral-950" />

            <div
              ref={mobileTabsRef}
              className="flex gap-2 overflow-x-auto px-2 -mx-2 pb-2 scrollbar-hide snap-x snap-mandatory"
            >
              {canvasTypes.map((canvas, index) => {
                const Icon = canvas.icon;
                const isActive = activeCanvas === canvas.key;

                return (
                  <motion.button
                    key={canvas.key}
                    ref={(el) => {
                      if (el) tabRefs.current.set(canvas.key, el);
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * index }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTabChange(canvas.key)}
                    className={cn(
                      "relative flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 snap-center",
                      isActive
                        ? "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30"
                        : "border border-rose-200/50 bg-white/80 text-neutral-600 shadow-sm backdrop-blur-sm active:bg-rose-50 dark:border-rose-800/30 dark:bg-neutral-800/80 dark:text-neutral-300 dark:active:bg-rose-900/20",
                    )}
                    type="button"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeMobileTab"
                        className="absolute inset-0 rounded-full bg-gradient-to-t from-black/10 to-white/10"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <Icon
                      weight={isActive ? "fill" : "duotone"}
                      className={cn(
                        "relative z-10 size-4",
                        isActive
                          ? "text-white"
                          : "text-rose-500 dark:text-rose-400",
                      )}
                    />
                    <span className="relative z-10 whitespace-nowrap">
                      {canvas.shortLabel}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Active Tab Description (Mobile only) */}
        {activeTab && (
          <motion.div
            key={activeTab.key}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-center md:hidden"
          >
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {activeTab.description}
            </p>
          </motion.div>
        )}

        {/* Canvas Content Container - Premium Glass with rose accents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl border border-rose-200/30 bg-gradient-to-b from-white/95 to-white/80 p-4 shadow-[0_20px_60px_-15px_rgba(244,63,94,0.08)] backdrop-blur-2xl dark:border-rose-800/20 dark:from-neutral-900/95 dark:to-neutral-950/85 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] sm:p-6 lg:p-8"
        >
          {/* Subtle rose accent corners */}
          <div className="pointer-events-none absolute top-0 left-0 h-24 w-24 bg-gradient-to-br from-rose-500/5 to-transparent" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-24 w-24 bg-gradient-to-tl from-rose-500/5 to-transparent" />
          {/* Inner ring */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-rose-200/20 dark:ring-rose-800/10" />
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCanvas}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              {activeCanvas === "swot" && <SwotBoard />}
              {activeCanvas === "bmc" && <BusinessModelCanvas />}
              {activeCanvas === "journey" && <CustomerJourney />}
              {activeCanvas === "brainstorm" && <BrainstormBoard />}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Pro Tip - Rose themed */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center"
        >
          <p className="text-xs font-medium tracking-wide text-neutral-400/80 dark:text-neutral-500/80">
            <span className="text-rose-500/60">Export</span> your work to save
            and share with your team
          </p>
        </motion.div>
      </main>

      {/* Footer - Premium rose branding */}
      <footer className="border-t border-rose-200/20 bg-gradient-to-b from-transparent to-rose-50/30 py-6 dark:border-rose-800/10 dark:to-rose-950/10">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-neutral-400 text-xs font-medium tracking-wide dark:text-neutral-500">
            Strategy Canvas by{" "}
            <span className="bg-gradient-to-r from-rose-500 to-red-600 bg-clip-text font-semibold text-transparent">
              Alecci Media
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
