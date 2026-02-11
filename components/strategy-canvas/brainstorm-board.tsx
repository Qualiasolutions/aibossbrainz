"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Cloud,
  Download,
  Loader2,
  Plus,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useCsrf } from "@/hooks/use-csrf";
import { cn, generateUUID } from "@/lib/utils";
import { CompactHeader } from "./compact-header";
import { StickyNote } from "./sticky-note";
import type { NoteColor, StickyNote as StickyNoteType } from "./types";
import { useCanvasPersistence } from "./use-canvas-persistence";

interface BrainstormData {
  notes: StickyNoteType[];
}

const defaultBrainstormData: BrainstormData = {
  notes: [],
};

const categories = [
  { label: "Ideas", color: "slate" as NoteColor },
  { label: "Questions", color: "slate" as NoteColor },
  { label: "Actions", color: "slate" as NoteColor },
  { label: "Concerns", color: "slate" as NoteColor },
  { label: "Resources", color: "slate" as NoteColor },
];

interface BrainstormBoardProps {
  compact?: boolean;
}

export function BrainstormBoard({ compact = false }: BrainstormBoardProps) {
  const { csrfFetch } = useCsrf();
  const { data, setData, isSaving, isLoading, lastSaved } =
    useCanvasPersistence<BrainstormData>({
      canvasType: "brainstorm",
      defaultData: defaultBrainstormData,
      fetchFn: csrfFetch,
    });
  const notes = data.notes || [];
  const setNotes = (
    updater: StickyNoteType[] | ((prev: StickyNoteType[]) => StickyNoteType[]),
  ) => {
    setData((prev) => ({
      ...prev,
      notes:
        typeof updater === "function" ? updater(prev.notes || []) : updater,
    }));
  };

  const [selectedCategory, setSelectedCategory] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addNote = () => {
    const newNote: StickyNoteType = {
      id: generateUUID(),
      content: "",
      color: categories[selectedCategory].color,
      x: Math.random() * 60 + 10,
      y: Math.random() * 40 + 10,
      category: categories[selectedCategory].label,
    };
    setNotes((prev) => [...prev, newNote]);
  };

  const updateNote = useCallback(
    (id: string, content: string) => {
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? { ...note, content } : note)),
      );
    },
    [setData],
  );

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((note) => note.id !== id));
    },
    [setData],
  );

  const updateNotePosition = (id: string, x: number, y: number) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const relX = ((x - rect.left) / rect.width) * 100;
    const relY = ((y - rect.top) / rect.height) * 100;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? {
              ...note,
              x: Math.max(0, Math.min(85, relX)),
              y: Math.max(0, Math.min(85, relY)),
            }
          : note,
      ),
    );
  };

  const shuffleNotes = () => {
    setNotes((prev) =>
      prev.map((note) => ({
        ...note,
        x: Math.random() * 70 + 5,
        y: Math.random() * 60 + 5,
      })),
    );
  };

  const clearNotes = () => {
    setNotes([]);
  };

  const resetBoard = () => {
    clearNotes();
    setSelectedCategory(0);
  };

  const exportBoard = () => {
    const exportData = {
      type: "Brainstorming Board",
      exportedAt: new Date().toISOString(),
      notes: notes.map((n) => ({
        content: n.content,
        category: n.category ?? "Uncategorized",
      })),
      byCategory: categories.map((cat) => ({
        category: cat.label,
        notes: notes
          .filter((n) => n.category === cat.label)
          .map((n) => n.content)
          .filter(Boolean),
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brainstorm-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Compact Layout for Side Panel
  if (compact) {
    const groupedNotes = categories
      .map((cat) => ({
        category: cat.label,
        notes: notes.filter((n) => n.category === cat.label),
      }))
      .filter((group) => group.notes.length > 0);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        <CompactHeader
          title="Brainstorming"
          isLoading={isLoading}
          isSaving={isSaving}
          lastSaved={lastSaved}
          onReset={resetBoard}
          onExport={exportBoard}
        />

        {/* Quick Add */}
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900">
          <button
            className="flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-700"
            onClick={addNote}
            type="button"
          >
            <Plus className="size-3" />
            Add
          </button>
          <select
            className="flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-700 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(Number(e.target.value))}
          >
            {categories.map((cat, idx) => (
              <option key={cat.label} value={idx}>
                {cat.label}
              </option>
            ))}
          </select>
          <button
            className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            onClick={clearNotes}
            title="Clear all"
            type="button"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>

        {/* Notes List by Category */}
        <div className="space-y-3">
          {groupedNotes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 py-8 text-center dark:border-neutral-800 dark:bg-neutral-900/50">
              <p className="mb-1 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Start Brainstorming
              </p>
              <p className="mb-4 text-xs text-neutral-400 dark:text-neutral-500">
                Click "Add" to capture your ideas
              </p>
              <button
                className="mx-auto flex items-center gap-1.5 rounded-md bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-700"
                onClick={addNote}
                type="button"
              >
                <Plus className="size-3" />
                Add Your First Idea
              </button>
            </div>
          ) : (
            groupedNotes.map((group) => (
              <div key={group.category}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {group.category}
                  </span>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    {group.notes.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <AnimatePresence mode="popLayout">
                    {group.notes.map((note) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="group/item flex items-start justify-between gap-2 rounded-md border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900"
                      >
                        {note.content ? (
                          <span className="flex-1 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                            {note.content}
                          </span>
                        ) : (
                          <input
                            className="flex-1 bg-transparent text-xs leading-relaxed text-neutral-700 outline-none placeholder:text-neutral-400 dark:text-neutral-300"
                            placeholder="Type your idea..."
                            onBlur={(e) => {
                              if (!e.target.value.trim()) {
                                deleteNote(note.id);
                              }
                            }}
                            onChange={(e) =>
                              updateNote(note.id, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                              if (e.key === "Escape") {
                                deleteNote(note.id);
                              }
                            }}
                          />
                        )}
                        <button
                          className="flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-neutral-100 group-hover/item:opacity-100 dark:hover:bg-neutral-800"
                          onClick={() => deleteNote(note.id)}
                          type="button"
                        >
                          <X className="size-3 text-neutral-400" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {notes.length > 0 && (
          <div className="pt-2 text-center text-[10px] text-neutral-400 dark:text-neutral-500">
            {notes.length} idea{notes.length !== 1 && "s"} captured
          </div>
        )}
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
            Brainstorming
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Capture and organize ideas freely
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

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        {/* Add new note section */}
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            onClick={addNote}
            type="button"
          >
            <Plus className="size-4" />
            Add Idea
          </button>
          <div className="hidden h-6 w-px bg-neutral-200 dark:bg-neutral-700 sm:block" />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Category:
            </span>
            <select
              className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(Number(e.target.value))}
            >
              {categories.map((cat, idx) => (
                <option key={cat.label} value={idx}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            onClick={shuffleNotes}
            title="Shuffle notes"
            type="button"
          >
            <Shuffle className="size-4" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-rose-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-rose-400"
            onClick={clearNotes}
            title="Clear all"
            type="button"
          >
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={cn(
          "relative min-h-[450px] overflow-hidden rounded-xl border sm:min-h-[550px]",
          "border-neutral-200 dark:border-neutral-800",
          "bg-neutral-50 dark:bg-neutral-900/50",
        )}
        style={{
          backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      >
        {/* Hint */}
        <div className="absolute top-4 right-4 text-xs text-neutral-300 dark:text-neutral-700">
          Drag to organize
        </div>

        {/* Notes */}
        <AnimatePresence>
          {notes.map((note) => (
            <motion.div
              key={note.id}
              className="absolute"
              style={{
                left: `${note.x ?? 10}%`,
                top: `${note.y ?? 10}%`,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <StickyNote
                note={note}
                onUpdate={updateNote}
                onDelete={deleteNote}
                onDragEnd={updateNotePosition}
                isDraggable
                className="w-40 sm:w-48"
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {notes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h3 className="mb-2 font-semibold text-lg text-neutral-700 dark:text-neutral-300">
                Start Brainstorming
              </h3>
              <p className="mb-6 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
                Click "Add Idea" to create notes and drag them to organize your
                thoughts
              </p>
              <button
                className="flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700"
                onClick={addNote}
                type="button"
              >
                <Plus className="size-4" />
                Add Your First Idea
              </button>
            </motion.div>
          </div>
        )}
      </div>

      {/* Summary footer */}
      {notes.length > 0 && (
        <div className="mt-6 flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
          <span>
            {notes.length} idea{notes.length !== 1 && "s"} captured
          </span>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => {
              const count = notes.filter(
                (n) => n.category === cat.label,
              ).length;
              if (count === 0) return null;
              return (
                <span
                  key={cat.label}
                  className="text-neutral-400 dark:text-neutral-500"
                >
                  {count} {cat.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
