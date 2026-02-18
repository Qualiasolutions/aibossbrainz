"use client";

import { motion, useInView } from "framer-motion";
import {
	ArrowRight,
	Calendar,
	Check,
	Clock,
	Gift,
	Loader2,
	MessageSquare,
	Phone,
	Sparkles,
	Star,
	Target,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { cn, getCsrfToken, initCsrfToken } from "@/lib/utils";

interface PricingFeature {
	text: string;
	icon: typeof Phone;
	highlight?: boolean;
}

interface PricingPlan {
	id: string;
	name: string;
	price: number;
	period: string;
	description: string;
	popular: boolean;
	savings?: string;
	features: PricingFeature[];
	cta: string;
	ctaLink: string;
}

const pricingPlans: PricingPlan[] = [
	{
		id: "monthly",
		name: "Most Flexible",
		price: 297,
		period: "Monthly",
		description: "Monthly Membership",
		popular: false,
		features: [
			{
				text: "Sales and Marketing Message Makeover",
				icon: MessageSquare,
			},
			{
				text: "Prompt Guide",
				icon: Zap,
			},
			{
				text: "24/7 Access",
				icon: Clock,
			},
			{
				text: "Cancel Anytime",
				icon: Check,
			},
		],
		cta: "Start 14-Day Free Trial",
		ctaLink: "/signup?plan=monthly",
	},
	{
		id: "annual",
		name: "Best Value",
		price: 2500,
		period: "Annual",
		description: "Annual Membership",
		popular: true,
		savings: "SAVE $1,000 + EXCLUSIVE BONUSES",
		features: [
			{
				text: "Everything in Monthly Subscription",
				icon: Check,
			},
			{
				text: "The Sales & Marketing Checkup",
				icon: Target,
				highlight: true,
			},
			{
				text: "Access to Our Resource Library",
				icon: Gift,
				highlight: true,
			},
			{
				text: "Monthly Group Sales & Marketing Strategy Call",
				icon: Phone,
				highlight: true,
			},
		],
		cta: "Start 14-Day Free Trial",
		ctaLink: "/signup?plan=annual",
	},
	{
		id: "lifetime",
		name: "Exclusive Lifetime",
		price: 3500,
		period: "One-Time",
		description: "Limited to 10 Seats Only",
		popular: false,
		savings: "ONE PAYMENT. NO SURPRISES. EVER.",
		features: [
			{
				text: "Everything in Monthly Membership",
				icon: Check,
			},
			{
				text: "Private Quarterly Coaching Calls",
				icon: Users,
				highlight: true,
			},
			{
				text: "Lifetime Sales + Marketing Support",
				icon: Star,
				highlight: true,
			},
			{
				text: "Fresh insights & real-time pivots every 90 days",
				icon: Sparkles,
				highlight: true,
			},
		],
		cta: "Claim Your Seat",
		ctaLink: "/signup?plan=lifetime",
	},
];

function PricingCard({
	plan,
	index,
	loading,
	onSelectPlan,
}: {
	plan: PricingPlan;
	index: number;
	loading: string | null;
	onSelectPlan: (planId: string) => void;
}) {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, margin: "-50px" });
	const isLoading = loading === plan.id;

	return (
		<motion.div
			ref={ref}
			initial={{ opacity: 0, y: 30 }}
			animate={isInView ? { opacity: 1, y: 0 } : {}}
			transition={{ duration: 0.6, delay: index * 0.15 }}
			className={cn(
				"relative flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-all hover:shadow-xl",
				plan.popular
					? "border-red-300 shadow-lg shadow-red-500/10"
					: "border-stone-200",
			)}
		>
			{/* Popular Badge */}
			{plan.popular && (
				<div className="absolute -right-12 top-8 rotate-45 bg-gradient-to-r from-red-600 to-rose-600 px-12 py-1.5 text-center text-xs font-bold text-white shadow-lg">
					BEST VALUE
				</div>
			)}

			{/* Header */}
			<div
				className={cn(
					"p-6 sm:p-8",
					plan.popular
						? "bg-gradient-to-br from-red-50 to-rose-50"
						: "bg-stone-50/50",
				)}
			>
				<div className="flex items-center gap-3">
					<div
						className={cn(
							"flex size-10 items-center justify-center rounded-xl",
							plan.popular
								? "bg-gradient-to-br from-red-500 to-rose-600 text-white"
								: "bg-stone-100 text-stone-600",
						)}
					>
						{plan.popular ? (
							<Star className="size-5" />
						) : (
							<Calendar className="size-5" />
						)}
					</div>
					<div>
						<h3 className="font-bold text-xl text-stone-900">{plan.name}</h3>
						<p className="text-sm text-stone-500">{plan.description}</p>
					</div>
				</div>

				<div className="mt-6">
					<div className="flex items-baseline gap-2">
						<span className="font-bold text-5xl tracking-tight text-stone-900">
							${plan.price.toLocaleString()}
						</span>
						<span className="text-lg text-stone-500">{plan.period}</span>
					</div>
					{plan.savings && (
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={isInView ? { scale: 1, opacity: 1 } : {}}
							transition={{ delay: 0.3 }}
							className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-1.5 text-sm font-semibold text-green-700"
						>
							<Gift className="size-4" />
							{plan.savings}
						</motion.div>
					)}
				</div>
			</div>

			{/* Features */}
			<div className="flex flex-1 flex-col p-6 sm:p-8">
				<div className="flex-1 space-y-4">
					{plan.features.map((feature, i) => (
						<motion.div
							key={feature.text}
							initial={{ opacity: 0, x: -10 }}
							animate={isInView ? { opacity: 1, x: 0 } : {}}
							transition={{ delay: 0.2 + i * 0.05 }}
							className={cn(
								"flex items-start gap-3 rounded-xl p-3 transition-colors",
								feature.highlight
									? "bg-gradient-to-r from-red-50 to-rose-50"
									: "hover:bg-stone-50",
							)}
						>
							<div
								className={cn(
									"flex size-8 shrink-0 items-center justify-center rounded-lg",
									feature.highlight
										? "bg-gradient-to-br from-red-500 to-rose-600 text-white"
										: "bg-stone-100 text-stone-600",
								)}
							>
								<feature.icon className="size-4" />
							</div>
							<div className="flex-1">
								<p
									className={cn(
										"font-medium text-sm",
										feature.highlight ? "text-stone-900" : "text-stone-700",
									)}
								>
									{feature.text}
								</p>
								<p
									className={cn(
										"mt-0.5 text-xs",
										feature.highlight
											? "text-red-600 font-semibold"
											: "text-stone-500",
									)}
								>
									VALUED at {feature.value}
								</p>
							</div>
						</motion.div>
					))}
				</div>

				{/* Total Value */}
				<div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-stone-50/50 p-4 text-center">
					<p className="text-sm text-stone-500">Total Value</p>
					<p className="font-bold text-2xl text-stone-900">{plan.totalValue}</p>
				</div>

				{/* CTA */}
				<Button
					size="lg"
					className={cn(
						"mt-6 w-full gap-2 text-base",
						plan.popular
							? "shadow-xl shadow-red-500/20"
							: "bg-stone-900 hover:bg-stone-800",
					)}
					variant={plan.popular ? "default" : "premium"}
					onClick={() => onSelectPlan(plan.id)}
					disabled={loading !== null}
				>
					{isLoading ? (
						<>
							<Loader2 className="size-4 animate-spin" />
							Processing...
						</>
					) : (
						<>
							{plan.cta}
							<ArrowRight className="size-4" />
						</>
					)}
				</Button>
			</div>
		</motion.div>
	);
}

function FAQSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, margin: "-100px" });

	const faqs = [
		{
			question: "Can I cancel my subscription?",
			answer:
				"Your subscription is yours to control -- upgrade, downgrade, or cancel whenever you want. No penalties, no hassle.",
		},
		{
			question: "What is 24/7 Access?",
			answer:
				"You get unlimited access to our AI executive platform anytime, anywhere. Chat with Alexandria (CMO) or Kim (CSO) whenever you need strategic guidance - day or night. Don't forget, you can hear their voices too!",
		},
		{
			question: "What's the Sales & Marketing Checkup?",
			answer:
				"A comprehensive audit of your current sales and marketing operations. We analyze your pipeline, messaging, campaigns, and provide a prioritized action plan.",
		},
		{
			question: "Why choose the Annual plan?",
			answer:
				"The Annual plan saves you $1,000 compared to monthly AND includes exclusive bonuses: Monthly Group Strategy Calls ($6,000 value), Resource Library access ($1,000+ value), and the Sales & Marketing Checkup ($97 value).",
		},
		{
			question: "What's included in Lifetime Access?",
			answer:
				"Limited to just 10 seats, Lifetime Access includes everything in the monthly membership PLUS Private Quarterly Coaching Calls with founders Alexandria and Kim, and Lifetime Sales + Marketing Support. One payment. No BS. No surprises. Ever.",
		},
	];

	return (
		<section ref={ref} className="py-20 sm:py-32">
			<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
					className="text-center"
				>
					<h2 className="font-bold text-3xl tracking-tight text-stone-900 sm:text-4xl">
						Frequently Asked Questions
					</h2>
					<p className="mt-4 text-lg text-stone-600">
						Everything you need to know about our membership plans.
					</p>
				</motion.div>

				<div className="mt-12 space-y-4">
					{faqs.map((faq, index) => (
						<motion.details
							key={faq.question}
							initial={{ opacity: 0, y: 10 }}
							animate={isInView ? { opacity: 1, y: 0 } : {}}
							transition={{ duration: 0.4, delay: index * 0.1 }}
							className="group rounded-xl border border-stone-200 bg-white shadow-sm transition-all hover:shadow-md [&[open]]:shadow-md"
						>
							<summary className="flex cursor-pointer items-center justify-between p-5 font-medium text-stone-900 sm:p-6">
								<span>{faq.question}</span>
								<span className="ml-4 flex size-8 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-400 transition-all group-open:rotate-45 group-open:border-red-200 group-open:bg-red-50 group-open:text-red-600">
									<svg
										className="size-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 6v12M6 12h12"
										/>
									</svg>
								</span>
							</summary>
							<div className="border-t border-stone-100 px-5 pb-5 pt-4 text-stone-600 sm:px-6 sm:pb-6">
								{faq.answer}
							</div>
						</motion.details>
					))}
				</div>
			</div>
		</section>
	);
}

