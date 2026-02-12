"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	Check,
	CornerDownLeft,
	Lightbulb,
	MessageSquare,
	Sparkles,
	Target,
} from "lucide-react";
import { useState } from "react";
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
	onSelect: (text: string) => void;
	isVisible: boolean;
	botType?: BotType;
};

export function MessageSuggestions({
	suggestions,
	onSelect,
	isVisible,
	botType = "collaborative",
}: MessageSuggestionsProps) {
	const [copiedId, setCopiedId] = useState<string | null>(null);

	if (!isVisible || suggestions.length === 0) {
		return null;
	}

	const handleSelect = (suggestion: Suggestion, e: React.MouseEvent) => {
		// Prevent any default behavior and stop propagation
		e.preventDefault();
		e.stopPropagation();

		// Immediately set copied state for visual feedback
		setCopiedId(suggestion.id);

		// Call onSelect synchronously
		onSelect(suggestion.text);

		// Reset after animation completes
		setTimeout(() => {
			setCopiedId(null);
		}, 1500);
	};

	const handleKeyDown = (e: React.KeyboardEvent, suggestion: Suggestion) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			e.stopPropagation();
			// Set copied state for visual feedback
			setCopiedId(suggestion.id);
			onSelect(suggestion.text);
			setTimeout(() => {
				setCopiedId(null);
			}, 1500);
		}
	};

	return (
		<AnimatePresence mode="wait">
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="mt-5"
				exit={{ opacity: 0, y: -8 }}
				initial={{ opacity: 0, y: 12 }}
				transition={{
					duration: 0.3,
					ease: [0.16, 1, 0.3, 1],
				}}
			>
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
				</div>

				{/* Suggestions - responsive flex wrap layout */}
				<div className="flex flex-wrap gap-2">
					{suggestions.map((suggestion) => {
						const Icon = CATEGORY_ICONS[suggestion.category];
						const isCopied = copiedId === suggestion.id;

						return (
							<button
								aria-label={`Ask: ${suggestion.text}`}
								className={cn(
									"group relative flex items-start gap-2 rounded-xl border px-3 py-2",
									"text-sm transition-colors",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-2",
									"shadow-sm",
									// Responsive width: full on mobile, auto-fit on larger screens
									"w-full sm:w-auto sm:max-w-[calc(50%-0.25rem)] sm:flex-1 sm:min-w-[200px]",
									EXECUTIVE_BUTTON_STYLES[botType],
									isCopied &&
										"border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40",
								)}
								key={suggestion.id}
								onClick={(e) => handleSelect(suggestion, e)}
								onKeyDown={(e) => handleKeyDown(e, suggestion)}
								type="button"
							>
								{/* Icon */}
								<span
									className={cn(
										"flex size-6 shrink-0 items-center justify-center rounded-lg transition-colors",
										isCopied
											? "bg-emerald-100 dark:bg-emerald-900/50"
											: EXECUTIVE_ICON_BG[botType],
									)}
								>
									<AnimatePresence mode="wait">
										{isCopied ? (
											<motion.span
												key="check"
												initial={{ scale: 0, rotate: -180 }}
												animate={{ scale: 1, rotate: 0 }}
												exit={{ scale: 0 }}
												transition={{
													type: "spring",
													stiffness: 500,
													damping: 25,
												}}
											>
												<Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
											</motion.span>
										) : (
											<motion.span
												key="icon"
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												exit={{ scale: 0 }}
											>
												<Icon
													className={cn(
														"size-3.5",
														EXECUTIVE_ACCENT_STYLES[botType],
													)}
												/>
											</motion.span>
										)}
									</AnimatePresence>
								</span>

								{/* Text */}
								<span
									className={cn(
										"text-left font-medium text-stone-700 leading-snug dark:text-stone-200",
										isCopied && "text-emerald-700 dark:text-emerald-300",
									)}
								>
									{suggestion.text}
								</span>

								{/* Action indicator - only show when copied */}
								{isCopied && (
									<motion.span
										initial={{ opacity: 0, x: -8 }}
										animate={{ opacity: 1, x: 0 }}
										className="ml-1 flex items-center gap-1 whitespace-nowrap text-xs text-emerald-600 dark:text-emerald-400"
									>
										<CornerDownLeft className="size-3" />
										<span className="hidden sm:inline">Added to input</span>
									</motion.span>
								)}
							</button>
						);
					})}
				</div>
			</motion.div>
		</AnimatePresence>
	);
}
