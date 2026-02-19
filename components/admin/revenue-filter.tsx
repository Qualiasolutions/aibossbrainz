"use client";

import { Building2, CircleOff, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SubscriptionStatsData } from "./subscription-stats";

type FilterMode = "clients" | "all" | "uncategorized";

interface RevenueFilterProps {
	allStats: SubscriptionStatsData;
	clientStats: SubscriptionStatsData;
	uncategorizedStats: SubscriptionStatsData;
}

const FILTER_OPTIONS: {
	value: FilterMode;
	label: string;
	icon: typeof Building2;
	description: string;
}[] = [
	{
		value: "clients",
		label: "Clients Only",
		icon: Building2,
		description: "Revenue reflects client subscriptions only (team members excluded)",
	},
	{
		value: "all",
		label: "All Users",
		icon: Users,
		description: "",
	},
	{
		value: "uncategorized",
		label: "Subscribers",
		icon: CircleOff,
		description: "Regular subscribers (not categorized as team or client)",
	},
];

export function RevenueFilter({
	allStats,
	clientStats,
	uncategorizedStats,
}: RevenueFilterProps) {
	const [mode, setMode] = useState<FilterMode>("clients");

	const statsMap: Record<FilterMode, SubscriptionStatsData> = {
		clients: clientStats,
		all: allStats,
		uncategorized: uncategorizedStats,
	};
	const stats = statsMap[mode];
	const activeOption = FILTER_OPTIONS.find((o) => o.value === mode);

	return (
		<div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
			<div className="border-b border-neutral-200 px-6 py-4">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-neutral-900">
						Revenue Breakdown
					</h2>
					<div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-0.5">
						{FILTER_OPTIONS.map((option) => {
							const Icon = option.icon;
							return (
								<button
									key={option.value}
									type="button"
									onClick={() => setMode(option.value)}
									className={cn(
										"flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
										mode === option.value
											? "bg-blue-50 text-blue-700 shadow-sm"
											: "text-neutral-500 hover:text-neutral-700",
									)}
								>
									<Icon className="h-3.5 w-3.5" />
									{option.label}
								</button>
							);
						})}
					</div>
				</div>
				{activeOption?.description && (
					<p className="text-xs text-neutral-400 mt-1">
						{activeOption.description}
					</p>
				)}
			</div>
			<div className="p-6">
				<div className="grid grid-cols-2 gap-4 mb-6">
					<div className="rounded-lg bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 p-4">
						<p className="text-sm text-rose-600 font-medium">MRR</p>
						<p className="text-3xl font-bold text-rose-900">
							${stats.mrr.toLocaleString()}
						</p>
					</div>
					<div className="rounded-lg bg-neutral-50 border border-neutral-100 p-4">
						<p className="text-sm text-neutral-500 font-medium">
							Active Subscribers
						</p>
						<p className="text-3xl font-bold text-neutral-900">
							{stats.activeSubscribers}
						</p>
					</div>
				</div>

				<div className="space-y-3">
					{[
						{
							label: "Trial",
							count: stats.trial,
							price: "$0",
							color: "bg-amber-500",
						},
						{
							label: "Monthly",
							count: stats.monthly,
							price: "$297/mo",
							color: "bg-emerald-500",
						},
						{
							label: "Annual",
							count: stats.annual,
							price: "$2,500/yr",
							color: "bg-violet-500",
						},
						{
							label: "Lifetime",
							count: stats.lifetime,
							price: "$3,500",
							color: "bg-rose-500",
						},
					].map((tier) => (
						<div key={tier.label} className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className={cn("w-2.5 h-2.5 rounded-full", tier.color)} />
								<span className="text-sm text-neutral-700">{tier.label}</span>
								<span className="text-xs text-neutral-400">{tier.price}</span>
							</div>
							<span className="text-sm font-semibold text-neutral-900">
								{tier.count}
							</span>
						</div>
					))}
					{stats.expired > 0 && (
						<div className="flex items-center justify-between pt-3 border-t border-neutral-100">
							<span className="text-sm text-neutral-500">Expired</span>
							<span className="text-sm font-medium text-rose-600">
								{stats.expired}
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
