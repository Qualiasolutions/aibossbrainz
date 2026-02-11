"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowRight, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface UserPreviewData {
  id: string;
  email: string;
  displayName: string | null;
  companyName: string | null;
  subscriptionType: string | null;
  subscriptionStatus: string | null;
  onboardedAt: string | null;
}

interface UsersPreviewProps {
  users: UserPreviewData[];
}

const subscriptionColors: Record<string, string> = {
  trial: "bg-amber-100 text-amber-700",
  monthly: "bg-emerald-100 text-emerald-700",
  annual: "bg-violet-100 text-violet-700",
  lifetime: "bg-rose-100 text-rose-700",
};

export function UsersPreview({ users }: UsersPreviewProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm h-full flex flex-col">
      <div className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Recent Users</h2>
        <Link
          href="/admin/users"
          className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700 font-medium"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex-1 divide-y divide-neutral-100 overflow-auto">
        {users.length === 0 ? (
          <div className="p-6 text-center text-neutral-500">No users yet</div>
        ) : (
          users.map((user) => (
            <Link
              key={user.id}
              href={`/admin/users?selected=${user.id}`}
              className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-neutral-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
                <User className="h-4 w-4 text-neutral-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {user.displayName || user.email}
                </p>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  {user.companyName && (
                    <span className="truncate">{user.companyName}</span>
                  )}
                  {user.onboardedAt && (
                    <span>
                      Joined{" "}
                      {formatDistanceToNow(new Date(user.onboardedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>
              </div>
              {user.subscriptionType && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                    subscriptionColors[user.subscriptionType] ||
                      "bg-neutral-100 text-neutral-600",
                  )}
                >
                  {user.subscriptionType}
                </span>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
