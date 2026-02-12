"use client";

import { Check, Cloud, Download, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactHeaderProps {
	title: string;
	isLoading?: boolean;
	isSaving?: boolean;
	lastSaved?: Date | null;
	onReset: () => void;
	onExport: () => void;
	className?: string;
}

export function CompactHeader({
	title,
	isLoading,
	isSaving,
	lastSaved,
	onReset,
	onExport,
	className,
}: CompactHeaderProps) {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-2 border-b border-neutral-200 pb-3 dark:border-neutral-800",
				className,
			)}
		>
			<h3 className="font-semibold text-sm text-neutral-900 dark:text-white">
				{title}
			</h3>
			<div className="flex items-center gap-2">
				{/* Save Status */}
				<div className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
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
						<Check className="size-3 text-emerald-500" />
					) : null}
				</div>
				{/* Action Buttons */}
				<button
					className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
					onClick={onReset}
					title="Reset"
					type="button"
				>
					<RotateCcw className="size-3.5" />
				</button>
				<button
					className="rounded p-1.5 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-900/20 dark:hover:text-rose-300"
					onClick={onExport}
					title="Export"
					type="button"
				>
					<Download className="size-3.5" />
				</button>
			</div>
		</div>
	);
}
