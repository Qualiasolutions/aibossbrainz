"use client";

import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface SubscriptionStatsData {
  trial: number;
  monthly: number;
  annual: number;
  lifetime: number;
  expired: number;
  mrr: number;
  activeSubscribers: number;
}

interface SubscriptionStatsProps {
  stats: SubscriptionStatsData;
}

export function SubscriptionStats({ stats }: SubscriptionStatsProps) {
  const total = stats.trial + stats.monthly + stats.annual + stats.lifetime;

  const tiers = [
    {
      name: "Trial",
      count: stats.trial,
      color: "from-amber-400 to-orange-500",
      bgColor: "bg-amber-50",
      price: "$0",
    },
    {
      name: "Monthly",
      count: stats.monthly,
      color: "from-emerald-400 to-teal-500",
      bgColor: "bg-emerald-50",
      price: "$297/mo",
    },
    {
      name: "Annual",
      count: stats.annual,
      color: "from-violet-400 to-purple-500",
      bgColor: "bg-violet-50",
      price: "$2,500/yr",
    },
    {
      name: "Lifetime",
      count: stats.lifetime,
      color: "from-rose-400 to-red-500",
      bgColor: "bg-rose-50",
      price: "$3,500",
    },
  ];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm h-full">
      <div className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Subscriptions
          </h2>
          <p className="text-sm text-neutral-500">
            {stats.activeSubscribers} active subscribers
          </p>
        </div>
        <Link
          href="/admin/users"
          className="text-sm text-rose-600 hover:text-rose-700 font-medium"
        >
          Manage
        </Link>
      </div>
      <div className="p-6 space-y-6">
        {/* MRR Card */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100">
              <TrendingUp className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-rose-700">Monthly Recurring Revenue</p>
              <p className="text-2xl font-bold text-rose-900">
                ${stats.mrr.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="space-y-3">
          {tiers.map((tier) => {
            const percentage = total > 0 ? (tier.count / total) * 100 : 0;
            return (
              <div key={tier.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full bg-gradient-to-r",
                        tier.color,
                      )}
                    />
                    <span className="text-sm font-medium text-neutral-700">
                      {tier.name}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {tier.price}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">
                    {tier.count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r transition-all",
                      tier.color,
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Expired/Churned */}
        {stats.expired > 0 && (
          <div className="pt-4 border-t border-neutral-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Expired subscriptions</span>
              <span className="font-medium text-rose-600">{stats.expired}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
