"use client";

import { ArrowRight, Crown, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "./subscription-provider";

export function UpgradeBanner() {
  const { status, isLoading } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if loading, dismissed, admin, or paid subscriber
  if (isLoading || dismissed) return null;
  if (!status) return null;
  if (status.isAdmin) return null;

  // Show for trial users or non-active subscriptions
  const isTrial = status.subscriptionType === "trial" && status.isActive;
  const isExpired = !status.isActive && status.subscriptionType !== null;
  const isNoSubscription = !status.isActive && status.subscriptionType === null;

  if (!isTrial && !isExpired && !isNoSubscription) return null;

  // Determine message
  let title = "Upgrade to Premium";
  let message =
    "Get unlimited access to Alexandria & Kim with a paid subscription.";

  if (isTrial && status.daysRemaining !== null) {
    title = `${status.daysRemaining} days left in trial`;
    message = "Upgrade now to keep your unlimited access to our AI executives.";
  } else if (isExpired) {
    title = "Your subscription has expired";
    message = "Renew your subscription to continue using Alexandria & Kim.";
  }

  return (
    <div className="relative flex items-center justify-between gap-4 border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 px-4 py-3 sm:px-6">
      {/* Left content */}
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          {isTrial ? (
            <Sparkles className="size-4" />
          ) : (
            <Crown className="size-4" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-sm text-stone-900">
            {title}
          </p>
          <p className="hidden text-xs text-stone-600 sm:block">{message}</p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex shrink-0 items-center gap-2">
        <Link href="/pricing">
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 text-xs shadow-lg shadow-red-500/20 hover:from-red-700 hover:to-rose-700"
          >
            {isTrial ? "Upgrade Now" : "View Plans"}
            <ArrowRight className="size-3" />
          </Button>
        </Link>
        {isTrial && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            aria-label="Dismiss banner"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
