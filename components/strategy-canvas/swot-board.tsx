"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Cloud,
  Download,
  Loader2,
  Plus,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useCsrf } from "@/hooks/use-csrf";
import { cn, generateUUID } from "@/lib/utils";
import { CompactHeader } from "./compact-header";
import { StickyNote } from "./sticky-note";
import type {
  NoteColor,
  StickyNote as StickyNoteType,
  SwotData,
} from "./types";
import { useCanvasPersistence } from "./use-canvas-persistence";

const quadrants = [
  {
    key: "strengths" as const,
    label: "Strengths",
    subtitle: "Internal advantages",
    noteColor: "slate" as NoteColor,
  },
  {
    key: "weaknesses" as const,
    label: "Weaknesses",
    subtitle: "Internal challenges",
    noteColor: "slate" as NoteColor,
  },
  {
    key: "opportunities" as const,
    label: "Opportunities",
    subtitle: "External possibilities",
    noteColor: "slate" as NoteColor,
  },
  {
    key: "threats" as const,
    label: "Threats",
    subtitle: "External risks",
    noteColor: "slate" as NoteColor,
  },
];

const defaultData: SwotData = {
  strengths: [],
  weaknesses: [],
  opportunities: [],
  threats: [],
};

interface SwotBoardProps {
  compact?: boolean;
}

