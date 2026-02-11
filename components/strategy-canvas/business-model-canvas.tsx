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
  BusinessModelData,
  NoteColor,
  StickyNote as StickyNoteType,
} from "./types";
import { useCanvasPersistence } from "./use-canvas-persistence";

const sections = [
  {
    key: "keyPartners" as const,
    label: "Key Partners",
    noteColor: "slate" as NoteColor,
    hint: "Who are our key partners and suppliers?",
  },
  {
    key: "keyActivities" as const,
    label: "Key Activities",
    noteColor: "slate" as NoteColor,
    hint: "What activities does our value proposition require?",
  },
  {
    key: "keyResources" as const,
    label: "Key Resources",
    noteColor: "slate" as NoteColor,
    hint: "What resources does our value proposition require?",
  },
  {
    key: "valuePropositions" as const,
    label: "Value Propositions",
    noteColor: "slate" as NoteColor,
    hint: "What value do we deliver to the customer?",
  },
  {
    key: "customerRelationships" as const,
    label: "Customer Relationships",
    noteColor: "slate" as NoteColor,
    hint: "What relationship does each segment expect?",
  },
  {
    key: "channels" as const,
    label: "Channels",
    noteColor: "slate" as NoteColor,
    hint: "How do we reach our customer segments?",
  },
  {
    key: "customerSegments" as const,
    label: "Customer Segments",
    noteColor: "slate" as NoteColor,
    hint: "For whom are we creating value?",
  },
  {
    key: "costStructure" as const,
    label: "Cost Structure",
    noteColor: "slate" as NoteColor,
    hint: "What are the most important costs?",
  },
  {
    key: "revenueStreams" as const,
    label: "Revenue Streams",
    noteColor: "slate" as NoteColor,
    hint: "For what value are customers willing to pay?",
  },
];

const defaultData: BusinessModelData = {
  keyPartners: [],
  keyActivities: [],
  keyResources: [],
  valuePropositions: [],
  customerRelationships: [],
  channels: [],
  customerSegments: [],
  costStructure: [],
  revenueStreams: [],
};

interface BusinessModelCanvasProps {
  compact?: boolean;
}

