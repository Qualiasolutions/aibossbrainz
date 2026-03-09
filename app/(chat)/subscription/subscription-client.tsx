"use client";

import {
	AlertTriangle,
	ArrowRight,
	Check,
	Crown,
	ExternalLink,
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
import { logClientError } from "@/lib/client-logger";
import { getCsrfToken, initCsrfToken } from "@/lib/utils";

export interface SubscriptionData {
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
		color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
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

export default function SubscriptionClient({
	initialSubscription,
}: {
	initialSubscription: SubscriptionData;
}) {
	const router = useRouter();
	const [subscription, setSubscription] =
		useState<SubscriptionData>(initialSubscription);
	const [showCancelDialog, setShowCancelDialog] = useState(false);
	const [cancelling, setCancelling] = useState(false);
	const [portalLoading, setPortalLoading] = useState(false);
	const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

	const loadData = async () => {
		try {
			const res = await fetch("/api/subscription");
			if (res.ok) {
				const data = await res.json();
				setSubscription(data);
			}
		} catch (error) {
			logClientError(error, {
				component: "SubscriptionPage",
				action: "load_subscription_data",
			});
			toast.error("Failed to load subscription data");
		}
	};

	useEffect(() => {
		void initCsrfToken();
	}, []);

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
			logClientError(error, {
				component: "SubscriptionPage",
				action: "open_billing_portal",
			});
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
				await loadData();
			} else {
				toast.error("Failed to cancel subscription");
			}
		} catch (error) {
			logClientError(error, {
				component: "SubscriptionPage",
				action: "cancel_subscription",
			});
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
			logClientError(error, {
				component: "SubscriptionPage",
				action: "upgrade",
				planId,
			});
			toast.error("Network error. Please check your connection and try again.");
			setUpgradeLoading(null);
		}
	};

	return (
		<main
			aria-label="Subscription Management"
			className="mx-auto max-w-4xl px-4 py-8"
		>
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-stone-900 dark:text-white">
					Subscription & Billing
				</h1>
				<p className="mt-1 text-stone-500 dark:text-slate-400">
					Manage your plan, billing, and membership
				</p>
			</div>

			<div className="space-y-6">
				<section
					aria-label="Current plan details"
					className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
				>
					<div className="mb-6 flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/50">
							<Crown className="size-5 text-rose-600 dark:text-rose-400" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-stone-900 dark:text-white">
								Current Plan
							</h2>
							<p className="text-sm text-stone-500 dark:text-slate-400">
								Your active subscription details
							</p>
						</div>
					</div>

					<div className="rounded-xl bg-stone-50 p-4 dark:bg-slate-700/50">
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<p className="text-sm font-medium text-stone-500 dark:text-slate-400">
									Plan
								</p>
								<p className="mt-1 text-lg font-semibold text-stone-900 dark:text-white">
									{getPlanName(subscription.subscriptionType)}
								</p>
							</div>
							<div>
								<p className="text-sm font-medium text-stone-500 dark:text-slate-400">
									Status
								</p>
								<div className="mt-1">
									{getStatusBadge(subscription.subscriptionStatus)}
								</div>
							</div>
							<div>
								<p className="text-sm font-medium text-stone-500 dark:text-slate-400">
									Start Date
								</p>
								<p className="mt-1 text-stone-900 dark:text-white">
									{formatDate(subscription.subscriptionStartDate)}
								</p>
							</div>
							<div>
								<p className="text-sm font-medium text-stone-500 dark:text-slate-400">
									End Date
								</p>
								<p className="mt-1 text-stone-900 dark:text-white">
									{formatDate(subscription.subscriptionEndDate)}
								</p>
							</div>
						</div>
					</div>

					<div className="mt-6 flex flex-wrap gap-3">
						{subscription.hasStripeSubscription && (
							<Button
								onClick={handleManageBilling}
								disabled={portalLoading}
								className="bg-stone-900 text-white hover:bg-stone-800"
							>
								{portalLoading ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<ExternalLink className="mr-2 size-4" />
								)}
								Manage Billing
							</Button>
						)}

						{subscription.subscriptionStatus === "active" && (
							<Button
								variant="outline"
								onClick={() => setShowCancelDialog(true)}
								className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
							>
								<X className="mr-2 size-4" />
								Cancel Subscription
							</Button>
						)}
					</div>
				</section>

				<section
					aria-label="Upgrade plans"
					className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
				>
					<div className="mb-6 flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50">
							<Sparkles className="size-5 text-amber-600 dark:text-amber-400" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-stone-900 dark:text-white">
								Upgrade Your Access
							</h2>
							<p className="text-sm text-stone-500 dark:text-slate-400">
								Choose the membership that fits your growth goals
							</p>
						</div>
					</div>

					<div className="grid gap-4 lg:grid-cols-3">
						{upgradePlans.map((plan) => {
							const isCurrentPlan = subscription.subscriptionType === plan.id;
							return (
								<div
									key={plan.id}
									className={`relative rounded-2xl border p-5 transition-all ${
										plan.popular
											? "border-rose-300 bg-rose-50/50 shadow-md dark:border-rose-700 dark:bg-rose-950/20"
											: "border-stone-200 bg-stone-50/50 dark:border-slate-700 dark:bg-slate-700/30"
									}`}
								>
									{plan.popular && (
										<div className="-top-3 absolute left-1/2 -translate-x-1/2">
											<span className="inline-flex items-center rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">
												<Star className="mr-1 size-3" />
												Most Popular
											</span>
										</div>
									)}

									<div className="mb-4">
										<h3 className="text-lg font-semibold text-stone-900 dark:text-white">
											{plan.name}
										</h3>
										<p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
											{plan.description}
										</p>
									</div>

									<div className="mb-4">
										<div className="flex items-baseline gap-1">
											<span className="text-3xl font-bold text-stone-900 dark:text-white">
												{plan.price}
											</span>
											<span className="text-sm text-stone-500 dark:text-slate-400">
												{plan.period}
											</span>
										</div>
										{plan.savings && (
											<p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
												{plan.savings}
											</p>
										)}
									</div>

									<ul className="mb-6 space-y-3">
										{plan.features.map((feature) => (
											<li key={feature} className="flex items-start gap-2">
												<Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
												<span className="text-sm text-stone-600 dark:text-slate-300">
													{feature}
												</span>
											</li>
										))}
									</ul>

									<Button
										onClick={() => handleUpgrade(plan.id)}
										disabled={isCurrentPlan || upgradeLoading === plan.id}
										className={`w-full ${
											plan.popular
												? "bg-rose-600 text-white hover:bg-rose-700"
												: "bg-stone-900 text-white hover:bg-stone-800"
										}`}
									>
										{upgradeLoading === plan.id ? (
											<Loader2 className="mr-2 size-4 animate-spin" />
										) : isCurrentPlan ? (
											<Check className="mr-2 size-4" />
										) : (
											<ArrowRight className="mr-2 size-4" />
										)}
										{isCurrentPlan ? "Current Plan" : "Choose Plan"}
									</Button>
								</div>
							);
						})}
					</div>
				</section>

				<section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
					<div className="flex items-start gap-3">
						<AlertTriangle className="mt-0.5 size-5 text-amber-600 dark:text-amber-400" />
						<div>
							<h2 className="font-semibold text-amber-900 dark:text-amber-100">
								Need help with billing?
							</h2>
							<p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
								If you have questions about your subscription, invoices, or
								account access, contact our team and we’ll sort it out.
							</p>
							<Button
								variant="link"
								className="mt-2 h-auto px-0 text-amber-900 dark:text-amber-100"
								onClick={() => router.push("/contact")}
							>
								Contact support
							</Button>
						</div>
					</div>
				</section>
			</div>

			<AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
						<AlertDialogDescription>
							Your subscription will remain active until the end of the current
							billing period. You can reactivate later from billing settings.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep subscription</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleCancelSubscription}
							disabled={cancelling}
							className="bg-red-600 text-white hover:bg-red-700"
						>
							{cancelling ? (
								<Loader2 className="mr-2 size-4 animate-spin" />
							) : null}
							Cancel subscription
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</main>
	);
}