export function SwotBoard({ compact = false }: SwotBoardProps) {
  const { csrfFetch } = useCsrf();
  const { data, setData, isSaving, isLoading, lastSaved } =
    useCanvasPersistence<SwotData>({
      canvasType: "swot",
      defaultData,
      fetchFn: csrfFetch,
    });
  const [hoveredQuadrant, setHoveredQuadrant] = useState<string | null>(null);
  const [expandedQuadrants, setExpandedQuadrants] = useState<Set<string>>(
    new Set(["strengths"]),
  );

  const addNote = (quadrant: keyof SwotData, color: NoteColor) => {
    const newNote: StickyNoteType = {
      id: generateUUID(),
      content: "",
      color,
    };
    setData((prev) => ({
      ...prev,
      [quadrant]: [...prev[quadrant], newNote],
    }));
    // Auto-expand when adding
    setExpandedQuadrants((prev) => new Set([...prev, quadrant]));
  };

  const updateNote = useCallback(
    (quadrant: keyof SwotData, id: string, content: string) => {
      setData((prev) => ({
        ...prev,
        [quadrant]: prev[quadrant].map((note) =>
          note.id === id ? { ...note, content } : note,
        ),
      }));
    },
    [setData],
  );

  const deleteNote = useCallback(
    (quadrant: keyof SwotData, id: string) => {
      setData((prev) => ({
        ...prev,
        [quadrant]: prev[quadrant].filter((note) => note.id !== id),
      }));
    },
    [setData],
  );

  const resetBoard = () => {
    setData(defaultData);
  };

  const exportBoard = async () => {
    // Import PDF libraries dynamically
    const { default: html2canvas } = await import("html2canvas");
    const { default: jsPDF } = await import("jspdf");

    // Create a temporary container for rendering
    const container = document.createElement("div");
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      width: 800px;
      padding: 40px;
      background: white;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    // Build HTML content for PDF
    const date = new Date().toLocaleDateString();
    let html = `
      <div style="margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e5e5e5;">
        <h1 style="margin: 0; font-size: 24px; color: #1a1a1a;">SWOT Analysis</h1>
        <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">Generated on ${date}</p>
      </div>
    `;

    // Add each quadrant
    for (const quadrant of quadrants) {
      const notes = data[quadrant.key];
      html += `
        <div style="margin-bottom: 24px; padding: 16px; border-radius: 8px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${quadrant.label}</h3>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">${quadrant.subtitle}</p>
          <ul style="margin: 0; padding-left: 20px;">
            ${notes.map((note) => `<li style="margin-bottom: 4px; color: #1a1a1a;">${note.content || "(empty)"}</li>`).join("")}
          </ul>
        </div>
      `;
    }

    container.innerHTML = html;
    document.body.appendChild(container);

    // Wait for rendering
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // A4 dimensions in mm
      const pageWidth = 210;
      const pageHeight = 297;
      const marginLeft = 15;
      const marginRight = 15;
      const marginTop = 20;
      const marginBottom = 20;
      const contentWidth = pageWidth - marginLeft - marginRight;

      // Calculate scaled image dimensions
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      const contentHeight = pageHeight - marginTop - marginBottom;

      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");

      let heightLeft = imgHeight;
      let position = marginTop;

      // First page
      pdf.addImage(
        imgData,
        "PNG",
        marginLeft,
        position,
        contentWidth,
        imgHeight,
      );
      heightLeft -= contentHeight;

      // Additional pages
      while (heightLeft > 0) {
        position = marginTop - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(
          imgData,
          "PNG",
          marginLeft,
          position,
          contentWidth,
          imgHeight,
        );
        heightLeft -= contentHeight;
      }

      pdf.save(`swot-analysis-${new Date().toISOString().split("T")[0]}.pdf`);
    } finally {
      document.body.removeChild(container);
    }
  };

  const toggleQuadrant = (key: string) => {
    setExpandedQuadrants((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const totalNotes = Object.values(data).flat().length;

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
          title="SWOT Analysis"
          isLoading={isLoading}
          isSaving={isSaving}
          lastSaved={lastSaved}
          onReset={resetBoard}
          onExport={exportBoard}
        />

        {/* Accordion Sections */}
        <div className="space-y-1">
          {quadrants.map((quadrant) => {
            const notes = data[quadrant.key];
            const isExpanded = expandedQuadrants.has(quadrant.key);

            return (
              <div
                key={quadrant.key}
                className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
              >
                {/* Section Header */}
                <button
                  type="button"
                  onClick={() => toggleQuadrant(quadrant.key)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={cn(
                        "size-3.5 text-neutral-400 transition-transform",
                        !isExpanded && "-rotate-90",
                      )}
                    />
                    <span className="font-medium text-sm text-neutral-900 dark:text-white">
                      {quadrant.label}
                    </span>
                    {notes.length > 0 && (
                      <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {notes.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addNote(quadrant.key, quadrant.noteColor);
                    }}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </button>

                {/* Section Content */}
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
                        {notes.length === 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              addNote(quadrant.key, quadrant.noteColor)
                            }
                            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-200 py-4 text-xs text-neutral-400 transition-colors hover:border-neutral-300 hover:text-neutral-500 dark:border-neutral-700 dark:text-neutral-500 dark:hover:border-neutral-600"
                          >
                            <Plus className="size-3" />
                            Add {quadrant.label.toLowerCase().slice(0, -1)}
                          </button>
                        ) : (
                          <AnimatePresence mode="popLayout">
                            {notes.map((note) => (
                              <motion.div
                                key={note.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                              >
                                <StickyNote
                                  note={note}
                                  onUpdate={(id, content) =>
                                    updateNote(quadrant.key, id, content)
                                  }
                                  onDelete={(id) =>
                                    deleteNote(quadrant.key, id)
                                  }
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
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
            SWOT Analysis
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Strategic assessment of internal and external factors
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
            onClick={resetBoard}
            type="button"
          >
            Reset
          </button>
          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
          <button
            className="flex items-center gap-2 text-sm font-medium text-rose-600 transition-colors hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            onClick={exportBoard}
            type="button"
          >
            <Download className="size-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary line */}
      {totalNotes > 0 && (
        <div className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          {totalNotes} {totalNotes === 1 ? "item" : "items"} captured
        </div>
      )}

      {/* SWOT Grid - Clean Executive Style */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800 sm:grid-cols-2">
        {quadrants.map((quadrant, index) => {
          const notes = data[quadrant.key];
          const isHovered = hoveredQuadrant === quadrant.key;

          return (
            <motion.div
              key={quadrant.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              onHoverStart={() => setHoveredQuadrant(quadrant.key)}
              onHoverEnd={() => setHoveredQuadrant(null)}
              className={cn(
                "group relative min-h-[280px] bg-white p-6 transition-colors dark:bg-neutral-900 sm:min-h-[320px]",
                isHovered && "bg-neutral-50 dark:bg-neutral-900/80",
              )}
            >
              {/* Quadrant Header */}
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">
                    {quadrant.label}
                  </h3>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    {quadrant.subtitle}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg transition-all",
                    "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600",
                    "dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300",
                  )}
                  onClick={() => addNote(quadrant.key, quadrant.noteColor)}
                  title="Add item"
                  type="button"
                >
                  <Plus className="size-4" />
                </motion.button>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {notes.map((note) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <StickyNote
                        note={note}
                        onUpdate={(id, content) =>
                          updateNote(quadrant.key, id, content)
                        }
                        onDelete={(id) => deleteNote(quadrant.key, id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Empty State */}
              {notes.length === 0 && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-lg py-8 text-sm transition-all",
                    "border border-dashed border-neutral-200 dark:border-neutral-700",
                    "text-neutral-400 hover:border-neutral-300 hover:text-neutral-500",
                    "dark:text-neutral-500 dark:hover:border-neutral-600 dark:hover:text-neutral-400",
                  )}
                  onClick={() => addNote(quadrant.key, quadrant.noteColor)}
                  type="button"
                >
                  <Plus className="size-4" />
                  Add {quadrant.label.toLowerCase().slice(0, -1)}
                </motion.button>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
