"use client";

import { motion } from "framer-motion";
import {
	Check,
	ChevronRight,
	Loader2,
	Shield,
	Sparkles,
	Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "@/components/toast";
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
import { cn, getCsrfToken, initCsrfToken } from "@/lib/utils";

const ALECCI_LOGO_URL =
	"https://images.squarespace-cdn.com/content/v1/5ea759fa9e5575487ad28cd0/1591228238957-80Y8AGN1M9TTXTYNJ5QK/AM_Logo_Horizontal_4C+%281%29.jpg?format=500w";

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

// Success component shown after payment
function PaymentSuccess({ redirectPath }: { redirectPath: string }) {
	const [countdown, setCountdown] = useState(3);

	useEffect(() => {
		const timer = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(timer);
					// Use window.location for a clean redirect
					window.location.href = redirectPath;
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [redirectPath]);

	const handleStartNow = () => {
		window.location.href = redirectPath;
	};

	return (
		<div className="relative min-h-screen bg-stone-50">
			<div aria-hidden className="pointer-events-none absolute inset-0">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-100 via-stone-50 to-white" />
			</div>

			<div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16">
				{/* Logo */}
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mb-12"
				>
					<Image
						src={ALECCI_LOGO_URL}
						alt="Alecci Media"
						width={160}
						height={40}
						className="h-9 w-auto object-contain"
						priority
						unoptimized
					/>
				</motion.div>

				{/* Success card */}
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="w-full"
				>
					<div className="rounded-2xl border border-stone-200/60 bg-white p-10 text-center shadow-xl shadow-stone-200/20">
						{/* Success icon */}
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{
								duration: 0.4,
								delay: 0.2,
								type: "spring",
								stiffness: 200,
							}}
							className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-600"
						>
							<Check className="h-8 w-8 text-white" strokeWidth={3} />
						</motion.div>

						<motion.h1
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className="text-2xl font-light text-stone-900 tracking-tight sm:text-3xl"
						>
							Welcome to Boss Brainz!
						</motion.h1>

						<motion.p
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.35 }}
							className="mt-3 text-stone-500"
						>
							Thank you for subscribing! Your 14-day free trial has started. You
							now have full access to your AI executive team.
						</motion.p>

						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.4 }}
							className="mt-8"
						>
							<Button
								size="lg"
								onClick={handleStartNow}
								className="h-12 w-full bg-stone-900 text-white shadow-lg shadow-stone-900/10 transition-all hover:bg-stone-800"
							>
								Start Your First Conversation
							</Button>
						</motion.div>

						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.45 }}
							className="mt-4 text-sm text-stone-400"
						>
							Redirecting in {countdown} seconds...
						</motion.p>
					</div>
				</motion.div>
			</div>
		</div>
	);
}

const valueProps = [
	{ icon: Users, text: "AI executive team at your command" },
	{ icon: Sparkles, text: "Personalized strategy & insights" },
	{ icon: Shield, text: "14-day free trial, cancel anytime" },
];

function WelcomeStep({ onContinue }: { onContinue: () => void }) {
	return (
		<div className="relative min-h-screen bg-stone-50">
			<div aria-hidden className="pointer-events-none absolute inset-0">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-100 via-stone-50 to-white" />
			</div>

			<div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16">
				{/* Logo */}
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mb-12"
				>
					<Image
						src={ALECCI_LOGO_URL}
						alt="Alecci Media"
						width={160}
						height={40}
						className="h-9 w-auto object-contain"
						priority
						unoptimized
					/>
				</motion.div>

				{/* Welcome card */}
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="w-full"
				>
					<div className="rounded-2xl border border-stone-200/60 bg-white p-10 text-center shadow-xl shadow-stone-200/20">
						{/* Checkmark icon */}
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{
								duration: 0.4,
								delay: 0.2,
								type: "spring",
								stiffness: 200,
							}}
							className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-600"
						>
							<Check className="h-8 w-8 text-white" strokeWidth={3} />
						</motion.div>

						<motion.h1
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className="text-2xl font-light text-stone-900 tracking-tight sm:text-3xl"
						>
							Welcome!
						</motion.h1>

						<motion.p
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.35 }}
							className="mt-2 text-stone-500"
						>
							Your email has been confirmed
						</motion.p>

						{/* Value props */}
						<motion.ul
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.4 }}
							className="mt-8 space-y-4 text-left"
						>
							{valueProps.map(({ icon: Icon, text }, i) => (
								<motion.li
									key={text}
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.45 + i * 0.08 }}
									className="flex items-center gap-3"
								>
									<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100">
										<Icon className="h-4 w-4 text-stone-700" />
									</div>
									<span className="text-sm text-stone-600">{text}</span>
								</motion.li>
							))}
						</motion.ul>

						{/* CTA */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.7 }}
							className="mt-8"
						>
							<Button
								size="lg"
								onClick={onContinue}
								className="h-12 w-full bg-stone-900 text-white shadow-lg shadow-stone-900/10 transition-all hover:bg-stone-800"
							>
								Start 14-Day Free Trial
								<ChevronRight className="ml-1 h-4 w-4" />
							</Button>
						</motion.div>
					</div>
				</motion.div>
			</div>
		</div>
	);
}

function SubscribeContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const plan = searchParams.get("plan") as keyof typeof planDetails | null;
	const reason = searchParams.get("reason");
	const payment = searchParams.get("payment"); // "success" after Stripe checkout
	const welcome = searchParams.get("welcome");
	const redirectPath = searchParams.get("redirect") || "/new";
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
		const maxPolls = 30; // 60 seconds max (30 * 2s)
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
				console.error("Failed to check subscription:", error);
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
			}, 2000);
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
				console.error("Failed to save profile");
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
			console.error("Checkout error:", error);
			toast({ type: "error", description: "Network error. Please try again." });
			setIsLoading(false);
		}
	};

	// Show loading spinner while checking
	if (checkingSubscription) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-stone-50">
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="flex flex-col items-center gap-4"
				>
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
				</motion.div>
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
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="flex flex-col items-center gap-4 text-center px-6"
				>
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
				</motion.div>
			</div>
		);
	}

	// If payment=success but subscription not active yet, show activating state
	// with retry capability (polling timed out without confirmation)
	if (payment === "success") {
		const handleRetryCheck = async () => {
			setRetryLoading(true);
			// Poll multiple times (10 attempts, 2s apart) to handle slow webhooks
			for (let i = 0; i < 10; i++) {
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
					console.error("Retry check failed:", error);
				}
				// Wait 2 seconds between attempts (except on last attempt)
				if (i < 9) {
					await new Promise((r) => setTimeout(r, 2000));
				}
			}
			setRetryLoading(false);
			setRetryFailed(true);
		};

		return (
			<div className="flex min-h-screen items-center justify-center bg-stone-50">
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="flex flex-col items-center gap-4 text-center px-6"
				>
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
				</motion.div>
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
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mb-12 flex justify-center"
				>
					<Image
						src={ALECCI_LOGO_URL}
						alt="Alecci Media"
						width={160}
						height={40}
						className="h-9 w-auto object-contain"
						priority
						unoptimized
					/>
				</motion.div>

				{/* Main card */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="relative"
				>
					<div className="rounded-2xl border border-stone-200/60 bg-white shadow-xl shadow-stone-200/20">
						{/* Top accent */}
						<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stone-900/20 to-transparent" />

						<div className="p-8 sm:p-10">
							{/* Header */}
							<div className="mb-8 text-center">
								<motion.h1
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 0.2 }}
									className="text-2xl font-light text-stone-900 tracking-tight sm:text-3xl"
								>
									{reason === "expired"
										? "Renew Your Access"
										: "Start Your Journey"}
								</motion.h1>
								<motion.p
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 0.25 }}
									className="mt-2 text-stone-500"
								>
									{reason === "expired"
										? "Continue where you left off"
										: "14-day free trial, then subscribe"}
								</motion.p>
							</div>

							{/* Plan selector */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.3 }}
								className="mb-8"
							>
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
							</motion.div>

							{/* Form */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.35 }}
								className="space-y-5"
							>
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
									<Select value={industry} onValueChange={setIndustry}>
										<SelectTrigger className="mt-2 h-11 border-stone-200 bg-white focus:border-stone-400 focus:ring-stone-400">
											<SelectValue placeholder="Select your industry" />
										</SelectTrigger>
										<SelectContent>
											{industries.map((ind) => (
												<SelectItem key={ind} value={ind}>
													{ind}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</motion.div>

							{/* Trial notice */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.4 }}
								className="mt-6 rounded-lg border border-stone-100 bg-stone-50/50 p-4"
							>
								<p className="text-center text-sm text-stone-600">
									<span className="font-medium text-stone-900">
										14 days free
									</span>
									{" · "}
									Cancel anytime
									{" · "}
									Secure checkout
								</p>
							</motion.div>

							{/* CTA */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.45 }}
								className="mt-6"
							>
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
							</motion.div>

							<motion.p
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.5 }}
								className="mt-4 text-center text-xs text-stone-400"
							>
								Your card will be saved securely for when your trial ends
							</motion.p>
						</div>
					</div>
				</motion.div>

				{/* Footer */}
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.6 }}
					className="mt-8 text-center text-sm text-stone-400"
				>
					Questions?{" "}
					<Link
						href="/contact"
						className="text-stone-600 underline-offset-4 hover:underline"
					>
						Contact us
					</Link>
				</motion.p>
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
