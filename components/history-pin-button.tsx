"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCsrf } from "@/hooks/use-csrf";
import { logClientError } from "@/lib/client-logger";

interface HistoryPinButtonProps {
	chatId: string;
	isPinned: boolean;
	onToggle: () => void;
}

export function HistoryPinButton({
	chatId,
	isPinned,
	onToggle,
}: HistoryPinButtonProps) {
	const { csrfFetch } = useCsrf();
	const [isLoading, setIsLoading] = useState(false);
	const [localIsPinned, setLocalIsPinned] = useState(isPinned);

	const handleToggle = async (e: React.MouseEvent) => {
		e.preventDefault(); // Don't trigger Link navigation
		e.stopPropagation();

		if (isLoading) return;

		// Optimistic update
		const previousState = localIsPinned;
		setLocalIsPinned(!localIsPinned);
		setIsLoading(true);

		try {
			const response = await csrfFetch(`/api/chat?id=${chatId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					isPinned: !previousState,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to toggle pin");
			}

			// Call parent onToggle to refresh list
			onToggle();

			toast.success(
				!previousState ? "Conversation pinned" : "Conversation unpinned",
			);
		} catch (error) {
			// Revert optimistic update
			setLocalIsPinned(previousState);
			toast.error("Failed to update pin status");
			logClientError(error, {
				component: "HistoryPinButton",
				action: "toggle_pin",
				chatId,
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Button
			variant="ghost"
			size="sm"
			className={`size-8 p-0 ${
				localIsPinned
					? "text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
					: "text-slate-400 hover:text-amber-600 dark:text-slate-500 dark:hover:text-amber-400"
			}`}
			onClick={handleToggle}
			disabled={isLoading}
			aria-label={localIsPinned ? "Unpin conversation" : "Pin conversation"}
		>
			<Star
				className={`h-4 w-4 ${localIsPinned ? "fill-current" : ""}`}
				strokeWidth={localIsPinned ? 2 : 2}
			/>
		</Button>
	);
}
