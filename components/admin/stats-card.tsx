import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
}: StatsCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-neutral-900">{value}</p>
          {change && (
            <p
              className={cn(
                "mt-1 text-sm",
                changeType === "positive" && "text-emerald-600",
                changeType === "negative" && "text-rose-600",
                changeType === "neutral" && "text-neutral-500",
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-rose-50 p-2">
          <Icon className="h-5 w-5 text-rose-500" />
        </div>
      </div>
    </div>
  );
}
