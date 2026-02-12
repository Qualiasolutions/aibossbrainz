"use client";

import { Bookmark, HelpCircle, Lightbulb, Plus, Rocket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useCsrf } from "@/hooks/use-csrf";
import { cn } from "@/lib/utils";

export type ReactionType =
	| "actionable"
	| "needs_clarification"
	| "ready_to_implement"
	| "save_for_later";

const REACTION_CONFIG: Record<
	ReactionType,
	{ icon: typeof Lightbulb; label: string; color: string; bgColor: string }
> = {
	actionable: {
		icon: Lightbulb,
		label: "Actionable",
		color: "text-red-500",
		bgColor: "bg-red-500/10 hover:bg-red-500/20",
	},
	needs_clarification: {
		icon: HelpCircle,
		label: "Needs Clarification",
		color: "text-orange-500",
		bgColor: "bg-orange-500/10 hover:bg-orange-500/20",
	},
	ready_to_implement: {
		icon: Rocket,
		label: "Ready to Implement",
		color: "text-green-500",
		bgColor: "bg-green-500/10 hover:bg-green-500/20",
	},
	save_for_later: {
		icon: Bookmark,
		label: "Save for Later",
		color: "text-blue-500",
		bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
	},
};

interface MessageReactionsProps {
	messageId: string;
	/** @deprecated Use userReactions instead */
	userReaction?: ReactionType | null;
	userReactions?: ReactionType[];
	reactionCounts?: Record<ReactionType, number>;
	className?: string;
}

export function MessageReactions({
	messageId,
	userReaction,
	userReactions,
	reactionCounts = {} as Record<ReactionType, number>,
	className,
}: MessageReactionsProps) {
	const { mutate } = useSWRConfig();
	const { csrfFetch } = useCsrf();
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	// Support both legacy single-select prop and new multi-select prop
	const [currentReactions, setCurrentReactions] = useState<ReactionType[]>(
		userReactions ?? (userReaction ? [userReaction] : []),
	);

	const handleReaction = async (reactionType: ReactionType) => {
		if (isLoading) return;

		setIsLoading(true);
		const isRemoving = currentReactions.includes(reactionType);

		try {
			// Always POST -- server handles toggle semantics
			const response = await csrfFetch("/api/reactions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messageId, reactionType }),
			});

			if (!response.ok) {
				throw new Error("Failed to update reaction");
			}

			// Optimistically toggle the reaction in/out of the array
			setCurrentReactions((prev) =>
				isRemoving
					? prev.filter((r) => r !== reactionType)
					: [...prev, reactionType],
			);

			// Revalidate reactions data
			mutate(`/api/reactions?messageId=${messageId}`);
		} catch {
			toast.error("Failed to update reaction");
		} finally {
			setIsLoading(false);
			setIsOpen(false);
		}
	};

	// Show active reactions as badges
	const activeReactions = Object.entries(reactionCounts).filter(
		([_, count]) => count > 0,
	);

	return (
		<div className={cn("flex items-center gap-1", className)}>
			{/* Show existing reaction badges */}
			{activeReactions.map(([type, count]) => {
				const config = REACTION_CONFIG[type as ReactionType];
				const Icon = config.icon;
				const isUserReaction = currentReactions.includes(type as ReactionType);

				return (
					<button
						key={type}
						type="button"
						onClick={() => handleReaction(type as ReactionType)}
						className={cn(
							"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
							config.bgColor,
							isUserReaction && "ring-1 ring-current",
						)}
						title={`${config.label} (${count})`}
					>
						<Icon className={cn("h-3 w-3", config.color)} />
						<span className={config.color}>{count}</span>
					</button>
				);
			})}

			{/* Add reaction button */}
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-6 w-6 p-0 rounded-full opacity-50 hover:opacity-100"
						title="Add reaction"
					>
						<Plus className="h-3 w-3" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-2" align="start">
					<div className="flex flex-col gap-1">
						{Object.entries(REACTION_CONFIG).map(([type, config]) => {
							const Icon = config.icon;
							const isActive = currentReactions.includes(type as ReactionType);

							return (
								<button
									key={type}
									type="button"
									onClick={() => handleReaction(type as ReactionType)}
									disabled={isLoading}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
										config.bgColor,
										isActive && "ring-1 ring-current",
									)}
								>
									<Icon className={cn("h-4 w-4", config.color)} />
									<span>{config.label}</span>
									{isActive && (
										<span className="ml-auto text-xs text-muted-foreground">
											(active)
										</span>
									)}
								</button>
							);
						})}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
