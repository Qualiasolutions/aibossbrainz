"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface SearchResultItem {
	title: string;
	url: string;
	snippet: string;
}

interface WebSearchResultsProps {
	query: string;
	results: SearchResultItem[];
	isLoading?: boolean;
}

export function WebSearchResults({
	query,
	results,
	isLoading,
}: WebSearchResultsProps) {
	const [expanded, setExpanded] = useState(false);

	if (isLoading) {
		return (
			<div className="animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-stone-200/60 bg-stone-50/50 p-3 text-sm">
				<div className="flex items-center gap-2 text-stone-500">
					<SearchIcon className="size-4 animate-pulse" />
					<span>
						Searching for{" "}
						<span className="font-medium text-stone-700">{query}</span>
						...
					</span>
				</div>
			</div>
		);
	}

	const sources = results.filter((r) => r.url);

	return (
		<div className="animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-stone-200/60 bg-stone-50/50 p-3 text-sm">
			<button
				type="button"
				className="flex w-full items-center gap-2 text-left"
				onClick={() => setExpanded(!expanded)}
			>
				<SearchIcon className="size-4 shrink-0 text-stone-400" />
				<span className="min-w-0 flex-1 truncate text-stone-600">
					Searched for{" "}
					<span className="font-medium text-stone-800">{query}</span>
				</span>
				{sources.length > 0 && (
					<span className="shrink-0 text-xs text-stone-400">
						{sources.length} source{sources.length !== 1 ? "s" : ""}
					</span>
				)}
				<ChevronIcon
					className={cn(
						"size-4 shrink-0 text-stone-400 transition-transform",
						expanded && "rotate-180",
					)}
				/>
			</button>
			{expanded && sources.length > 0 && (
				<div className="mt-2 flex flex-col gap-1.5 border-t border-stone-200/60 pt-2">
					{sources.map((source, i) => (
						<a
							key={`${source.url}-${i}`}
							href={source.url}
							target="_blank"
							rel="noopener noreferrer"
							className="group flex items-start gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-stone-100"
						>
							<LinkIcon className="mt-0.5 size-3.5 shrink-0 text-stone-400 group-hover:text-stone-600" />
							<div className="min-w-0 flex-1">
								<div className="truncate text-xs font-medium text-stone-700 group-hover:text-stone-900">
									{source.title}
								</div>
								<div className="truncate text-xs text-stone-400">
									{new URL(source.url).hostname}
								</div>
							</div>
						</a>
					))}
				</div>
			)}
		</div>
	);
}

interface DeepResearchResultsProps {
	topic: string;
	searches: Array<{
		angle: string;
		query: string;
		results: SearchResultItem[];
	}>;
	isLoading?: boolean;
}

export function DeepResearchResults({
	topic,
	searches,
	isLoading,
}: DeepResearchResultsProps) {
	const [expanded, setExpanded] = useState(false);

	if (isLoading) {
		return (
			<div className="animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-amber-200/60 bg-amber-50/50 p-3 text-sm">
				<div className="flex items-center gap-2 text-amber-700">
					<ResearchIcon className="size-4 animate-pulse" />
					<span>
						Researching <span className="font-medium">{topic}</span>...
					</span>
				</div>
				{searches.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1.5">
						{searches.map((s) => (
							<span
								key={s.angle}
								className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700"
							>
								{s.angle}
							</span>
						))}
					</div>
				)}
			</div>
		);
	}

	const totalSources = searches.reduce(
		(sum, s) => sum + s.results.filter((r) => r.url).length,
		0,
	);

	return (
		<div className="animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-amber-200/60 bg-amber-50/50 p-3 text-sm">
			<button
				type="button"
				className="flex w-full items-center gap-2 text-left"
				onClick={() => setExpanded(!expanded)}
			>
				<ResearchIcon className="size-4 shrink-0 text-amber-500" />
				<span className="min-w-0 flex-1 truncate text-amber-800">
					Researched <span className="font-medium">{topic}</span>
				</span>
				{totalSources > 0 && (
					<span className="shrink-0 text-xs text-amber-500">
						{totalSources} source{totalSources !== 1 ? "s" : ""}
					</span>
				)}
				<ChevronIcon
					className={cn(
						"size-4 shrink-0 text-amber-400 transition-transform",
						expanded && "rotate-180",
					)}
				/>
			</button>
			{expanded && (
				<div className="mt-2 flex flex-col gap-3 border-t border-amber-200/60 pt-2">
					{searches.map((search) => {
						const sources = search.results.filter((r) => r.url);
						if (sources.length === 0) return null;
						return (
							<div key={search.angle}>
								<div className="mb-1 text-xs font-medium text-amber-700">
									{search.angle}
								</div>
								<div className="flex flex-col gap-1">
									{sources.map((source, j) => (
										<a
											key={`${source.url}-${j}`}
											href={source.url}
											target="_blank"
											rel="noopener noreferrer"
											className="group flex items-start gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-amber-100/60"
										>
											<LinkIcon className="mt-0.5 size-3.5 shrink-0 text-amber-400 group-hover:text-amber-600" />
											<div className="min-w-0 flex-1">
												<div className="truncate text-xs font-medium text-amber-800 group-hover:text-amber-900">
													{source.title}
												</div>
												<div className="truncate text-xs text-amber-400">
													{new URL(source.url).hostname}
												</div>
											</div>
										</a>
									))}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

function SearchIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<circle cx="7" cy="7" r="4.5" />
			<path d="M10.5 10.5L14 14" />
		</svg>
	);
}

function ResearchIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<circle cx="7" cy="7" r="4.5" />
			<path d="M10.5 10.5L14 14" />
			<path d="M5 7h4" />
			<path d="M7 5v4" />
		</svg>
	);
}

function LinkIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M6.5 9.5l3-3" />
			<path d="M9 6.5l1.5-1.5a2.12 2.12 0 013 3L12 9.5" />
			<path d="M7 9.5L5.5 11a2.12 2.12 0 01-3-3L4 6.5" />
		</svg>
	);
}

function ChevronIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M4 6l4 4 4-4" />
		</svg>
	);
}
