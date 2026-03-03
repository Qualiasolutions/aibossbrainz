"use client";

import { addMonths, format, subMonths } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	Loader2,
	X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const CalendarLoader = () => (
	<div className="flex h-32 items-center justify-center">
		<Loader2 className="size-6 animate-spin text-muted-foreground" />
	</div>
);

const CalendarView = dynamic(
	() =>
		import("./content-calendar/calendar-view").then((mod) => mod.CalendarView),
	{ loading: CalendarLoader, ssr: false },
);

const DayView = dynamic(
	() => import("./content-calendar/day-view").then((mod) => mod.DayView),
	{ loading: CalendarLoader, ssr: false },
);

interface ContentCalendarPanelProps {
	isOpen: boolean;
	onClose: () => void;
	refreshKey?: number;
}

export function ContentCalendarPanel({
	isOpen,
	onClose,
	refreshKey,
}: ContentCalendarPanelProps) {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const isMobile = useIsMobile();

	// Reset to month view when panel closes
	useEffect(() => {
		if (!isOpen) {
			setSelectedDate(null);
		}
	}, [isOpen]);

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={isMobile ? { x: "100%" } : { width: 0 }}
					animate={isMobile ? { x: 0 } : { width: 380 }}
					exit={isMobile ? { x: "100%" } : { width: 0 }}
					transition={{
						type: "spring",
						stiffness: 400,
						damping: 40,
					}}
					style={isMobile ? undefined : { width: 380 }}
					className={cn(
						"h-full flex-shrink-0 overflow-hidden border-l border-border bg-background",
						isMobile && "fixed inset-0 z-50 border-l-0",
					)}
				>
					{/* Header */}
					<div className="flex items-center justify-between border-b border-border px-3 py-2.5">
						<div className="flex items-center gap-2">
							<div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
								<CalendarDays className="size-3.5 text-primary" />
							</div>
							<h2 className="font-semibold text-sm text-foreground">
								Content Calendar
							</h2>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={onClose}
							className="size-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
						>
							<X className="size-3.5" />
							<span className="sr-only">Close panel</span>
						</Button>
					</div>

					{/* Month Navigation (only in month view) */}
					{!selectedDate && (
						<div className="flex items-center justify-between border-b border-border px-3 py-2">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setCurrentDate((d) => subMonths(d, 1))}
								className="size-7 rounded-lg"
							>
								<ChevronLeft className="size-4" />
							</Button>
							<span className="font-medium text-sm">
								{format(currentDate, "MMMM yyyy")}
							</span>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setCurrentDate((d) => addMonths(d, 1))}
								className="size-7 rounded-lg"
							>
								<ChevronRight className="size-4" />
							</Button>
						</div>
					)}

					{/* Content */}
					<div
						className={cn(
							"overflow-y-auto p-3",
							selectedDate ? "h-[calc(100%-52px)]" : "h-[calc(100%-96px)]",
						)}
					>
						<AnimatePresence mode="wait">
							{selectedDate ? (
								<motion.div
									key="day-view"
									initial={{ opacity: 0, x: 10 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -10 }}
									transition={{ duration: 0.15 }}
								>
									<DayView
										date={selectedDate}
										onBack={() => setSelectedDate(null)}
										refreshTrigger={refreshKey}
									/>
								</motion.div>
							) : (
								<motion.div
									key="calendar-view"
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: 10 }}
									transition={{ duration: 0.15 }}
								>
									<CalendarView
										currentDate={currentDate}
										onDateClick={setSelectedDate}
										refreshTrigger={refreshKey}
									/>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
