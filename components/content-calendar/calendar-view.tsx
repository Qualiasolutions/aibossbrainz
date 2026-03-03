"use client";

import {
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	isSameMonth,
	startOfMonth,
	startOfWeek,
} from "date-fns";
import { useEffect } from "react";
import useSWR from "swr";
import type { ContentCalendar } from "@/lib/supabase/types";
import { cn, fetcher } from "@/lib/utils";

interface CalendarViewProps {
	currentDate: Date;
	onDateClick: (date: Date) => void;
	refreshTrigger?: number;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarView({
	currentDate,
	onDateClick,
	refreshTrigger,
}: CalendarViewProps) {
	const year = currentDate.getFullYear();
	const month = currentDate.getMonth() + 1;

	const { data: posts, mutate } = useSWR<ContentCalendar[]>(
		`/api/content-calendar?year=${year}&month=${month}`,
		fetcher,
	);

	// Refresh when AI tool adds new posts
	useEffect(() => {
		if (refreshTrigger !== undefined) {
			mutate();
		}
	}, [refreshTrigger, mutate]);

	// Generate 6-week calendar grid
	const monthStart = startOfMonth(currentDate);
	const monthEnd = endOfMonth(currentDate);
	const calendarStart = startOfWeek(monthStart);
	const calendarEnd = endOfWeek(monthEnd);
	const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

	// Map posts to dates for quick lookup
	const postsByDate = new Map<string, number>();
	const platformsByDate = new Map<string, Set<string>>();

	if (posts) {
		for (const post of posts) {
			const key = post.scheduledDate;
			postsByDate.set(key, (postsByDate.get(key) || 0) + 1);
			if (!platformsByDate.has(key)) {
				platformsByDate.set(key, new Set());
			}
			platformsByDate.get(key)!.add(post.platform);
		}
	}

	const today = new Date();

	return (
		<div className="space-y-3">
			{/* Weekday headers */}
			<div className="grid grid-cols-7 gap-1 text-center">
				{WEEKDAYS.map((day, i) => (
					<div
						key={`${day}-${i}`}
						className="py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
					>
						{day}
					</div>
				))}
			</div>

			{/* Calendar grid */}
			<div className="grid grid-cols-7 gap-1">
				{days.map((day) => {
					const dateKey = format(day, "yyyy-MM-dd");
					const postCount = postsByDate.get(dateKey) || 0;
					const isCurrentMonth = isSameMonth(day, currentDate);
					const isToday = isSameDay(day, today);

					return (
						<button
							key={day.toISOString()}
							type="button"
							onClick={() => onDateClick(day)}
							className={cn(
								"relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-all",
								isCurrentMonth
									? "text-foreground hover:bg-muted"
									: "text-muted-foreground/40",
								isToday &&
									"ring-1 ring-primary bg-primary/5 font-semibold text-primary",
								postCount > 0 &&
									isCurrentMonth &&
									"bg-primary/5 font-medium hover:bg-primary/10",
							)}
						>
							<span className="text-xs">{format(day, "d")}</span>
							{postCount > 0 && (
								<div className="mt-0.5 flex gap-0.5">
									{Array.from({
										length: Math.min(postCount, 3),
									}).map((_, i) => (
										<div
											key={`dot-${dateKey}-${i}`}
											className={cn(
												"size-1 rounded-full",
												isToday ? "bg-primary" : "bg-primary/60",
											)}
										/>
									))}
									{postCount > 3 && (
										<span className="text-[7px] font-bold text-primary/60">
											+
										</span>
									)}
								</div>
							)}
						</button>
					);
				})}
			</div>

			{/* Monthly summary */}
			{posts && posts.length > 0 && (
				<div className="rounded-lg bg-muted/40 px-3 py-2.5">
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium text-foreground">
							{posts.length} post{posts.length !== 1 ? "s" : ""} this month
						</span>
						<span className="text-[10px] text-muted-foreground">
							{platformsByDate.size} day
							{platformsByDate.size !== 1 ? "s" : ""} scheduled
						</span>
					</div>
				</div>
			)}
		</div>
	);
}
