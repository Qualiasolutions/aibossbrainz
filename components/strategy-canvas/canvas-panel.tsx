"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Maximize2,
  Minimize2,
  RotateCcw,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface CanvasPanelProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  children: ReactNode;
  accentColor?: "rose" | "blue" | "emerald" | "amber" | "purple";
  onExport?: () => void;
  onReset?: () => void;
  defaultExpanded?: boolean;
  className?: string;
}

const accentClasses = {
  rose: {
    border: "border-rose-500/30 dark:border-rose-400/20",
    glow: "shadow-rose-500/10 dark:shadow-rose-400/5",
    gradient:
      "from-rose-500/10 via-transparent to-transparent dark:from-rose-400/5",
    icon: "text-rose-500 dark:text-rose-400",
    title: "from-rose-600 to-pink-600 dark:from-rose-400 dark:to-pink-400",
  },
  blue: {
    border: "border-blue-500/30 dark:border-blue-400/20",
    glow: "shadow-blue-500/10 dark:shadow-blue-400/5",
    gradient:
      "from-blue-500/10 via-transparent to-transparent dark:from-blue-400/5",
    icon: "text-blue-500 dark:text-blue-400",
    title: "from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400",
  },
  emerald: {
    border: "border-emerald-500/30 dark:border-emerald-400/20",
    glow: "shadow-emerald-500/10 dark:shadow-emerald-400/5",
    gradient:
      "from-emerald-500/10 via-transparent to-transparent dark:from-emerald-400/5",
    icon: "text-emerald-500 dark:text-emerald-400",
    title:
      "from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400",
  },
  amber: {
    border: "border-red-500/30 dark:border-red-500/20",
    glow: "shadow-red-500/10 dark:shadow-red-500/5",
    gradient:
      "from-red-500/10 via-transparent to-transparent dark:from-red-500/5",
    icon: "text-red-500 dark:text-red-500",
    title: "from-red-600 to-orange-600 dark:from-red-500 dark:to-orange-400",
  },
  purple: {
    border: "border-purple-500/30 dark:border-purple-400/20",
    glow: "shadow-purple-500/10 dark:shadow-purple-400/5",
    gradient:
      "from-purple-500/10 via-transparent to-transparent dark:from-purple-400/5",
    icon: "text-purple-500 dark:text-purple-400",
    title:
      "from-purple-600 to-violet-600 dark:from-purple-400 dark:to-violet-400",
  },
};

export function CanvasPanel({
  title,
  subtitle,
  icon,
  children,
  accentColor = "rose",
  onExport,
  onReset,
  defaultExpanded = true,
  className,
}: CanvasPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const accent = accentClasses[accentColor];

  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all",
        "bg-white/70 dark:bg-slate-900/70",
        accent.border,
        accent.glow,
        "shadow-2xl",
        isFullscreen && "fixed inset-4 z-50",
        className,
      )}
    >
      {/* Animated gradient background */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50",
          accent.gradient,
        )}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                            linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-slate-200/50 px-4 py-3 dark:border-slate-700/50 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-inner",
              accent.gradient.replace("from-", "from-").replace("/10", "/20"),
              accent.icon,
            )}
          >
            {icon}
          </div>
          <div>
            <h2
              className={cn(
                "bg-gradient-to-r bg-clip-text font-bold text-lg text-transparent",
                accent.title,
              )}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {onReset && (
            <button
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              onClick={onReset}
              title="Reset"
              type="button"
            >
              <RotateCcw className="size-4" />
            </button>
          )}
          {onExport && (
            <button
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              onClick={onExport}
              title="Export"
              type="button"
            >
              <Download className="size-4" />
            </button>
          )}
          <button
            className="hidden rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 sm:block"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            type="button"
          >
            {isFullscreen ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </button>
          <button
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse" : "Expand"}
            type="button"
          >
            {isExpanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="relative overflow-hidden"
          >
            <div className="p-4 sm:p-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen overlay backdrop */}
      {isFullscreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 -z-10 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsFullscreen(false)}
        />
      )}
    </motion.div>
  );
}
