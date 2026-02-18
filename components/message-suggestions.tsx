"use client";

import {
	Check,
	Lightbulb,
	MessageSquare,
	Sparkles,
	Target,
} from "lucide-react";
import { useCallback, useState } from "react";
import type {
	Suggestion,
	SuggestionCategory,
} from "@/lib/ai/suggestions-config";
import type { BotType } from "@/lib/bot-personalities";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<SuggestionCategory, typeof Lightbulb> = {
	"deep-dive": Lightbulb,
	pivot: MessageSquare,
	action: Target,
	clarify: Sparkles,
};

// Executive-themed button styles (no hover effects)
const EXECUTIVE_BUTTON_STYLES: Record<BotType, string> = {
	alexandria:
		"border-rose-200/60 bg-gradient-to-br from-white to-rose-50/50 dark:border-rose-800/40 dark:from-stone-900 dark:to-rose-950/30",
	kim: "border-red-200/60 bg-gradient-to-br from-white to-red-50/50 dark:border-red-800/40 dark:from-stone-900 dark:to-red-950/30",
	collaborative:
		"border-rose-200/60 bg-gradient-to-br from-white via-rose-50/30 to-red-50/50 dark:border-rose-800/40 dark:from-stone-900 dark:via-rose-950/20 dark:to-red-950/30",
};

// Executive-themed accent colors
const EXECUTIVE_ACCENT_STYLES: Record<BotType, string> = {
	alexandria: "text-rose-600 dark:text-rose-400",
	kim: "text-red-600 dark:text-red-400",
	collaborative: "text-rose-600 dark:text-rose-400",
};

// Executive icon background
const EXECUTIVE_ICON_BG: Record<BotType, string> = {
	alexandria: "bg-rose-100 dark:bg-rose-900/40",
	kim: "bg-red-100 dark:bg-red-900/40",
	collaborative: "bg-rose-100 dark:bg-rose-900/40",
};

type MessageSuggestionsProps = {
	suggestions: Suggestion[];
	onSelect: (texts: string[]) => void;
	isVisible: boolean;
	botType?: BotType;
};

export function MessageSuggestions({
	suggestions,
	onSelect,
	isVisible,
	botType = "collaborative",
}: MessageSuggestionsProps) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const toggleSuggestion = useCallback(
		(suggestion: Suggestion) => {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (next.has(suggestion.id)) {
					next.delete(suggestion.id);
				} else {
					next.add(suggestion.id);
				}
				// Build ordered list of selected texts based on original suggestion order
				const selectedTexts = suggestions
					.filter((s) => next.has(s.id))
					.map((s) => s.text);
				onSelect(selectedTexts);
				return next;
			});
		},
		[suggestions, onSelect],
	);

	if (!isVisible || suggestions.length === 0) {
		return null;
	}

	const handleClick = (suggestion: Suggestion, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		toggleSuggestion(suggestion);
	};

	const handleKeyDown = (e: React.KeyboardEvent, suggestion: Suggestion) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			e.stopPropagation();
			toggleSuggestion(suggestion);
		}
	};

	return (
		<div className="mt-5 assistant-enter">
			{/* Header */}
			<div className="mb-2.5 flex items-center gap-2">
				<div
					className={cn(
						"flex size-5 items-center justify-center rounded-md",
						EXECUTIVE_ICON_BG[botType],
					)}
				>
					<Sparkles
						className={cn("size-3", EXECUTIVE_ACCENT_STYLES[botType])}
					/>
				</div>
				<span className="font-medium text-xs text-stone-500 dark:text-stone-400">
					Continue the conversation
				</span>
				{selectedIds.size > 0 && (
					<span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-medium text-[10px] text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
						{selectedIds.size} selected
					</span>
				)}
			</div>

			{/* Suggestions - responsive flex wrap layout */}
			<div className="flex flex-wrap gap-2">
				{suggestions.map((suggestion) => {
					const Icon = CATEGORY_ICONS[suggestion.category];
					const isSelected = selectedIds.has(suggestion.id);

					return (
						<button
							aria-label={`${isSelected ? "Deselect" : "Select"}: ${suggestion.text}`}
							aria-pressed={isSelected}
							className={cn(
								"suggestion-chip",
								"group relative flex items-start gap-2 rounded-xl border px-3 py-2",
								"text-sm transition-colors",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-2",
								"shadow-sm",
								// Responsive width: full on mobile, auto-fit on larger screens
								"w-full sm:w-auto sm:max-w-[calc(50%-0.25rem)] sm:flex-1 sm:min-w-[200px]",
								isSelected
									? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
									: EXECUTIVE_BUTTON_STYLES[botType],
							)}
							key={suggestion.id}
							onClick={(e) => handleClick(suggestion, e)}
							onKeyDown={(e) => handleKeyDown(e, suggestion)}
							type="button"
						>
							{/* Icon */}
							<span
								className={cn(
									"flex size-6 shrink-0 items-center justify-center rounded-lg transition-colors",
									isSelected
										? "bg-emerald-100 dark:bg-emerald-900/50"
										: EXECUTIVE_ICON_BG[botType],
								)}
							>
								<span className="flex items-center justify-center">
									{isSelected ? (
										<Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
									) : (
										<Icon
											className={cn(
												"size-3.5",
												EXECUTIVE_ACCENT_STYLES[botType],
											)}
										/>
									)}
								</span>
							</span>

							{/* Text */}
							<span
								className={cn(
									"text-left font-medium text-stone-700 leading-snug dark:text-stone-200",
									isSelected && "text-emerald-700 dark:text-emerald-300",
								)}
							>
								{suggestion.text}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
