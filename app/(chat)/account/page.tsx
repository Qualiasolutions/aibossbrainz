"use client";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  Gift,
  Loader2,
  Mail,
  Save,
  Sparkles,
  Star,
  Target,
  User,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPLOYEE_COUNT_RANGES,
  INDUSTRIES,
  REVENUE_RANGES,
  YEARS_IN_BUSINESS_RANGES,
} from "@/lib/constants/business-profile";
import { getCsrfToken, initCsrfToken } from "@/lib/utils";

interface ProfileData {
  id: string;
  email: string;
  displayName: string | null;
  companyName: string | null;
  industry: string | null;
  businessGoals: string | null;
  preferredBotType: string | null;
  onboardedAt: string | null;
  productsServices: string | null;
  websiteUrl: string | null;
  targetMarket: string | null;
  competitors: string | null;
  annualRevenue: string | null;
  yearsInBusiness: string | null;
  employeeCount: string | null;
}

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

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null,
  );
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  // Upgrade plans configuration with full details
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

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessGoals, setBusinessGoals] = useState("");
  const [productsServices, setProductsServices] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [annualRevenue, setAnnualRevenue] = useState("");
  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");

  useEffect(() => {
    initCsrfToken().then(() => loadData());
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, subRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/subscription"),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
        setDisplayName(data.displayName || "");
        setCompanyName(data.companyName || "");
        setIndustry(data.industry || "");
        setBusinessGoals(data.businessGoals || "");
        setProductsServices(data.productsServices || "");
        setWebsiteUrl(data.websiteUrl || "");
        setTargetMarket(data.targetMarket || "");
        setCompetitors(data.competitors || "");
        setAnnualRevenue(data.annualRevenue || "");
        setYearsInBusiness(data.yearsInBusiness || "");
        setEmployeeCount(data.employeeCount || "");
      }

      if (subRes.ok) {
        const data = await subRes.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error("Failed to load account data:", error);
      toast.error("Failed to load account data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const csrfToken = getCsrfToken() || "";
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          displayName: displayName || null,
          companyName: companyName || null,
          industry: industry || null,
          businessGoals: businessGoals || null,
          productsServices: productsServices || null,
          websiteUrl: websiteUrl || null,
          targetMarket: targetMarket || null,
          competitors: competitors || null,
          annualRevenue: annualRevenue || null,
          yearsInBusiness: yearsInBusiness || null,
          employeeCount: employeeCount || null,
        }),
      });

      if (res.ok) {
        toast.success("Profile updated successfully");
        loadData();
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string | null | undefined) => {
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
  };

  const getPlanName = (type: string | null | undefined) => {
    const plans = {
      trial: "Free Trial",
      monthly: "Most Flexible (Monthly)",
      annual: "Best Value (Annual)",
      lifetime: "Exclusive Lifetime",
    };
    return plans[type as keyof typeof plans] || "No Plan";
  };

  // Get available upgrade plans based on current subscription
  const getAvailableUpgrades = (): UpgradePlan[] => {
    const currentType = subscription?.subscriptionType;

    // Trial users can upgrade to any plan
    if (currentType === "trial" || !currentType) {
      return upgradePlans;
    }

    // Monthly users can upgrade to annual or lifetime
    if (currentType === "monthly") {
      return upgradePlans.filter((p) => p.id === "annual" || p.id === "lifetime");
    }

    // Annual users can upgrade to lifetime only
    if (currentType === "annual") {
      return upgradePlans.filter((p) => p.id === "lifetime");
    }

    // Lifetime users - no upgrades available
    return [];
  };

  const handleUpgrade = async (planId: string) => {
    setUpgradeLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        <h1 className="text-3xl font-bold text-stone-900">Account Settings</h1>
        <p className="mt-1 text-stone-500">
          Manage your profile and subscription
        </p>
      </div>

      <div className="space-y-6">
        {/* Subscription Section */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-100">
              <Crown className="size-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Subscription
              </h2>
              <p className="text-sm text-stone-500">
                Your current plan and billing
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

        {/* Plans Section - Shows all 3 plans with current plan highlighted */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600">
              <Sparkles className="size-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                {subscription?.subscriptionType === "trial" || !subscription?.subscriptionType
                  ? "Choose Your Plan"
                  : "Available Plans"}
              </h2>
              <p className="text-sm text-stone-500">
                {subscription?.subscriptionType === "trial" || !subscription?.subscriptionType
                  ? "Select a plan to continue accessing Alexandria and Kim"
                  : "View all plans and upgrade anytime"}
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {upgradePlans.map((plan) => {
              const isCurrentPlan = plan.id === subscription?.subscriptionType;
              const isUpgrade = getAvailableUpgrades().some((p) => p.id === plan.id);

              return (
                <div
                  key={plan.id}
                  className={`relative overflow-hidden rounded-2xl border transition-all ${
                    isCurrentPlan
                      ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-400"
                      : plan.popular
                        ? "border-red-300 bg-gradient-to-br from-red-50 to-rose-50 shadow-md shadow-red-500/10 hover:shadow-lg"
                        : "border-stone-200 bg-stone-50/50 hover:border-stone-300 hover:shadow-lg"
                  }`}
                >
                  {plan.popular && !isCurrentPlan && (
                    <div className="absolute -right-10 top-4 rotate-45 bg-gradient-to-r from-red-600 to-rose-600 px-10 py-1 text-center text-xs font-bold text-white shadow-sm">
                      BEST VALUE
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute -right-10 top-4 rotate-45 bg-gradient-to-r from-emerald-600 to-green-600 px-10 py-1 text-center text-xs font-bold text-white shadow-sm">
                      CURRENT PLAN
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div
                        className={`flex size-10 items-center justify-center rounded-xl ${
                          isCurrentPlan
                            ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white"
                            : plan.popular
                              ? "bg-gradient-to-br from-red-500 to-rose-600 text-white"
                              : "bg-stone-200 text-stone-600"
                        }`}
                      >
                        {isCurrentPlan ? (
                          <Check className="size-5" />
                        ) : plan.popular ? (
                          <Star className="size-5" />
                        ) : (
                          <Crown className="size-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-stone-900">{plan.name}</h3>
                        <p className="text-xs text-stone-500">{plan.description}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-stone-900">
                          {plan.price}
                        </span>
                        <span className="text-lg text-stone-500">{plan.period}</span>
                      </div>
                    </div>

                    {plan.savings && (
                      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                        <Gift className="size-3.5" />
                        {plan.savings}
                      </div>
                    )}

                    <ul className="mb-5 space-y-2.5">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                          <Check className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      size="lg"
                      className={`w-full gap-2 ${
                        isCurrentPlan
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : plan.popular
                            ? "shadow-md shadow-red-500/20"
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
                          {subscription?.subscriptionType === "trial" || !subscription?.subscriptionType
                            ? "Get Started"
                            : "Upgrade"}
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
            <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              <span className="font-semibold">Trial ending soon?</span> Your trial
              includes full access to all features. Choose a plan above to continue
              working with Alexandria and Kim.
            </div>
          )}
        </div>

        {/* Profile Section */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100">
              <User className="size-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Profile</h2>
              <p className="text-sm text-stone-500">
                Your personal information
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Email (read-only) */}
            <div>
              <Label className="text-sm font-medium text-stone-700">
                <Mail className="mr-1.5 inline size-4" />
                Email Address
              </Label>
              <Input
                value={profile?.email || ""}
                disabled
                className="mt-1.5 bg-stone-50 text-stone-500"
              />
              <p className="mt-1 text-xs text-stone-400">
                Contact support to change your email
              </p>
            </div>

            {/* Display Name */}
            <div>
              <Label
                htmlFor="displayName"
                className="text-sm font-medium text-stone-700"
              >
                <User className="mr-1.5 inline size-4" />
                Display Name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="mt-1.5"
              />
            </div>

            {/* Company Name */}
            <div>
              <Label
                htmlFor="companyName"
                className="text-sm font-medium text-stone-700"
              >
                <Building2 className="mr-1.5 inline size-4" />
                Company Name
              </Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company"
                className="mt-1.5"
              />
            </div>

            {/* Industry */}
            <div>
              <Label
                htmlFor="industry"
                className="text-sm font-medium text-stone-700"
              >
                Industry
              </Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Business Profile Section */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-rose-100">
              <Building2 className="size-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Business Profile
              </h2>
              <p className="text-sm text-stone-500">
                Help Alexandria and Kim understand your business
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Products/Services */}
            <div>
              <Label
                htmlFor="productsServices"
                className="text-sm font-medium text-stone-700"
              >
                Products / Services
              </Label>
              <Textarea
                id="productsServices"
                value={productsServices}
                onChange={(e) => setProductsServices(e.target.value)}
                placeholder="What does your business offer?"
                className="mt-1.5 min-h-[80px]"
              />
            </div>

            {/* Website URL */}
            <div>
              <Label
                htmlFor="websiteUrl"
                className="text-sm font-medium text-stone-700"
              >
                Website
              </Label>
              <Input
                id="websiteUrl"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourcompany.com"
                className="mt-1.5"
              />
            </div>

            {/* Target Market */}
            <div>
              <Label
                htmlFor="targetMarket"
                className="text-sm font-medium text-stone-700"
              >
                Target Market
              </Label>
              <Input
                id="targetMarket"
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value)}
                placeholder="Who are your ideal customers?"
                className="mt-1.5"
              />
            </div>

            {/* Competitors */}
            <div>
              <Label
                htmlFor="competitors"
                className="text-sm font-medium text-stone-700"
              >
                Competitors
              </Label>
              <Input
                id="competitors"
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                placeholder="Key competitors or alternatives"
                className="mt-1.5"
              />
            </div>

            {/* Business Goals */}
            <div>
              <Label
                htmlFor="businessGoals"
                className="text-sm font-medium text-stone-700"
              >
                <Target className="mr-1.5 inline size-4" />
                Business Goals
              </Label>
              <Textarea
                id="businessGoals"
                value={businessGoals}
                onChange={(e) => setBusinessGoals(e.target.value)}
                placeholder="What are you trying to achieve?"
                className="mt-1.5 min-h-[100px]"
              />
            </div>

            {/* Dropdowns row */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Annual Revenue */}
              <div>
                <Label className="text-sm font-medium text-stone-700">
                  Annual Revenue
                </Label>
                <Select value={annualRevenue} onValueChange={setAnnualRevenue}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    {REVENUE_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Years in Business */}
              <div>
                <Label className="text-sm font-medium text-stone-700">
                  Years in Business
                </Label>
                <Select
                  value={yearsInBusiness}
                  onValueChange={setYearsInBusiness}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS_IN_BUSINESS_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Count */}
              <div>
                <Label className="text-sm font-medium text-stone-700">
                  Team Size
                </Label>
                <Select value={employeeCount} onValueChange={setEmployeeCount}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_COUNT_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save Changes
          </Button>
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
