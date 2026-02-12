"use client";

import { Building2, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SubscriptionStatsData } from "./subscription-stats";

interface RevenueFilterProps {
	allStats: SubscriptionStatsData;
	clientStats: SubscriptionStatsData;
}

export function RevenueFilter({ allStats, clientStats }: RevenueFilterProps) {
	const [showClientsOnly, setShowClientsOnly] = useState(true);
	const stats = showClientsOnly ? clientStats : allStats;

	return (
		<div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
			<div className="border-b border-neutral-200 px-6 py-4">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-neutral-900">
						Revenue Breakdown
					</h2>
					<div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-0.5">
						<button
							type="button"
							onClick={() => setShowClientsOnly(true)}
							className={cn(
								"flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
								showClientsOnly
									? "bg-blue-50 text-blue-700 shadow-sm"
									: "text-neutral-500 hover:text-neutral-700",
							)}
						>
							<Building2 className="h-3.5 w-3.5" />
							Clients Only
						</button>
						<button
							type="button"
							onClick={() => setShowClientsOnly(false)}
							className={cn(
								"flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
								!showClientsOnly
									? "bg-neutral-100 text-neutral-700 shadow-sm"
									: "text-neutral-500 hover:text-neutral-700",
							)}
						>
							<Users className="h-3.5 w-3.5" />
							All Users
						</button>
					</div>
				</div>
				{showClientsOnly && (
					<p className="text-xs text-neutral-400 mt-1">
						Revenue reflects client subscriptions only (team members excluded)
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