export function BusinessModelCanvas({
  compact = false,
}: BusinessModelCanvasProps) {
  const { csrfFetch } = useCsrf();
  const { data, setData, isSaving, isLoading, lastSaved } =
    useCanvasPersistence<BusinessModelData>({
      canvasType: "bmc",
      defaultData,
      fetchFn: csrfFetch,
    });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["valuePropositions"]),
  );

  const addNote = (section: keyof BusinessModelData, color: NoteColor) => {
    const newNote: StickyNoteType = {
      id: generateUUID(),
      content: "",
      color,
    };
    setData((prev) => ({
      ...prev,
      [section]: [...prev[section], newNote],
    }));
    setExpandedSections((prev) => new Set([...prev, section]));
  };

  const updateNote = useCallback(
    (section: keyof BusinessModelData, id: string, content: string) => {
      setData((prev) => ({
        ...prev,
        [section]: prev[section].map((note) =>
          note.id === id ? { ...note, content } : note,
        ),
      }));
    },
    [setData],
  );

  const deleteNote = useCallback(
    (section: keyof BusinessModelData, id: string) => {
      setData((prev) => ({
        ...prev,
        [section]: prev[section].filter((note) => note.id !== id),
      }));
    },
    [setData],
  );

  const resetCanvas = () => {
    setData(defaultData);
  };

  const exportCanvas = () => {
    const exportData = {
      type: "Business Model Canvas",
      exportedAt: new Date().toISOString(),
      sections: Object.fromEntries(
        Object.entries(data).map(([key, notes]) => [
          key,
          notes.map((n: { content: string }) => n.content).filter(Boolean),
        ]),
      ),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-model-canvas-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
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
          title="Business Model Canvas"
          isLoading={isLoading}
          isSaving={isSaving}
          lastSaved={lastSaved}
          onReset={resetCanvas}
          onExport={exportCanvas}
        />

        {/* Accordion Sections */}
        <div className="space-y-1">
          {sections.map((section) => {
            const notes = data[section.key];
            const isExpanded = expandedSections.has(section.key);

            return (
              <div
                key={section.key}
                className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
              >
                {/* Section Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
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
                      {section.label}
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
                      addNote(section.key, section.noteColor);
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
                          <div className="space-y-2">
                            <p className="text-xs text-neutral-400 dark:text-neutral-500">
                              {section.hint}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                addNote(section.key, section.noteColor)
                              }
                              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-200 py-3 text-xs text-neutral-400 transition-colors hover:border-neutral-300 hover:text-neutral-500 dark:border-neutral-700 dark:text-neutral-500 dark:hover:border-neutral-600"
                            >
                              <Plus className="size-3" />
                              Add
                            </button>
                          </div>
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
                                    updateNote(section.key, id, content)
                                  }
                                  onDelete={(id) => deleteNote(section.key, id)}
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
            Business Model Canvas
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Nine building blocks of your business model
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
            onClick={resetCanvas}
            type="button"
          >
            Reset
          </button>
          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
          <button
            className="flex items-center gap-2 text-sm font-medium text-rose-600 transition-colors hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            onClick={exportCanvas}
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
          {totalNotes} {totalNotes === 1 ? "item" : "items"} across 9 building
          blocks
        </div>
      )}

      {/* BMC Grid - Executive Layout */}
      <div className="grid gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800">
        {/* Top Row - 5 columns */}
        <div className="grid grid-cols-2 gap-px lg:grid-cols-5">
          {/* Key Partners */}
          <BMCSection
            section={sections[0]}
            notes={data.keyPartners}
            onAdd={(color) => addNote("keyPartners", color)}
            onUpdate={(id, content) => updateNote("keyPartners", id, content)}
            onDelete={(id) => deleteNote("keyPartners", id)}
            className="lg:row-span-2"
          />

          {/* Key Activities + Key Resources */}
          <div className="flex flex-col gap-px">
            <BMCSection
              section={sections[1]}
              notes={data.keyActivities}
              onAdd={(color) => addNote("keyActivities", color)}
              onUpdate={(id, content) =>
                updateNote("keyActivities", id, content)
              }
              onDelete={(id) => deleteNote("keyActivities", id)}
              compact
            />
            <BMCSection
              section={sections[2]}
              notes={data.keyResources}
              onAdd={(color) => addNote("keyResources", color)}
              onUpdate={(id, content) =>
                updateNote("keyResources", id, content)
              }
              onDelete={(id) => deleteNote("keyResources", id)}
              compact
            />
          </div>

          {/* Value Propositions */}
          <BMCSection
            section={sections[3]}
            notes={data.valuePropositions}
            onAdd={(color) => addNote("valuePropositions", color)}
            onUpdate={(id, content) =>
              updateNote("valuePropositions", id, content)
            }
            onDelete={(id) => deleteNote("valuePropositions", id)}
            className="lg:row-span-2"
          />

          {/* Customer Relationships + Channels */}
          <div className="flex flex-col gap-px">
            <BMCSection
              section={sections[4]}
              notes={data.customerRelationships}
              onAdd={(color) => addNote("customerRelationships", color)}
              onUpdate={(id, content) =>
                updateNote("customerRelationships", id, content)
              }
              onDelete={(id) => deleteNote("customerRelationships", id)}
              compact
            />
            <BMCSection
              section={sections[5]}
              notes={data.channels}
              onAdd={(color) => addNote("channels", color)}
              onUpdate={(id, content) => updateNote("channels", id, content)}
              onDelete={(id) => deleteNote("channels", id)}
              compact
            />
          </div>

          {/* Customer Segments */}
          <BMCSection
            section={sections[6]}
            notes={data.customerSegments}
            onAdd={(color) => addNote("customerSegments", color)}
            onUpdate={(id, content) =>
              updateNote("customerSegments", id, content)
            }
            onDelete={(id) => deleteNote("customerSegments", id)}
            className="lg:row-span-2"
          />
        </div>

        {/* Bottom Row - Cost Structure + Revenue Streams */}
        <div className="grid grid-cols-1 gap-px sm:grid-cols-2">
          <BMCSection
            section={sections[7]}
            notes={data.costStructure}
            onAdd={(color) => addNote("costStructure", color)}
            onUpdate={(id, content) => updateNote("costStructure", id, content)}
            onDelete={(id) => deleteNote("costStructure", id)}
            horizontal
          />
          <BMCSection
            section={sections[8]}
            notes={data.revenueStreams}
            onAdd={(color) => addNote("revenueStreams", color)}
            onUpdate={(id, content) =>
              updateNote("revenueStreams", id, content)
            }
            onDelete={(id) => deleteNote("revenueStreams", id)}
            horizontal
          />
        </div>
      </div>
    </motion.div>
  );
}

// Clean BMC Section Component
interface BMCSectionProps {
  section: (typeof sections)[number];
  notes: StickyNoteType[];
  onAdd: (color: NoteColor) => void;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
  horizontal?: boolean;
  className?: string;
}

function BMCSection({
  section,
  notes,
  onAdd,
  onUpdate,
  onDelete,
  compact = false,
  horizontal = false,
  className,
}: BMCSectionProps) {
  return (
    <div
      className={cn(
        "group bg-white p-5 transition-colors hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-900/80",
        compact ? "min-h-[140px]" : "min-h-[200px]",
        className,
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">
            {section.label}
          </h3>
          {notes.length === 0 && (
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              {section.hint}
            </p>
          )}
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "flex size-7 items-center justify-center rounded-md transition-all",
            "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600",
            "dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300",
          )}
          onClick={() => onAdd(section.noteColor)}
          title="Add item"
          type="button"
        >
          <Plus className="size-3.5" />
        </motion.button>
      </div>

      {/* Notes */}
      <div
        className={cn(
          "gap-2",
          horizontal ? "flex flex-wrap" : "grid grid-cols-1",
        )}
      >
        <AnimatePresence mode="popLayout">
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={horizontal ? "flex-shrink-0" : ""}
            >
              <StickyNote
                note={note}
                onUpdate={(id, content) => onUpdate(id, content)}
                onDelete={(id) => onDelete(id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {notes.length === 0 && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-md py-4 text-xs font-medium transition-all",
            "border border-dashed border-neutral-200 dark:border-neutral-700",
            "text-neutral-400 hover:border-neutral-300 hover:text-neutral-500",
            "dark:text-neutral-500 dark:hover:border-neutral-600 dark:hover:text-neutral-400",
          )}
          onClick={() => onAdd(section.noteColor)}
          type="button"
        >
          <Plus className="size-3" />
          Add
        </motion.button>
      )}
    </div>
  );
}
