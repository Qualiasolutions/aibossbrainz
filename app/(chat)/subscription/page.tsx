"use client";

import {
  AlertTriangle,
  ArrowRight,
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  Gift,
  Loader2,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { getCsrfToken, initCsrfToken } from "@/lib/utils";

interface SubscriptionData {
  subscriptionType: string | null;
  subscriptionStatus: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  hasStripeSubscription: boolean;
}

interface UpgradePlan {
  id: "monthly" | "annual" | "lifetime";
  name: string;
  price: string;
  period: string;
  description: string;
  popular: boolean;
  savings?: string;
  features: string[];
}

const upgradePlans: UpgradePlan[] = [
  {
    id: "monthly",
    name: "Most Flexible",
    price: "$297",
    period: "/month",
    description: "12 Month Membership",
    popular: false,
    features: [
      "Sales and Marketing Message Makeover",
      "Prompt Guide",
      "24/7 Access to Alexandria & Kim",
      "Cancel Anytime",
    ],
  },
  {
    id: "annual",
    name: "Best Value",
    price: "$2,500",
    period: "/year",
    description: "Annual Membership",
    popular: true,
    savings: "SAVE $1,000 + EXCLUSIVE BONUSES",
    features: [
      "Everything in Monthly Subscription",
      "Monthly Group Sales & Marketing Strategy Call",
      "Access to Our Resource Library",
      "The Sales & Marketing Checkup",
    ],
  },
  {
    id: "lifetime",
    name: "Exclusive Lifetime",
    price: "$3,500",
    period: "one-time",
    description: "Limited to 10 Seats Only",
    popular: false,
    savings: "ONE PAYMENT. NO SURPRISES. EVER.",
    features: [
      "Everything in Monthly Membership",
      "Private Quarterly Coaching Calls",
      "Lifetime Sales + Marketing Support",
      "Fresh insights & real-time pivots every 90 days",
    ],
  },
];

function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getStatusBadge(status: string | null | undefined) {
  const statusConfig = {
    active: { color: "bg-emerald-100 text-emerald-700", label: "Active" },
    trialing: { color: "bg-blue-100 text-blue-700", label: "Trial" },
    cancelled: { color: "bg-amber-100 text-amber-700", label: "Cancelled" },
    expired: { color: "bg-red-100 text-red-700", label: "Expired" },
  };
  const config = statusConfig[status as keyof typeof statusConfig] || {
    color: "bg-gray-100 text-gray-700",
    label: status || "None",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}

function getPlanName(type: string | null | undefined) {
  const plans = {
    trial: "Free Trial",
    monthly: "Most Flexible (Monthly)",
    annual: "Best Value (Annual)",
    lifetime: "Exclusive Lifetime",
  };
  return plans[type as keyof typeof plans] || "No Plan";
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null,
  );
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  useEffect(() => {
    initCsrfToken().then(() => loadData());
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch("/api/subscription");
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error("Failed to load subscription data:", error);
      toast.error("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const csrfToken = getCsrfToken() || "";
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ action: "portal" }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        toast.error("Failed to open billing portal");
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
      toast.error("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const csrfToken = getCsrfToken() || "";
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ action: "cancel" }),
      });

      if (res.ok) {
        toast.success(
          "Subscription cancelled. You'll receive a confirmation email.",
        );
        setShowCancelDialog(false);
        loadData();
      } else {
        toast.error("Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      toast.error("Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setUpgradeLoading(planId);
    try {
      const csrfToken = getCsrfToken() || "";
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Something went wrong. Please try again.");
        setUpgradeLoading(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Unable to start checkout. Please try again.");
        setUpgradeLoading(null);
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Network error. Please check your connection and try again.");
      setUpgradeLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">
          Subscription & Billing
        </h1>
        <p className="mt-1 text-stone-500">
          Manage your plan, billing, and membership
        </p>
      </div>

      <div className="space-y-6">
        {/* Current Plan Status */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-100">
              <Crown className="size-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Current Plan
              </h2>
              <p className="text-sm text-stone-500">
                Your active subscription details
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-stone-50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-stone-500">
                  Current Plan
                </p>
                <p className="mt-1 text-lg font-semibold text-stone-900">
                  {getPlanName(subscription?.subscriptionType)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-500">Status</p>
                <div className="mt-1">
                  {getStatusBadge(subscription?.subscriptionStatus)}
                </div>
              </div>
              {subscription?.subscriptionStartDate && (
                <div>
                  <p className="text-sm font-medium text-stone-500">Started</p>
                  <p className="mt-1 text-stone-900">
                    {formatDate(subscription.subscriptionStartDate)}
                  </p>
                </div>
              )}
              {subscription?.subscriptionEndDate && (
                <div>
                  <p className="text-sm font-medium text-stone-500">
                    {subscription.subscriptionStatus === "cancelled"
                      ? "Access Until"
                      : "Renews"}
                  </p>
                  <p className="mt-1 text-stone-900">
                    {formatDate(subscription.subscriptionEndDate)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {subscription?.subscriptionStatus === "cancelled" && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">
                  Subscription Cancelled
                </p>
                <p className="text-sm text-amber-700">
                  You'll continue to have access until{" "}
                  {formatDate(subscription.subscriptionEndDate)}. After that,
                  you can resubscribe anytime.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {subscription?.hasStripeSubscription && (
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="gap-2"
              >
                {portalLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CreditCard className="size-4" />
                )}
                Manage Billing
                <ExternalLink className="size-3" />
              </Button>
            )}

            {!subscription?.subscriptionType && (
              <Button onClick={() => router.push("/pricing")} className="gap-2">
                <Crown className="size-4" />
                View Plans
              </Button>
            )}

            {subscription?.subscriptionStatus === "active" ||
            subscription?.subscriptionStatus === "trialing" ? (
              <Button
                variant="ghost"
                onClick={() => setShowCancelDialog(true)}
                className="text-stone-500 hover:text-red-600"
              >
                Cancel Subscription
              </Button>
            ) : null}
          </div>
        </div>

        {/* Plans Section */}
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 px-6 py-8 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <Sparkles className="size-6 text-rose-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {subscription?.subscriptionType === "trial" ||
              !subscription?.subscriptionType
                ? "Choose Your Plan"
                : "Your Membership"}
            </h2>
            <p className="mt-2 text-sm text-stone-400">
              {subscription?.subscriptionType === "trial" ||
              !subscription?.subscriptionType
                ? "Unlock unlimited access to Alexandria and Kim"
                : "Manage your membership and explore upgrades"}
            </p>
          </div>

          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              {upgradePlans.map((plan) => {
                const isCurrentPlan =
                  plan.id === subscription?.subscriptionType;

                return (
                  <div
                    key={plan.id}
                    className={`group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-300 ${
                      isCurrentPlan
                        ? "border-emerald-300 bg-emerald-50/50 shadow-lg ring-2 ring-emerald-300"
                        : plan.popular
                          ? "border-rose-200 bg-white shadow-md hover:-translate-y-1 hover:border-rose-300 hover:shadow-xl"
                          : "border-stone-200 bg-white hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg"
                    }`}
                  >
                    {/* Top accent bar */}
                    <div
                      className={`h-1 w-full ${
                        isCurrentPlan
                          ? "bg-gradient-to-r from-emerald-400 to-green-500"
                          : plan.popular
                            ? "bg-gradient-to-r from-rose-500 to-red-600"
                            : "bg-gradient-to-r from-stone-300 to-stone-400"
                      }`}
                    />

                    {/* Badge */}
                    {plan.popular && !isCurrentPlan && (
                      <div className="absolute right-3 top-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                          <Star className="size-3" />
                          Most Popular
                        </span>
                      </div>
                    )}
                    {isCurrentPlan && (
                      <div className="absolute right-3 top-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                          <Check className="size-3" />
                          Active
                        </span>
                      </div>
                    )}

                    <div className="flex flex-1 flex-col p-5 pt-4">
                      <div className="mb-4">
                        <h3 className="text-base font-bold text-stone-900">
                          {plan.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {plan.description}
                        </p>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold tracking-tight text-stone-900">
                            {plan.price}
                          </span>
                          <span className="text-sm font-medium text-stone-400">
                            {plan.period}
                          </span>
                        </div>
                      </div>

                      {plan.savings && (
                        <div className="mb-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700">
                            <Gift className="size-3" />
                            {plan.savings}
                          </span>
                        </div>
                      )}

                      <ul className="mb-6 flex-1 space-y-2.5">
                        {plan.features.map((feature, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-sm text-stone-600"
                          >
                            <div
                              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${
                                isCurrentPlan
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "bg-rose-50 text-rose-500"
                              }`}
                            >
                              <Check className="size-2.5" strokeWidth={3} />
                            </div>
                            <span className="leading-tight">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        size="lg"
                        className={`w-full gap-2 font-semibold transition-all duration-200 ${
                          isCurrentPlan
                            ? "bg-emerald-600 shadow-sm hover:bg-emerald-700"
                            : plan.popular
                              ? "bg-gradient-to-r from-rose-600 to-red-600 shadow-md shadow-rose-500/20 hover:from-rose-700 hover:to-red-700 hover:shadow-lg hover:shadow-rose-500/30"
                              : "bg-stone-900 hover:bg-stone-800"
                        }`}
                        onClick={() => !isCurrentPlan && handleUpgrade(plan.id)}
                        disabled={isCurrentPlan || upgradeLoading === plan.id}
                      >
                        {upgradeLoading === plan.id ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Processing...
                          </>
                        ) : isCurrentPlan ? (
                          <>
                            <Check className="size-4" />
                            Current Plan
                          </>
                        ) : (
                          <>
                            {subscription?.subscriptionType === "trial" ||
                            !subscription?.subscriptionType
                              ? "Get Started"
                              : "Upgrade Now"}
                            <ArrowRight className="size-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {subscription?.subscriptionType === "trial" && (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                <span className="font-semibold">Trial ending soon?</span> Your
                trial includes full access to all features. Choose a plan above
                to continue working with Alexandria and Kim.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="size-5 text-amber-500" />
              Cancel Subscription?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-stone-600">
              Are you sure you want to cancel your subscription? You'll continue
              to have access until the end of your current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-lg">
              <X className="mr-1.5 size-4" />
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              {cancelling ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 size-4" />
              )}
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
