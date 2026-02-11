"use client";

import { Crown, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutiveBreakdownProps {
  breakdown: { executive: string; count: number }[];
  topExecutive: string | null;
}

const executiveConfig: Record<
  string,
  { name: string; color: string; bgColor: string; icon: typeof Sparkles }
> = {
  alexandria: {
    name: "Alexandria (CMO)",
    color: "from-rose-500 to-pink-600",
    bgColor: "bg-rose-50",
    icon: Sparkles,
  },
  kim: {
    name: "Kim (CSO)",
    color: "from-red-500 to-orange-600",
    bgColor: "bg-red-50",
    icon: Crown,
  },
  collaborative: {
    name: "Collaborative",
    color: "from-purple-500 to-indigo-600",
    bgColor: "bg-purple-50",
    icon: Users,
  },
};

export function ExecutiveBreakdown({
  breakdown,
  topExecutive,
}: ExecutiveBreakdownProps) {
  const total = breakdown.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-neutral-900">
          Executive Usage
        </h2>
        <p className="text-sm text-neutral-500">
          Most popular:{" "}
          <span className="text-rose-600 font-medium">
            {executiveConfig[topExecutive || ""]?.name || "None"}
          </span>
        </p>
      </div>
      <div className="p-6 space-y-4">
        {breakdown.length === 0 ? (
          <div className="text-center text-neutral-500">No usage data yet</div>
        ) : (
          breakdown.map((item) => {
            const config = executiveConfig[item.executive] || {
              name: item.executive,
              color: "from-neutral-400 to-neutral-500",
              bgColor: "bg-neutral-50",
              icon: Sparkles,
            };
            const percentage = total > 0 ? (item.count / total) * 100 : 0;
            const Icon = config.icon;

            return (
              <div key={item.executive} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br",
                        config.color,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-neutral-700">
                      {config.name}
                    </span>
                  </div>
                  <span className="text-sm text-neutral-500">
                    {item.count.toLocaleString()} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r",
                      config.color,
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
