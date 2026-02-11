"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Cloud,
  Download,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { useState } from "react";
import { useCsrf } from "@/hooks/use-csrf";
import { cn, generateUUID } from "@/lib/utils";
import { CompactHeader } from "./compact-header";
import type { JourneyStage, JourneyTouchpoint } from "./types";
import { useCanvasPersistence } from "./use-canvas-persistence";

interface JourneyData {
  touchpoints: JourneyTouchpoint[];
}

const defaultJourneyData: JourneyData = {
  touchpoints: [],
};

const stages: {
  key: JourneyStage;
  label: string;
  description: string;
}[] = [
  {
    key: "awareness",
    label: "Awareness",
    description: "Discovery",
  },
  {
    key: "consideration",
    label: "Consideration",
    description: "Research",
  },
  {
    key: "decision",
    label: "Decision",
    description: "Evaluation",
  },
  {
    key: "purchase",
    label: "Purchase",
    description: "Conversion",
  },
  {
    key: "retention",
    label: "Retention",
    description: "Loyalty",
  },
  {
    key: "advocacy",
    label: "Advocacy",
    description: "Referrals",
  },
];

const touchpointTypes = [
  {
    type: "touchpoint" as const,
    label: "Touchpoint",
  },
  {
    type: "pain" as const,
    label: "Pain Point",
  },
  {
    type: "opportunity" as const,
    label: "Opportunity",
  },
];

interface CustomerJourneyProps {
  compact?: boolean;
}

