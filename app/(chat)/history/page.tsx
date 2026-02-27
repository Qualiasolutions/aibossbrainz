import { Crown, MessageSquare, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HistoryChatList } from "@/components/history-chat-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getChatStatsForChats, getChatsByUserId } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";

export default async function HistoryPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const { chats } = await getChatsByUserId({
		id: user.id,
		limit: 100,
		startingAfter: null,
		endingBefore: null,
	});

	// Calculate analytics from messages
	const totalChats = chats.length;

	// Batch fetch message stats for all chats (1 query instead of N)
	const statsMap = await getChatStatsForChats(chats.map((c) => c.id));
	const chatStats = chats.map((chat) => {
		const stats = statsMap.get(chat.id);
		return {
			...chat,
			primaryBot: stats?.primaryBot || "collaborative",
			messageCount: stats?.messageCount || 0,
			isPinned: chat.isPinned || false,
		};
	});

	const botDistribution = chatStats.reduce(
		(acc, chat) => {
			acc[chat.primaryBot] = (acc[chat.primaryBot] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	return (
		<main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
			{/* Header */}
			<header className="border-white/20 border-b bg-white/80 dark:bg-slate-900/80 dark:border-slate-700 backdrop-blur-xl">
				<div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h1 className="font-bold text-2xl text-slate-900 dark:text-white sm:text-3xl">
								Conversation History
							</h1>
							<p className="mt-1 text-slate-600 dark:text-slate-400 text-sm">
								Review your past consulting sessions
							</p>
						</div>
						<Link href="/new">
							<Button className="w-full sm:w-auto" variant="outline">
								Back to Chat
							</Button>
						</Link>
					</div>
				</div>
			</header>

			{/* Analytics Section */}
			<section
				aria-label="Usage statistics"
				className="border-white/20 border-b bg-white/40 dark:bg-slate-800/40 dark:border-slate-700 py-6 sm:py-8"
			>
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<Card className="border-0 bg-gradient-to-br from-white to-rose-50/50 dark:from-slate-800 dark:to-rose-900/20 shadow-md">
							<CardContent className="p-4 sm:p-6">
								<div className="flex items-center gap-3">
									<div className="flex size-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/50 sm:size-12">
										<MessageSquare className="h-5 w-5 text-rose-600 dark:text-rose-400 sm:h-6 sm:w-6" />
									</div>
									<div>
										<p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
											Total Conversations
										</p>
										<p className="font-bold text-slate-900 dark:text-white text-xl sm:text-2xl">
											{totalChats}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="border-0 bg-gradient-to-br from-white to-red-50/50 dark:from-slate-800 dark:to-red-900/20 shadow-md">
							<CardContent className="p-4 sm:p-6">
								<div className="flex items-center gap-3">
									<div className="flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50 sm:size-12">
										<Crown className="h-5 w-5 text-red-600 dark:text-red-400 sm:h-6 sm:w-6" />
									</div>
									<div>
										<p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
											Alexandria Sessions
										</p>
										<p className="font-bold text-slate-900 dark:text-white text-xl sm:text-2xl">
											{botDistribution.alexandria || 0}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="border-0 bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-800 dark:to-blue-900/20 shadow-md">
							<CardContent className="p-4 sm:p-6">
								<div className="flex items-center gap-3">
									<div className="flex size-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 sm:size-12">
										<TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 sm:h-6 sm:w-6" />
									</div>
									<div>
										<p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
											Kim Sessions
										</p>
										<p className="font-bold text-slate-900 dark:text-white text-xl sm:text-2xl">
											{botDistribution.kim || 0}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="border-0 bg-gradient-to-br from-white to-purple-50/50 dark:from-slate-800 dark:to-purple-900/20 shadow-md">
							<CardContent className="p-4 sm:p-6">
								<div className="flex items-center gap-3">
									<div className="flex size-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50 sm:size-12">
										<Users className="h-5 w-5 text-purple-600 dark:text-purple-400 sm:h-6 sm:w-6" />
									</div>
									<div>
										<p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
											Collaborative
										</p>
										<p className="font-bold text-slate-900 dark:text-white text-xl sm:text-2xl">
											{botDistribution.collaborative || 0}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			{/* Conversations List */}
			<section aria-label="Conversation History" className="py-8 sm:py-12">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<HistoryChatList initialChats={chatStats} />
				</div>
			</section>
		</main>
	);
}
