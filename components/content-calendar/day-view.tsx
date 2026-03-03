"use client";

import { format, isSameDay } from "date-fns";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import type { ContentCalendar } from "@/lib/supabase/types";
import { fetcher } from "@/lib/utils";
import { SocialPostCard } from "./social-post-card";

interface DayViewProps {
	date: Date;
	onBack: () => void;
	refreshTrigger?: number;
}

export function DayView({ date, onBack, refreshTrigger }: DayViewProps) {
	const dateKey = format(date, "yyyy-MM-dd");
	const isToday = isSameDay(date, new Date());

	const { data: posts, mutate } = useSWR<ContentCalendar[]>(
		`/api/content-calendar?date=${dateKey}`,
		fetcher,
	);

	useEffect(() => {
		if (refreshTrigger !== undefined) {
			mutate();
		}
	}, [refreshTrigger, mutate]);

	return (
		<div className="space-y-3">
			{/* Header */}
			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					size="icon"
					onClick={onBack}
					className="size-7 rounded-lg"
				>
					<ArrowLeft className="size-3.5" />
				</Button>
				<div className="flex flex-col">
					<h3 className="font-semibold text-sm">
						{format(date, "EEEE, MMM d")}
					</h3>
					{isToday && (
						<span className="text-[10px] font-medium text-primary">Today</span>
					)}
				</div>
			</div>

			{/* Posts */}
			{posts && posts.length > 0 ? (
				<div className="space-y-3">
					{posts.map((post) => (
						<SocialPostCard
							key={post.id}
							post={post}
							onUpdate={() => mutate()}
						/>
					))}
				</div>
			) : (
				<div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20">
					<CalendarPlus className="size-8 text-muted-foreground/40" />
					<p className="text-sm text-muted-foreground">No posts scheduled</p>
					<p className="max-w-[200px] text-center text-[10px] text-muted-foreground/60">
						Ask an executive to create social media content for this day
					</p>
				</div>
			)}
		</div>
	);
}
