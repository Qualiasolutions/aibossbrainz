"use client";

import { format } from "date-fns";
import {
	CalendarDays,
	Crown,
	MessageSquare,
	TrendingUp,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { HistoryPinButton } from "@/components/history-pin-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ChatStat {
	id: string;
	title: string;
	createdAt: Date;
	visibility: string;
	isPinned: boolean;
	primaryBot: string;
	messageCount: number;
}

interface HistoryChatListProps {
	initialChats: ChatStat[];
}

const getBotIcon = (botType?: string) => {
	switch (botType) {
		case "alexandria":
			return <Crown className="h-4 w-4 text-red-600 dark:text-red-400" />;
		case "kim":
			return (
				<TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
			);
		case "collaborative":
			return <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
		default:
			return (
				<MessageSquare className="h-4 w-4 text-slate-400 dark:text-slate-500" />
			);
	}
};

const getBotBadge = (botType?: string) => {
	switch (botType) {
		case "alexandria":
			return (
				<span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/30 px-2 py-1 font-semibold text-[10px] text-red-700 dark:text-red-300">
					<Crown className="h-3 w-3" />
					Alexandria
				</span>
			);
		case "kim":
			return (
				<span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-1 font-semibold text-[10px] text-blue-700 dark:text-blue-300">
					<TrendingUp className="h-3 w-3" />
					Kim
				</span>
			);
		case "collaborative":
			return (
				<span className="inline-flex items-center gap-1 rounded-full bg-purple-50 dark:bg-purple-900/30 px-2 py-1 font-semibold text-[10px] text-purple-700 dark:text-purple-300">
					<Users className="h-3 w-3" />
					Both
				</span>
			);
		default:
			return null;
	}
};

export function HistoryChatList({ initialChats }: HistoryChatListProps) {
	const [chatStats, setChatStats] = useState(initialChats);

	// Sort: pinned first (by createdAt desc), then unpinned (by createdAt desc)
	const sortedChats = [...chatStats].sort((a, b) => {
		if (a.isPinned && !b.isPinned) return -1;
		if (!a.isPinned && b.isPinned) return 1;
		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	});

	const handlePinToggle = (chatId: string) => {
		// Toggle the isPinned state locally
		setChatStats((prev) =>
			prev.map((chat) =>
				chat.id === chatId ? { ...chat, isPinned: !chat.isPinned } : chat,
			),
		);
	};

	if (sortedChats.length === 0) {
		return (
			<Card className="border-0 bg-white/80 dark:bg-slate-800/80 shadow-xl">
				<CardContent className="p-8 text-center sm:p-12">
					<MessageSquare className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 sm:h-16 sm:w-16" />
					<h3 className="mt-4 font-semibold text-lg text-slate-900 dark:text-white sm:text-xl">
						No conversations yet
					</h3>
					<p className="mt-2 text-slate-600 dark:text-slate-400 text-sm sm:text-base">
						Start your first conversation with our executive consultants
					</p>
					<Link href="/new">
						<Button className="mt-6">Start New Conversation</Button>
					</Link>
				</CardContent>
			</Card>
		);
	}

	return (
		<ul className="grid list-none gap-4 sm:gap-6">
			{sortedChats.map((chat) => (
				<li key={chat.id}>
					<Link href={`/chat/${chat.id}`}>
						<Card
							className={`group hover:-translate-y-1 border-0 bg-white/80 dark:bg-slate-800/80 shadow-md transition-all duration-200 hover:shadow-xl ${
								chat.isPinned
									? "ring-2 ring-amber-400/50 dark:ring-amber-500/50"
									: ""
							}`}
						>
							<CardContent className="p-4 sm:p-6">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div className="min-w-0 flex-1">
										<div className="flex items-start gap-3">
											<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-purple-100 dark:from-rose-900/50 dark:to-purple-900/50">
												{getBotIcon(chat.primaryBot)}
											</div>
											<div className="min-w-0 flex-1">
												<h3 className="truncate font-semibold text-base text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 sm:text-lg">
													{chat.title}
												</h3>
												<div className="mt-2 flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
													<span className="flex items-center gap-1">
														<CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
														{format(new Date(chat.createdAt), "MMM d, yyyy")}
													</span>
													<span>•</span>
													<span>
														{format(new Date(chat.createdAt), "h:mm a")}
													</span>
													<span>•</span>
													<span className="flex items-center gap-1">
														<MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
														{chat.messageCount} messages
													</span>
												</div>
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<HistoryPinButton
											chatId={chat.id}
											isPinned={chat.isPinned}
											onToggle={() => handlePinToggle(chat.id)}
										/>
										{getBotBadge(chat.primaryBot)}
										<span
											className={`rounded-full px-2 py-1 font-semibold text-[10px] uppercase ${
												chat.visibility === "private"
													? "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
													: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
											}`}
										>
											{chat.visibility}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>
					</Link>
				</li>
			))}
		</ul>
	);
}
