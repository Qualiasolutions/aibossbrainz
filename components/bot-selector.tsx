"use client";

import { motion } from "framer-motion";
import { Crown, Target, TrendingUp, UserRound, Users } from "lucide-react";
import Image from "next/image";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	BOT_PERSONALITIES,
	type BotPersonality,
	type BotType,
} from "@/lib/bot-personalities";
import { cn } from "@/lib/utils";

interface BotSelectorProps {
	selectedBot: BotType;
	onBotSelect: (botType: BotType) => void;
	className?: string;
	showIntro?: boolean;
}

const getBotIcon = (iconName: string) => {
	switch (iconName) {
		case "Crown":
			return <Crown className="h-5 w-5" />;
		case "UserRound":
			return <UserRound className="h-5 w-5" />;
		case "Users":
			return <Users className="h-5 w-5" />;
		default:
			return <TrendingUp className="h-5 w-5" />;
	}
};

export function BotSelector({
	selectedBot,
	onBotSelect,
	className,
	showIntro = true,
}: BotSelectorProps) {
	return (
		<div
			className={cn("mx-auto w-full max-w-5xl p-3 sm:p-4 lg:p-6", className)}
		>
			{showIntro ? (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="mb-6 text-center sm:mb-8 lg:mb-10"
					initial={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.5 }}
				>
					<h2 className="font-semibold text-xl text-stone-900 tracking-tight sm:text-2xl lg:text-3xl">
						Choose your AI executive consultant
					</h2>
					<p className="mt-2 text-sm text-stone-500 sm:mt-3 sm:text-base">
						Switch between Alexandria, Kim, or both for integrated insights.
					</p>
				</motion.div>
			) : null}

			<Tabs
				className="w-full"
				onValueChange={(value) => onBotSelect(value as BotType)}
				value={selectedBot}
			>
				<TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1 sm:gap-2 sm:rounded-2xl sm:p-2">
					<TabsTrigger
						className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 font-medium text-stone-500 text-xs transition-all duration-300 data-[state=active]:bg-stone-900 data-[state=active]:text-white data-[state=active]:shadow-sm sm:gap-2 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
						value="collaborative"
					>
						<Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
						Both
					</TabsTrigger>
					<TabsTrigger
						className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 font-medium text-stone-500 text-xs transition-all duration-300 data-[state=active]:bg-stone-900 data-[state=active]:text-white data-[state=active]:shadow-sm sm:gap-2 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
						value="alexandria"
					>
						<Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
						<span className="hidden xs:inline sm:inline">Alexandria</span>
						<span className="xs:hidden">Alex</span>
					</TabsTrigger>
					<TabsTrigger
						className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 font-medium text-stone-500 text-xs transition-all duration-300 data-[state=active]:bg-stone-900 data-[state=active]:text-white data-[state=active]:shadow-sm sm:gap-2 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
						value="kim"
					>
						<UserRound className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
						Kim
					</TabsTrigger>
				</TabsList>

				<TabsContent className="mt-6" value="collaborative">
					<BotCard
						bot={BOT_PERSONALITIES.collaborative}
						isSelected={selectedBot === "collaborative"}
					/>
				</TabsContent>
				<TabsContent className="mt-6" value="alexandria">
					<BotCard
						bot={BOT_PERSONALITIES.alexandria}
						isSelected={selectedBot === "alexandria"}
					/>
				</TabsContent>
				<TabsContent className="mt-6" value="kim">
					<BotCard
						bot={BOT_PERSONALITIES.kim}
						isSelected={selectedBot === "kim"}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}

interface BotCardProps {
	bot: BotPersonality;
	isSelected: boolean;
}

function BotCard({ bot, isSelected }: BotCardProps) {
	return (
		<motion.div
			animate={{ opacity: 1, scale: 1 }}
			className={cn(
				"transition-all duration-300",
				isSelected && "scale-[1.01]",
			)}
			initial={{ opacity: 0, scale: 0.97 }}
			transition={{ duration: 0.3, delay: 0.05 }}
			whileHover={{ translateY: -6 }}
		>
			<Card
				className={cn(
					"h-full rounded-3xl border border-rose-100/70 bg-white/95 shadow-rose-200/40 shadow-xl backdrop-blur-sm transition-all duration-300",
					isSelected && "ring-2 ring-rose-300",
				)}
			>
				<CardHeader className="pb-4">
					<CardTitle className="flex items-start gap-4">
						{bot.avatar ? (
							<motion.div
								animate={{ rotate: 0, scale: 1 }}
								className="relative size-16 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-lg shadow-rose-200/50"
								initial={{ rotate: -6, scale: 0.9 }}
								transition={{ type: "spring", stiffness: 260, damping: 20 }}
							>
								<Image
									alt={`${bot.name} avatar`}
									className="size-full object-cover"
									height={64}
									src={bot.avatar}
									width={64}
								/>
							</motion.div>
						) : (
							<motion.div
								animate={{ rotate: 0, scale: 1 }}
								className={cn(
									"rounded-2xl p-3 text-white shadow-lg shadow-rose-200/50",
									bot.color,
								)}
								initial={{ rotate: -6, scale: 0.9 }}
								transition={{ type: "spring", stiffness: 260, damping: 20 }}
							>
								{getBotIcon(bot.icon)}
							</motion.div>
						)}
						<div className="flex-1">
							<h3 className="font-semibold text-slate-900 text-xl">
								{bot.name}
							</h3>
							<p className="font-medium text-rose-500 text-sm">{bot.role}</p>
						</div>
						{isSelected ? (
							<motion.div
								animate={{ scale: 1 }}
								className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 text-xs uppercase tracking-wide shadow-sm"
								initial={{ scale: 0 }}
								transition={{ duration: 0.3, delay: 0.1 }}
							>
								Selected
							</motion.div>
						) : null}
					</CardTitle>
					<CardDescription className="mt-3 text-base text-slate-600 leading-relaxed">
						{bot.description}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6 pt-2">
					<div>
						<h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-700 text-sm uppercase tracking-wide">
							<Target className="h-4 w-4 text-rose-500" />
							Expertise Focus
						</h4>
						<ul className="grid gap-2 text-slate-600 text-sm sm:grid-cols-2">
							{bot.expertise.map((item, index) => (
								<motion.li
									animate={{ opacity: 1, x: 0 }}
									className="flex items-center gap-3 rounded-xl bg-rose-50/60 px-3 py-2 text-left shadow-rose-100/40 shadow-sm"
									initial={{ opacity: 0, x: -12 }}
									key={item}
									transition={{ duration: 0.25, delay: index * 0.05 }}
								>
									<span className="inline-flex size-2.5 rounded-full bg-gradient-to-r from-rose-500 to-rose-600" />
									{item}
								</motion.li>
							))}
						</ul>
					</div>
					<div className="rounded-2xl border border-rose-100/70 bg-gradient-to-r from-white via-rose-50 to-white p-4 text-slate-600 text-sm shadow-inner">
						“{bot.personality}”
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
}
