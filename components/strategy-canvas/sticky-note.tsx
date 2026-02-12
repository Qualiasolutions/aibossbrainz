"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { Check, GripVertical, Pencil, X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { NoteColor, StickyNote as StickyNoteType } from "./types";

// Executive neutral color scheme
const colorClasses: Record<NoteColor, string> = {
	rose: "bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700",
	amber:
		"bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700",
	emerald:
		"bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700",
	blue: "bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700",
	purple:
		"bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700",
	slate:
		"bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700",
};

interface StickyNoteProps {
	note: StickyNoteType;
	onUpdate: (id: string, content: string) => void;
	onDelete: (id: string) => void;
	onDragEnd?: (id: string, x: number, y: number) => void;
	isDraggable?: boolean;
	className?: string;
}

export const StickyNote = memo(function StickyNote({
	note,
	onUpdate,
	onDelete,
	onDragEnd,
	isDraggable = false,
	className,
}: StickyNoteProps) {
	const [isEditing, setIsEditing] = useState(!note.content);
	const [editContent, setEditContent] = useState(note.content);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const dragControls = useDragControls();

	useEffect(() => {
		if (isEditing && textareaRef.current) {
			textareaRef.current.focus();
			textareaRef.current.select();
		}
	}, [isEditing]);

	const handleSave = () => {
		if (editContent.trim()) {
			onUpdate(note.id, editContent.trim());
			setIsEditing(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSave();
		}
		if (e.key === "Escape") {
			setEditContent(note.content);
			setIsEditing(false);
		}
	};

	return (
		<motion.div
			className={cn(
				"group relative rounded-lg border p-3 shadow-sm transition-all",
				"hover:shadow-md",
				colorClasses[note.color],
				isDraggable && "cursor-grab active:cursor-grabbing",
				className,
			)}
			drag={isDraggable}
			dragControls={dragControls}
			dragMomentum={false}
			dragElastic={0.1}
			initial={{ opacity: 0, y: 5 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -5 }}
			whileDrag={{ scale: 1.02, zIndex: 50 }}
			onDragEnd={(_e, info) => {
				if (onDragEnd) {
					onDragEnd(note.id, info.point.x, info.point.y);
				}
			}}
			layout
		>
			{/* Action buttons */}
			<div className="absolute -top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				{!isEditing && (
					<button
						className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
						onClick={() => setIsEditing(true)}
						type="button"
					>
						<Pencil className="size-3" />
					</button>
				)}
				<button
					className="rounded p-1 text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
					onClick={() => onDelete(note.id)}
					type="button"
				>
					<X className="size-3" />
				</button>
			</div>

			{/* Drag handle */}
			{isDraggable && (
				<div
					className="absolute top-1 left-1 cursor-grab opacity-0 transition-opacity group-hover:opacity-40"
					onPointerDown={(e) => dragControls.start(e)}
				>
					<GripVertical className="size-4 text-neutral-400" />
				</div>
			)}

			{/* Content */}
			<AnimatePresence mode="wait">
				{isEditing ? (
					<motion.div
						key="editing"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="flex flex-col gap-2"
					>
						<textarea
							ref={textareaRef}
							className="min-h-[50px] w-full resize-none bg-transparent text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200 dark:placeholder:text-neutral-500"
							placeholder="Add your idea..."
							value={editContent}
							onChange={(e) => setEditContent(e.target.value)}
							onKeyDown={handleKeyDown}
							onBlur={handleSave}
						/>
						<div className="flex justify-end">
							<button
								className="rounded p-1.5 text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
								onClick={handleSave}
								type="button"
							>
								<Check className="size-3.5" />
							</button>
						</div>
					</motion.div>
				) : (
					<motion.p
						key="display"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200"
					>
						{note.content}
					</motion.p>
				)}
			</AnimatePresence>
		</motion.div>
	);
});

// Color picker - simplified
interface ColorPickerProps {
	selected: NoteColor;
	onSelect: (color: NoteColor) => void;
}

export function NoteColorPicker({ selected, onSelect }: ColorPickerProps) {
	const colors: NoteColor[] = ["slate"];

	return (
		<div className="flex gap-1.5">
			{colors.map((color) => (
				<button
					key={color}
					className={cn(
						"size-5 rounded-full border-2 transition-all bg-neutral-200 dark:bg-neutral-600",
						selected === color
							? "border-neutral-800 dark:border-white scale-110"
							: "border-transparent hover:scale-105",
					)}
					onClick={() => onSelect(color)}
					type="button"
				/>
			))}
		</div>
	);
}