function GuaranteeSection() {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, margin: "-100px" });

	return (
		<section ref={ref} className="bg-stone-50/50 py-16 sm:py-20">
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.6 }}
					className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 p-8 sm:p-12"
				>
					{/* Background Elements */}
					<div className="absolute -left-20 -top-20 size-40 rounded-full bg-red-500/10 blur-3xl" />
					<div className="absolute -bottom-20 -right-20 size-40 rounded-full bg-rose-500/10 blur-3xl" />

					<div className="relative z-10 text-center">
						<div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25">
							<Check className="size-8" />
						</div>
						<h3 className="mt-6 font-bold text-2xl text-white sm:text-3xl">
							Cancel Anytime. No Strings Attached.
						</h3>
						<p className="mx-auto mt-4 max-w-lg text-stone-300">
							Your membership is completely flexible. Cancel anytime with no
							penalties or hidden fees. We're confident you'll love working with
							our AI executive team -- and we'll keep earning your business
							every month.
						</p>
					</div>
				</motion.div>
			</div>
		</section>
	);
}

export function PricingPageClient() {
	const [loading, setLoading] = useState<string | null>(null);

	const handleSelectPlan = async (planId: string) => {
		setLoading(planId);
		try {
			await initCsrfToken();
			const csrfToken = getCsrfToken() || "";

			const response = await fetch("/api/stripe/checkout", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": csrfToken,
				},
				credentials: "include",
				body: JSON.stringify({ planId }),
			});

			const data = await response.json();

			if (response.status === 401) {
				// User not logged in, redirect to signup with plan
				window.location.href = `/signup?plan=${planId}`;
				return;
			}

			if (!response.ok) {
				// Show error message from API
				toast({
					type: "error",
					description: data.error || "Something went wrong. Please try again.",
				});
				setLoading(null);
				return;
			}

			if (data.url) {
				window.location.href = data.url;
			} else {
				toast({
					type: "error",
					description: "Unable to start checkout. Please try again.",
				});
				setLoading(null);
			}
		} catch (error) {
			console.error("Checkout error:", error);
			toast({
				type: "error",
				description:
					"Network error. Please check your connection and try again.",
			});
			setLoading(null);
		}
	};

	return (
		<>
			{/* Hero */}
			<section className="relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-20">
				{/* Background */}
				<div className="absolute inset-0 -z-10">
					<div className="absolute inset-0 bg-gradient-to-b from-red-50/50 via-white to-white" />
					<div className="absolute left-1/2 top-0 -translate-x-1/2">
						<div className="size-[600px] rounded-full bg-gradient-to-br from-red-100/40 via-rose-50/30 to-transparent blur-3xl" />
					</div>
				</div>

				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="mx-auto max-w-3xl text-center"
					>
						<span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-1.5 text-sm font-medium text-red-700 shadow-sm">
							<Sparkles className="size-4" />
							Simple, Transparent Pricing
						</span>
						<h1 className="mt-8 font-bold text-4xl tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
							Invest in Your{" "}
							<span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
								Business Growth
							</span>
						</h1>
						<p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600">
							Get executive-level marketing and sales strategy at a fraction of
							traditional consulting costs. Choose the plan that works best for
							you.
						</p>
					</motion.div>
				</div>
			</section>

			{/* Pricing Cards */}
			<section className="pb-20 sm:pb-32">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{pricingPlans.map((plan, index) => (
							<PricingCard
								key={plan.id}
								plan={plan}
								index={index}
								loading={loading}
								onSelectPlan={handleSelectPlan}
							/>
						))}
					</div>
				</div>
			</section>

			<GuaranteeSection />
			<FAQSection />

			{/* Bottom CTA */}
			<section className="py-16 sm:py-20">
				<div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
					<h2 className="font-bold text-2xl text-stone-900 sm:text-3xl">
						Still have questions?
					</h2>
					<p className="mt-4 text-stone-600">
						We're here to help. Reach out and we'll get back to you within 24
						hours.
					</p>
					<div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
						<Link href="/contact">
							<Button size="lg" variant="outline" className="gap-2">
								<MessageSquare className="size-4" />
								Contact Us
							</Button>
						</Link>
						<Link href="/signup">
							<Button size="lg" className="gap-2 shadow-lg shadow-red-500/20">
								Start 14-Day Free Trial
								<ArrowRight className="size-4" />
							</Button>
						</Link>
					</div>
				</div>
			</section>
		</>
	);
}
