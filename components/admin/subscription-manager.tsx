"use client";

import { Ban, CreditCard, ExternalLink } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { SubscriptionType } from "@/lib/supabase/types";

interface SubscriptionManagerProps {
	userId: string;
	subscriptionType: string | null;
	subscriptionStatus: string | null;
	subscriptionStartDate: string | null;
	subscriptionEndDate: string | null;
	stripeCustomerId: string | null;
	stripeSubscriptionId: string | null;
	onChangeSubscription: (
		userId: string,
		subscriptionType: SubscriptionType,
	) => Promise<void>;
	onCancelSubscription: (userId: string) => Promise<void>;
}

function formatDate(dateString: string | null | undefined): string {
	if (!dateString) return "N/A";
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function formatSubscriptionType(type: string | null | undefined): string {
	switch (type) {
		case "trial":
			return "Trial (14 days)";
		case "monthly":
			return "Monthly";
		case "annual":
			return "Annual";
		case "lifetime":
			return "Lifetime";
		default:
			return "None";
	}
}

export function SubscriptionManager({
	userId,
	subscriptionType,
	subscriptionStatus,
	subscriptionStartDate,
	subscriptionEndDate,
	stripeCustomerId,
	stripeSubscriptionId,
	onChangeSubscription,
	onCancelSubscription,
}: SubscriptionManagerProps) {
	const [isPending, startTransition] = useTransition();
	const [showChangeDialog, setShowChangeDialog] = useState(false);
	const [showCancelDialog, setShowCancelDialog] = useState(false);
	const [selectedPlan, setSelectedPlan] = useState<SubscriptionType>(
		(subscriptionType as SubscriptionType) || "trial",
	);

	const isActive =
		subscriptionStatus === "active" || subscriptionStatus === "trialing";

	const handleChange = () => {
		startTransition(async () => {
			await onChangeSubscription(userId, selectedPlan);
			setShowChangeDialog(false);
		});
	};

	const handleCancel = () => {
		startTransition(async () => {
			await onCancelSubscription(userId);
			setShowCancelDialog(false);
		});
	};

	const stripeCustomerUrl = stripeCustomerId
		? `https://dashboard.stripe.com/customers/${stripeCustomerId}`
		: null;
	const stripeSubUrl = stripeSubscriptionId
		? `https://dashboard.stripe.com/subscriptions/${stripeSubscriptionId}`
		: null;

	return (
		<>
			<div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
				<h2 className="text-lg font-semibold text-neutral-900 mb-4">
					Subscription
				</h2>
				<dl className="space-y-3">
					<div>
						<dt className="text-sm text-neutral-500">Plan</dt>
						<dd className="text-neutral-900">
							<span
								className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
									subscriptionType === "trial"
										? "bg-amber-50 text-amber-700"
										: subscriptionType === "monthly"
											? "bg-blue-50 text-blue-700"
											: subscriptionType === "annual"
												? "bg-purple-50 text-purple-700"
												: subscriptionType === "lifetime"
													? "bg-rose-50 text-rose-700"
													: "bg-neutral-100 text-neutral-500"
								}`}
							>
								{formatSubscriptionType(subscriptionType)}
							</span>
						</dd>
					</div>
					<div>
						<dt className="text-sm text-neutral-500">Status</dt>
						<dd className="text-neutral-900">
							<span
								className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
									subscriptionStatus === "active"
										? "bg-emerald-50 text-emerald-700"
										: subscriptionStatus === "trialing"
											? "bg-amber-50 text-amber-700"
											: "bg-rose-50 text-rose-700"
								}`}
							>
								{subscriptionStatus || "None"}
							</span>
						</dd>
					</div>
					<div>
						<dt className="text-sm text-neutral-500">Start Date</dt>
						<dd className="text-neutral-900">
							{formatDate(subscriptionStartDate)}
						</dd>
					</div>
					<div>
						<dt className="text-sm text-neutral-500">End Date</dt>
						<dd className="text-neutral-900">
							{formatDate(subscriptionEndDate)}
						</dd>
					</div>
					<div>
						<dt className="text-sm text-neutral-500">Stripe Customer ID</dt>
						<dd className="text-neutral-900 font-mono text-sm">
							{stripeCustomerUrl ? (
								<a
									href={stripeCustomerUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
								>
									{stripeCustomerId}
									<ExternalLink className="h-3 w-3" />
								</a>
							) : (
								"Not connected"
							)}
						</dd>
					</div>
					<div>
						<dt className="text-sm text-neutral-500">Stripe Subscription ID</dt>
						<dd className="text-neutral-900 font-mono text-sm">
							{stripeSubUrl ? (
								<a
									href={stripeSubUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
								>
									{stripeSubscriptionId}
									<ExternalLink className="h-3 w-3" />
								</a>
							) : (
								"Not connected"
							)}
						</dd>
					</div>
				</dl>

				{/* Action buttons */}
				<div className="mt-5 pt-4 border-t border-neutral-100 flex flex-wrap gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setSelectedPlan(
								(subscriptionType as SubscriptionType) || "trial",
							);
							setShowChangeDialog(true);
						}}
						className="gap-1.5"
					>
						<CreditCard className="h-3.5 w-3.5" />
						Change Plan
					</Button>
					{isActive && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowCancelDialog(true)}
							className="gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
						>
							<Ban className="h-3.5 w-3.5" />
							Cancel Subscription
						</Button>
					)}
				</div>
			</div>

			{/* Change Plan Dialog */}
			<Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change Subscription Plan</DialogTitle>
						<DialogDescription>
							Select a new plan. If the user has an active Stripe subscription,
							it will be cancelled and replaced with the new plan.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>New Plan</Label>
							<Select
								value={selectedPlan}
								onValueChange={(v: SubscriptionType) => setSelectedPlan(v)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select plan" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="trial">Trial (14 days)</SelectItem>
									<SelectItem value="monthly">Monthly ($297/mo)</SelectItem>
									<SelectItem value="annual">Annual ($2,500)</SelectItem>
									<SelectItem value="lifetime">Lifetime ($3,500)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="text-sm text-neutral-500 bg-neutral-50 p-3 rounded-lg">
							<p className="font-medium mb-1">What happens:</p>
							<ul className="list-disc list-inside space-y-1">
								<li>Current Stripe subscription cancelled (if any)</li>
								<li>New subscription starts from today</li>
								<li>User gets immediate access</li>
							</ul>
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setShowChangeDialog(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleChange}
							disabled={isPending}
							className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"
						>
							{isPending ? "Updating..." : "Update Plan"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Cancel Subscription Dialog */}
			<Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cancel Subscription</DialogTitle>
						<DialogDescription>
							This will immediately cancel the user&apos;s subscription and
							revoke premium access.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 p-3 rounded-lg">
							<p className="font-medium mb-1">What happens:</p>
							<ul className="list-disc list-inside space-y-1">
								<li>
									Stripe subscription cancelled immediately (if connected)
								</li>
								<li>User loses access to premium features</li>
								<li>Status set to &quot;cancelled&quot;</li>
							</ul>
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setShowCancelDialog(false)}>
							Keep Active
						</Button>
						<Button
							onClick={handleCancel}
							disabled={isPending}
							className="bg-orange-600 hover:bg-orange-700"
						>
							{isPending ? "Cancelling..." : "Cancel Subscription"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
