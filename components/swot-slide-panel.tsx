"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Expand,
  FileSpreadsheet,
  LayoutGrid,
  Lightbulb,
  Loader2,
  Map,
  Target,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import type { CanvasType } from "@/components/strategy-canvas/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Lazy load strategy canvas components to reduce initial bundle (~200KB savings)
const CanvasLoader = () => (
  <div className="flex h-32 items-center justify-center">
    <Loader2 className="size-6 animate-spin text-muted-foreground" />
  </div>
);

const SwotBoard = dynamic(
  () =>
    import("@/components/strategy-canvas/swot-board").then(
      (mod) => mod.SwotBoard,
    ),
  { loading: CanvasLoader, ssr: false },
);

const BusinessModelCanvas = dynamic(
  () =>
    import("@/components/strategy-canvas/business-model-canvas").then(
      (mod) => mod.BusinessModelCanvas,
    ),
  { loading: CanvasLoader, ssr: false },
);

const CustomerJourney = dynamic(
  () =>
    import("@/components/strategy-canvas/customer-journey").then(
      (mod) => mod.CustomerJourney,
    ),
  { loading: CanvasLoader, ssr: false },
);

const BrainstormBoard = dynamic(
  () =>
    import("@/components/strategy-canvas/brainstorm-board").then(
      (mod) => mod.BrainstormBoard,
    ),
  { loading: CanvasLoader, ssr: false },
);

interface SwotSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const canvasTabs: {
  key: CanvasType;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "swot",
    label: "SWOT",
    shortLabel: "SWOT",
    icon: <Target className="size-4" />,
  },
  {
    key: "bmc",
    label: "Business Model",
    shortLabel: "BMC",
    icon: <FileSpreadsheet className="size-4" />,
  },
  {
    key: "journey",
    label: "Journey",
    shortLabel: "Journey",
    icon: <Map className="size-4" />,
  },
  {
    key: "brainstorm",
    label: "Ideas",
    shortLabel: "Ideas",
    icon: <Lightbulb className="size-4" />,
  },
];

export function SwotSlidePanel({ isOpen, onClose }: SwotSlidePanelProps) {
  const [activeCanvas, setActiveCanvas] = useState<CanvasType>("swot");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 380 }}
          exit={{ width: 0 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 40,
          }}
          style={{ width: 380 }}
          className="h-full flex-shrink-0 overflow-hidden border-l border-border bg-background"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                <LayoutGrid className="size-3.5 text-primary" />
              </div>
              <h2 className="font-semibold text-sm text-foreground">
                Strategy Canvas
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                href="/strategy-canvas"
                target="_blank"
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <Expand className="size-3" />
                <span>Expand</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="size-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
                <span className="sr-only">Close panel</span>
              </Button>
            </div>
          </div>

          {/* Tabs - 4 Column Grid */}
          <div className="border-b border-border px-2 py-2">
            <div className="grid grid-cols-4 gap-1">
              {canvasTabs.map((tab) => {
                const isActive = activeCanvas === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveCanvas(tab.key)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-center transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "transition-transform",
                        isActive && "scale-110",
                      )}
                    >
                      {tab.icon}
                    </span>
                    <span className="text-[10px] font-medium leading-tight">
                      {tab.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="h-[calc(100%-110px)] overflow-y-auto p-3">
            <AnimatePresence mode="wait">
              {activeCanvas === "swot" && (
                <motion.div
                  key="swot"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <SwotBoard compact />
                </motion.div>
              )}
              {activeCanvas === "bmc" && (
                <motion.div
                  key="bmc"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <BusinessModelCanvas compact />
                </motion.div>
              )}
              {activeCanvas === "journey" && (
                <motion.div
                  key="journey"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <CustomerJourney compact />
                </motion.div>
              )}
              {activeCanvas === "brainstorm" && (
                <motion.div
                  key="brainstorm"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <BrainstormBoard compact />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
