"use client";

import { ChevronRight, Loader2, Shield } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logClientError } from "@/lib/client-logger";
import { cn, getCsrfToken, initCsrfToken } from "@/lib/utils";

const PaymentSuccess = dynamic(() => import("./components/payment-success"), {
	loading: () => (
		<div className="flex min-h-screen items-center justify-center bg-stone-50">
			<div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
		</div>
	),
});
const WelcomeStep = dynamic(() => import("./components/welcome-step"), {
	loading: () => (
		<div className="flex min-h-screen items-center justify-center bg-stone-50">
			<div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
		</div>
	),
});

const ALECCI_LOGO_URL = "/images/alecci-media-logo.webp";

const planDetails = {
	monthly: {
		name: "Monthly",
		price: "$297",
		period: "/month",
		description: "Full access, cancel anytime",
	},
	annual: {
		name: "Annual",
		price: "$2,500",
		period: "/year",
		description: "Save over $1,000 annually",
		badge: "Best Value",
	},
	lifetime: {
		name: "Lifetime",
		price: "$3,500",
		period: "one-time",
		description: "Forever access, limited seats",
		badge: "Exclusive",
	},
};

const industries = [
	"Technology",
	"Healthcare",
	"Finance",
	"E-commerce",
	"Manufacturing",
	"Consulting",
	"Marketing & Advertising",
	"Real Estate",
	"Education",
	"Legal",
	"Hospitality",
	"Other",
];

function isInternalPath(path: string): boolean {
	return path.startsWith("/") && !path.startsWith("//");
}

function SubscribeContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const plan = searchParams.get("plan") as keyof typeof planDetails | null;
	const reason = searchParams.get("reason");
	const payment = searchParams.get("payment"); // "success" after Stripe checkout
	const welcome = searchParams.get("welcome");
	const rawRedirect = searchParams.get("redirect");
	const redirectPath =
		rawRedirect && isInternalPath(rawRedirect) ? rawRedirect : "/new";
	const [isLoading, setIsLoading] = useState(false);
	const [checkingSubscription, setCheckingSubscription] = useState(true);
	const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
	const [showWelcome, setShowWelcome] = useState(welcome === "true");

	const [retryLoading, setRetryLoading] = useState(false);
	const [retryFailed, setRetryFailed] = useState(false);
	const [sessionLost, setSessionLost] = useState(false);
	const [displayName, setDisplayName] = useState("");
	const [industry, setIndustry] = useState("");

	const selectedPlan = plan && planDetails[plan] ? planDetails[plan] : null;

	useEffect(() => {
		let pollInterval: NodeJS.Timeout | null = null;
		let pollCount = 0;
		const maxPolls = 15; // 60 seconds max (15 * 4s)
		let isMounted = true;
		let consecutiveUnauthCount = 0;

		async function checkSubscription() {
			try {
				const res = await fetch("/api/subscription");
				const data = await res.json();

				if (!isMounted) return;

				if (data.isActive) {
					setHasActiveSubscription(true);
					if (pollInterval) clearInterval(pollInterval);
					// If payment=success, show success page, otherwise redirect
					if (payment !== "success") {
						router.push(redirectPath);
						return;
					}
					setCheckingSubscription(false);
				} else if (payment === "success") {
					// Detect session loss: if we keep getting isActive=false with
					// no subscription info, the session is probably gone
					if (!data.subscriptionStatus && !data.hasStripeSubscription) {
						consecutiveUnauthCount++;
					} else {
						consecutiveUnauthCount = 0;
					}

					// After 5 consecutive unauthenticated responses, stop polling
					// and prompt re-login immediately (don't waste 60s)
					if (consecutiveUnauthCount >= 5) {
						if (pollInterval) clearInterval(pollInterval);
						setSessionLost(true);
						setCheckingSubscription(false);
						return;
					}

					if (pollCount < maxPolls) {
						// Keep polling - webhook might not have processed yet
						return;
					}
					setCheckingSubscription(false);
				} else {
					setCheckingSubscription(false);
				}
			} catch (error) {
				logClientError(error, {
					component: "SubscribePage",
					action: "check_subscription",
					payment,
				});
				if (!isMounted) return;
				// On error during payment success, keep polling unless we hit max
				if (payment === "success" && pollCount < maxPolls) {
					return;
				}
				setCheckingSubscription(false);
			}
		}

		checkSubscription();

		// If payment=success, poll for subscription activation
		if (payment === "success") {
			pollInterval = setInterval(() => {
				pollCount++;
				if (pollCount >= maxPolls) {
					if (pollInterval) clearInterval(pollInterval);
					// Don't assume success - show error state so user isn't
					// falsely redirected to a protected route and bounced back
					setCheckingSubscription(false);
					return;
				}
				checkSubscription();
			}, 4000);
		}

		return () => {
			isMounted = false;
			if (pollInterval) clearInterval(pollInterval);
		};
	}, [router, redirectPath, payment]);

	const handleSaveAndCheckout = async () => {
		if (!displayName.trim()) {
			toast({ type: "error", description: "Please enter your name" });
			return;
		}
		if (!industry) {
			toast({ type: "error", description: "Please select your industry" });
			return;
		}

		setIsLoading(true);

		try {
			await initCsrfToken();
			const csrfToken = getCsrfToken() || "";

			const profileRes = await fetch("/api/profile", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": csrfToken,
				},
				body: JSON.stringify({ displayName, industry }),
			});

			if (!profileRes.ok) {
				logClientError(new Error("Failed to save profile"), {
					component: "SubscribePage",
					action: "save_profile",
					status: profileRes.status,
				});
			}

			const response = await fetch("/api/stripe/checkout", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": csrfToken,
				},
				body: JSON.stringify({ planId: activePlanId }),
			});

			const data = await response.json();

			if (response.status === 401) {
				toast({ type: "error", description: "Please log in to continue" });
				router.push(`/login?plan=${activePlanId}`);
				return;
			}

			if (!response.ok) {
				toast({
					type: "error",
					description: data.error || "Failed to start checkout",
				});
				setIsLoading(false);
				return;
			}

			if (data.url) {
				window.location.href = data.url;
			} else {
				toast({ type: "error", description: "Unable to start checkout" });
				setIsLoading(false);
			}
		} catch (error) {
			logClientError(error, {
				component: "SubscribePage",
				action: "checkout",
				planId: activePlanId,
			});
			toast({ type: "error", description: "Network error. Please try again." });
			setIsLoading(false);
		}
	};

	// Show loading spinner while checking
	if (checkingSubscription) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-stone-50">
				<div className="animate-fade-in flex flex-col items-center gap-4">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
				</div>
			</div>
		);
	}

	// Show success page after payment
	if (payment === "success" && hasActiveSubscription) {
		return <PaymentSuccess redirectPath={redirectPath} />;
	}

	// If payment=success but session was lost, prompt re-login immediately
	if (payment === "success" && sessionLost) {
		const loginUrl = `/login?redirect=${encodeURIComponent(`/subscribe?payment=success&redirect=${redirectPath}`)}`;

		return (
			<div className="flex min-h-screen items-center justify-center bg-stone-50">
				<div className="animate-fade-in flex flex-col items-center gap-4 text-center px-6">
					<div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
						<Shield className="h-8 w-8 text-amber-600" />
					</div>
					<h2 className="text-lg font-medium text-stone-900">
						Payment received!
					</h2>
					<p className="text-stone-600 max-w-xs">
						Your payment was successful. Please sign in to activate your
						account.
					</p>
					<Button
						size="lg"
						onClick={() => {
							window.location.href = loginUrl;
						}}
						className="mt-2 h-12 w-full max-w-xs bg-stone-900 text-white hover:bg-stone-800"
					>
						Sign in to continue
					</Button>
					<p className="text-sm text-stone-400 max-w-xs">
						If you have any issues, please{" "}
						<Link
							href="/contact"
							className="underline underline-offset-4 hover:text-stone-600"
						>
							contact support
						</Link>
					</p>
				</div>
			</div>
		);
	}

	// If payment=success but subscription not active yet, show activating state
	// with retry capability (polling timed out without confirmation)
	if (payment === "success") {
		const handleRetryCheck = async () => {
			setRetryLoading(true);
			// Poll multiple times (5 attempts, 4s apart) to handle slow webhooks
			for (let i = 0; i < 5; i++) {
				try {
					const res = await fetch("/api/subscription");
					const data = await res.json();
					if (data.isActive) {
						setHasActiveSubscription(true);
						setRetryLoading(false);
						return;
					}
					// Detect session loss during retry
					if (!data.subscriptionStatus && !data.hasStripeSubscription) {
						setSessionLost(true);
						setRetryLoading(false);
						return;
					}
				} catch (error) {
					logClientError(error, {
						component: "SubscribePage",
						action: "retry_check",
						attempt: i + 1,
					});
				}
				// Wait 4 seconds between attempts (except on last attempt)
				if (i < 4) {
					await new Promise((r) => setTimeout(r, 4000));
				}
			}
			setRetryLoading(false);
			setRetryFailed(true);
		};

		return (
			<div className="flex min-h-screen items-center justify-center bg-stone-50">
				<div className="animate-fade-in flex flex-col items-center gap-4 text-center px-6">
					{retryLoading ? (
						<>
							<div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
							<p className="text-stone-600">Activating your subscription...</p>
							<p className="text-sm text-stone-400">
								This may take a few seconds
							</p>
						</>
					) : (
						<>
							<p className="text-stone-600">
								Your payment was received! Activation is taking a moment.
							</p>
							<Button
								onClick={handleRetryCheck}
								className="mt-2 bg-stone-900 text-white hover:bg-stone-800"
							>
								Check Again
							</Button>
							{retryFailed && (
								<div className="mt-2 flex flex-col items-center gap-2">
									<p className="text-sm text-stone-500 max-w-xs">
										Your session may have expired. Try logging in again:
									</p>
									<Button
										variant="outline"
										onClick={() => {
											window.location.href = `/login?redirect=${encodeURIComponent(`/subscribe?payment=success&redirect=${redirectPath}`)}`;
										}}
										className="text-sm"
									>
										Log in again
									</Button>
								</div>
							)}
							<p className="text-sm text-stone-400 max-w-xs">
								If this persists, please{" "}
								<Link
									href="/contact"
									className="underline underline-offset-4 hover:text-stone-600"
								>
									contact support
								</Link>
							</p>
						</>
					)}
				</div>
			</div>
		);
	}

	if (showWelcome) {
		return <WelcomeStep onContinue={() => setShowWelcome(false)} />;
	}

	const activePlan = selectedPlan || planDetails.monthly;
	const activePlanId = plan || "monthly";

	return (
		<div className="relative min-h-screen bg-stone-50">
			{/* Refined background */}
			<div aria-hidden className="pointer-events-none absolute inset-0">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-100 via-stone-50 to-white" />
			</div>

			<div className="relative z-10 mx-auto max-w-lg px-6 py-16 sm:py-24">
				{/* Logo */}
				<div className="animate-fade-slide-down mb-12 flex justify-center">
					<Image
						src={ALECCI_LOGO_URL}
						alt="Alecci Media"
						width={160}
						height={40}
						className="h-9 w-auto object-contain"
						priority
					/>
				</div>

				{/* Main card */}
				<div className="animate-fade-slide-up relative [animation-delay:100ms]">
					<div className="rounded-2xl border border-stone-200/60 bg-white shadow-xl shadow-stone-200/20">
						{/* Top accent */}
						<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stone-900/20 to-transparent" />

						<div className="p-8 sm:p-10">
							{/* Header */}
							<div className="mb-8 text-center">
								<h1 className="animate-fade-in text-2xl font-light text-stone-900 tracking-tight sm:text-3xl [animation-delay:200ms]">
									{reason === "expired"
										? "Renew Your Access"
										: "Start Your Journey"}
								</h1>
								<p className="animate-fade-in mt-2 text-stone-500 [animation-delay:250ms]">
									{reason === "expired"
										? "Continue where you left off"
										: "14-day free trial, then subscribe"}
								</p>
							</div>

							{/* Plan selector */}
							<div className="animate-fade-in mb-8 [animation-delay:300ms]">
								<div className="rounded-xl border border-stone-100 bg-stone-50/50 p-5">
									<div className="flex items-center justify-between">
										<div>
											<div className="flex items-center gap-2">
												<span className="font-medium text-stone-900">
													{activePlan.name}
												</span>
												{"badge" in activePlan &&
													(activePlan as { badge?: string }).badge && (
														<span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
															{(activePlan as { badge: string }).badge}
														</span>
													)}
											</div>
											<p className="mt-0.5 text-sm text-stone-500">
												{activePlan.description}
											</p>
										</div>
										<div className="text-right">
											<span className="text-2xl font-light text-stone-900">
												{activePlan.price}
											</span>
											<span className="text-sm text-stone-400">
												{activePlan.period}
											</span>
										</div>
									</div>
									<button
										type="button"
										onClick={() => router.push("/pricing")}
										className="mt-4 flex w-full items-center justify-center gap-1 text-sm text-stone-500 transition-colors hover:text-stone-900"
									>
										View all plans
										<ChevronRight className="h-3.5 w-3.5" />
									</button>
								</div>
							</div>

							{/* Form */}
							<div className="animate-fade-in space-y-5 [animation-delay:350ms]">
								<div>
									<Label
										htmlFor="name"
										className="text-sm font-medium text-stone-700"
									>
										Your name
									</Label>
									<Input
										id="name"
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
										placeholder="Enter your full name"
										className="mt-2 h-11 border-stone-200 bg-white focus:border-stone-400 focus:ring-stone-400"
										autoFocus
									/>
								</div>

								<div>
									<Label
										htmlFor="industry"
										className="text-sm font-medium text-stone-700"
									>
										Industry
									</Label>
									<select
										id="industry"
										value={industry}
										onChange={(e) => setIndustry(e.target.value)}
										className="mt-2 h-11 w-full rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-0"
									>
										<option value="">Select your industry</option>
										{industries.map((ind) => (
											<option key={ind} value={ind}>
												{ind}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Trial notice */}
							<div className="animate-fade-in mt-6 rounded-lg border border-stone-100 bg-stone-50/50 p-4 [animation-delay:400ms]">
								<p className="text-center text-sm text-stone-600">
									<span className="font-medium text-stone-900">
										14 days free
									</span>
									{" \u00b7 "}
									Cancel anytime
									{" \u00b7 "}
									Secure checkout
								</p>
							</div>

							{/* CTA */}
							<div className="animate-fade-in mt-6 [animation-delay:450ms]">
								<Button
									size="lg"
									className={cn(
										"h-12 w-full bg-stone-900 text-white transition-all hover:bg-stone-800",
										"shadow-lg shadow-stone-900/10",
									)}
									onClick={handleSaveAndCheckout}
									disabled={isLoading}
								>
									{isLoading ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Processing...
										</>
									) : (
										"Continue to payment"
									)}
								</Button>
							</div>

							<p className="animate-fade-in mt-4 text-center text-xs text-stone-400 [animation-delay:500ms]">
								Your card will be saved securely for when your trial ends
							</p>
						</div>
					</div>
				</div>

				{/* Footer */}
				<p className="animate-fade-in mt-8 text-center text-sm text-stone-400 [animation-delay:600ms]">
					Questions?{" "}
					<Link
						href="/contact"
						className="text-stone-600 underline-offset-4 hover:underline"
					>
						Contact us
					</Link>
				</p>
			</div>
		</div>
	);
}

export default function SubscribePage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-stone-50">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
				</div>
			}
		>
			<SubscribeContent />
		</Suspense>
	);
}