export function CustomerJourney({ compact = false }: CustomerJourneyProps) {
  const { csrfFetch } = useCsrf();
  const { data, setData, isSaving, isLoading, lastSaved } =
    useCanvasPersistence<JourneyData>({
      canvasType: "journey",
      defaultData: defaultJourneyData,
      fetchFn: csrfFetch,
    });
  const touchpoints = data.touchpoints || [];
  const setTouchpoints = (
    updater:
      | JourneyTouchpoint[]
      | ((prev: JourneyTouchpoint[]) => JourneyTouchpoint[]),
  ) => {
    setData((prev) => ({
      ...prev,
      touchpoints:
        typeof updater === "function"
          ? updater(prev.touchpoints || [])
          : updater,
    }));
  };

  const [addingTo, setAddingTo] = useState<JourneyStage | null>(null);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] =
    useState<JourneyTouchpoint["type"]>("touchpoint");
  const [expandedStages, setExpandedStages] = useState<Set<string>>(
    new Set(["awareness"]),
  );

  const addTouchpoint = (stage: JourneyStage) => {
    if (!newContent.trim()) return;

    const newTouchpoint: JourneyTouchpoint = {
      id: generateUUID(),
      stage,
      content: newContent.trim(),
      type: newType,
    };

    setTouchpoints((prev) => [...prev, newTouchpoint]);
    setNewContent("");
    setAddingTo(null);
    setNewType("touchpoint");
  };

  const deleteTouchpoint = (id: string) => {
    setTouchpoints((prev) => prev.filter((tp) => tp.id !== id));
  };

  const getTouchpointsForStage = (stage: JourneyStage) => {
    return touchpoints.filter((tp) => tp.stage === stage);
  };

  const resetJourney = () => {
    setTouchpoints([]);
  };

  const exportJourney = () => {
    const exportData = {
      type: "Customer Journey Map",
      exportedAt: new Date().toISOString(),
      stages: stages.map((stage) => ({
        name: stage.label,
        touchpoints: getTouchpointsForStage(stage.key).map((tp) => ({
          content: tp.content,
          type: tp.type,
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-journey-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleStage = (key: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const totalTouchpoints = touchpoints.length;
  const painPoints = touchpoints.filter((tp) => tp.type === "pain").length;
  const opportunities = touchpoints.filter(
    (tp) => tp.type === "opportunity",
  ).length;

  // Compact Layout for Side Panel
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        <CompactHeader
          title="Customer Journey"
          isLoading={isLoading}
          isSaving={isSaving}
          lastSaved={lastSaved}
          onReset={resetJourney}
          onExport={exportJourney}
        />

        {/* Vertical Timeline */}
        <div className="space-y-1">
          {stages.map((stage, index) => {
            const stageTouchpoints = getTouchpointsForStage(stage.key);
            const isExpanded = expandedStages.has(stage.key);
            const isAdding = addingTo === stage.key;

            return (
              <div
                key={stage.key}
                className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
              >
                {/* Stage Header */}
                <button
                  type="button"
                  onClick={() => toggleStage(stage.key)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-5 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                      {index + 1}
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-3.5 text-neutral-400 transition-transform",
                        !isExpanded && "-rotate-90",
                      )}
                    />
                    <span className="font-medium text-sm text-neutral-900 dark:text-white">
                      {stage.label}
                    </span>
                    {stageTouchpoints.length > 0 && (
                      <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {stageTouchpoints.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingTo(stage.key);
                      setExpandedStages(
                        (prev) => new Set([...prev, stage.key]),
                      );
                    }}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </button>

                {/* Stage Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 border-t border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                        {/* Touchpoints */}
                        {stageTouchpoints.length === 0 && !isAdding && (
                          <button
                            type="button"
                            onClick={() => setAddingTo(stage.key)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-200 py-4 text-xs text-neutral-400 transition-colors hover:border-neutral-300 hover:text-neutral-500 dark:border-neutral-700 dark:text-neutral-500 dark:hover:border-neutral-600"
                          >
                            <Plus className="size-3" />
                            Add touchpoint
                          </button>
                        )}

                        <AnimatePresence mode="popLayout">
                          {stageTouchpoints.map((tp) => (
                            <motion.div
                              key={tp.id}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className={cn(
                                "group/item flex items-start justify-between gap-2 rounded-md border p-2 text-xs",
                                tp.type === "touchpoint" &&
                                  "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800",
                                tp.type === "pain" &&
                                  "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-900/20",
                                tp.type === "opportunity" &&
                                  "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20",
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <span
                                  className={cn(
                                    "mt-0.5 size-1.5 flex-shrink-0 rounded-full",
                                    tp.type === "touchpoint" &&
                                      "bg-neutral-400",
                                    tp.type === "pain" && "bg-rose-500",
                                    tp.type === "opportunity" && "bg-amber-500",
                                  )}
                                />
                                <span
                                  className={cn(
                                    "leading-relaxed",
                                    tp.type === "touchpoint" &&
                                      "text-neutral-700 dark:text-neutral-300",
                                    tp.type === "pain" &&
                                      "text-rose-700 dark:text-rose-300",
                                    tp.type === "opportunity" &&
                                      "text-amber-700 dark:text-amber-300",
                                  )}
                                >
                                  {tp.content}
                                </span>
                              </div>
                              <button
                                className="flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-black/5 group-hover/item:opacity-100"
                                onClick={() => deleteTouchpoint(tp.id)}
                                type="button"
                              >
                                <X className="size-3 text-neutral-400" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {/* Add Form */}
                        {isAdding && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2"
                          >
                            <input
                              className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-xs focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                              placeholder="Describe..."
                              value={newContent}
                              onChange={(e) => setNewContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  addTouchpoint(stage.key);
                                }
                                if (e.key === "Escape") {
                                  setAddingTo(null);
                                  setNewContent("");
                                }
                              }}
                            />
                            <div className="flex gap-1">
                              {touchpointTypes.map((type) => (
                                <button
                                  key={type.type}
                                  className={cn(
                                    "flex-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-all",
                                    newType === type.type
                                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400",
                                  )}
                                  onClick={() => setNewType(type.type)}
                                  type="button"
                                >
                                  {type.label}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                className="flex-1 rounded-md bg-rose-600 py-1.5 text-[10px] font-medium text-white hover:bg-rose-700"
                                onClick={() => addTouchpoint(stage.key)}
                                type="button"
                              >
                                Add
                              </button>
                              <button
                                className="flex-1 rounded-md bg-neutral-100 py-1.5 text-[10px] font-medium text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                                onClick={() => {
                                  setAddingTo(null);
                                  setNewContent("");
                                }}
                                type="button"
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-[10px] text-neutral-400 dark:text-neutral-500">
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-neutral-400" />
            <span>Touchpoint</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-rose-500" />
            <span>Pain Point</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-amber-500" />
            <span>Opportunity</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Full Layout (unchanged)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Executive Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            Customer Journey
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Map the complete customer experience across touchpoints
          </p>
        </div>

        {/* Action Buttons with Save Status */}
        <div className="flex items-center gap-3">
          {/* Save Status */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
            {isLoading ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                <span>Loading...</span>
              </>
            ) : isSaving ? (
              <>
                <Cloud className="size-3" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <Check className="size-3 text-emerald-500" />
                <span>Saved</span>
              </>
            ) : null}
          </div>
          {lastSaved && (
            <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
          )}
          <button
            className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            onClick={resetJourney}
            type="button"
          >
            Reset
          </button>
          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
          <button
            className="flex items-center gap-2 text-sm font-medium text-rose-600 transition-colors hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            onClick={exportJourney}
            type="button"
          >
            <Download className="size-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary */}
      {totalTouchpoints > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
          <span>{totalTouchpoints} touchpoints</span>
          {painPoints > 0 && (
            <span className="text-neutral-400">
              {painPoints} pain {painPoints === 1 ? "point" : "points"}
            </span>
          )}
          {opportunities > 0 && (
            <span className="text-neutral-400">
              {opportunities}{" "}
              {opportunities === 1 ? "opportunity" : "opportunities"}
            </span>
          )}
        </div>
      )}

      {/* Journey Timeline */}
      <div className="relative">
        {/* Progress line - Desktop */}
        <div className="absolute top-6 left-8 right-8 hidden h-px bg-neutral-200 dark:bg-neutral-800 lg:block" />

        {/* Stages Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3">
          {stages.map((stage, index) => {
            const stageTouchpoints = getTouchpointsForStage(stage.key);

            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative"
              >
                {/* Stage Header */}
                <div className="relative z-10 mb-4 text-center lg:mb-6">
                  <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm font-semibold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">
                    {stage.label}
                  </h3>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    {stage.description}
                  </p>
                </div>

                {/* Stage Content */}
                <div className="min-h-[180px] rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-900/80">
                  {/* Touchpoints */}
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {stageTouchpoints.map((tp) => (
                        <motion.div
                          key={tp.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className={cn(
                            "group/item relative rounded-lg border p-3 text-xs",
                            tp.type === "touchpoint" &&
                              "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800",
                            tp.type === "pain" &&
                              "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-900/20",
                            tp.type === "opportunity" &&
                              "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                "leading-relaxed",
                                tp.type === "touchpoint" &&
                                  "text-neutral-700 dark:text-neutral-300",
                                tp.type === "pain" &&
                                  "text-rose-700 dark:text-rose-300",
                                tp.type === "opportunity" &&
                                  "text-amber-700 dark:text-amber-300",
                              )}
                            >
                              {tp.content}
                            </span>
                            <button
                              className="flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-black/5 group-hover/item:opacity-100"
                              onClick={() => deleteTouchpoint(tp.id)}
                              type="button"
                            >
                              <X className="size-3 text-neutral-400" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Add form or button */}
                  {addingTo === stage.key ? (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 space-y-2"
                    >
                      <input
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
                        placeholder="Describe..."
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            addTouchpoint(stage.key);
                          }
                          if (e.key === "Escape") {
                            setAddingTo(null);
                            setNewContent("");
                          }
                        }}
                      />
                      <div className="flex gap-1">
                        {touchpointTypes.map((type) => (
                          <button
                            key={type.type}
                            className={cn(
                              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
                              newType === type.type
                                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400",
                            )}
                            onClick={() => setNewType(type.type)}
                            type="button"
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="flex-1 rounded-lg bg-rose-600 py-2 text-xs font-medium text-white hover:bg-rose-700"
                          onClick={() => addTouchpoint(stage.key)}
                          type="button"
                        >
                          Add
                        </button>
                        <button
                          className="flex-1 rounded-lg bg-neutral-100 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                          onClick={() => {
                            setAddingTo(null);
                            setNewContent("");
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <button
                      className={cn(
                        "mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-3 text-xs font-medium transition-all",
                        "border border-dashed border-neutral-200 dark:border-neutral-700",
                        "text-neutral-400 hover:border-neutral-300 hover:text-neutral-500",
                        "dark:text-neutral-500 dark:hover:border-neutral-600 dark:hover:text-neutral-400",
                      )}
                      onClick={() => setAddingTo(stage.key)}
                      type="button"
                    >
                      <Plus className="size-3.5" />
                      Add
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-500 dark:text-neutral-400"
      >
        <div className="flex items-center gap-2">
          <div className="size-3 rounded border border-neutral-300 bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800" />
          <span>Touchpoint</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded border border-rose-300 bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30" />
          <span>Pain Point</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded border border-amber-300 bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30" />
          <span>Opportunity</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
