"use client";

import { motion } from "framer-motion";
import {
	CheckCircle,
	Clock,
	Mail,
	MapPin,
	MessageSquare,
	Send,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const contactInfo = [
	{
		icon: Mail,
		title: "Email",
		value: "ai.bossbrainz@aleccimedia.com",
		href: "mailto:ai.bossbrainz@aleccimedia.com",
	},
	{
		icon: MapPin,
		title: "Location",
		value: "Phoenix, Arizona",
		href: null,
	},
	{
		icon: Clock,
		title: "Response Time",
		value: "Within 24 hours",
		href: null,
	},
];

export default function ContactPage() {
	const [formState, setFormState] = useState({
		name: "",
		email: "",
		company: "",
		message: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		// Simulate form submission
		await new Promise((resolve) => setTimeout(resolve, 1500));

		setIsSubmitting(false);
		setIsSubmitted(true);
		setFormState({ name: "", email: "", company: "", message: "" });
	};

	return (
		<div className="relative min-h-screen overflow-hidden">
			{/* Background */}
			<div className="fixed inset-0 -z-10">
				<div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950" />
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.05),transparent_50%)]" />
				<motion.div
					className="absolute -top-40 -right-40 size-96 rounded-full bg-gradient-to-br from-red-200/30 to-rose-200/30 blur-3xl dark:from-red-900/10 dark:to-rose-900/10"
					animate={{
						x: [0, -30, 0],
						y: [0, 50, 0],
					}}
					transition={{
						duration: 20,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			</div>

			{/* Hero Section */}
			<section className="pt-32 pb-12 sm:pt-40 sm:pb-16">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="text-center"
					>
						<div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-700 shadow-xl shadow-red-500/25">
							<MessageSquare className="size-8 text-white" />
						</div>
						<h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
							Get in Touch
						</h1>
						<p className="mx-auto max-w-2xl text-lg font-medium text-red-600">
							Sales and Marketing Strategy 24/7
						</p>
						<p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
							Have questions about our AI Executive Team? We'd love to hear from
							you. Send us a message and we'll respond within 24 hours.
						</p>
					</motion.div>
				</div>
			</section>

			{/* Contact Grid */}
			<section className="pb-20">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="grid gap-8 lg:grid-cols-2">
						{/* Contact Form */}
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.5, delay: 0.1 }}
							className="rounded-2xl border border-border/50 bg-white/80 p-6 shadow-xl backdrop-blur-sm dark:bg-neutral-900/80 sm:p-8"
						>
							{isSubmitted ? (
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
										<CheckCircle className="size-8 text-green-600 dark:text-green-400" />
									</div>
									<h3 className="mb-2 text-xl font-semibold text-foreground">
										Message Sent!
									</h3>
									<p className="mb-6 text-muted-foreground">
										Thank you for reaching out. We'll get back to you within 24
										hours.
									</p>
									<Button
										onClick={() => setIsSubmitted(false)}
										variant="outline"
									>
										Send Another Message
									</Button>
								</div>
							) : (
								<form onSubmit={handleSubmit} className="space-y-6">
									<div className="mb-6">
										<h2 className="text-xl font-semibold text-foreground sm:text-2xl">
											Send us a Message
										</h2>
										<p className="mt-1 text-sm text-muted-foreground">
											Fill out the form below and we'll get back to you shortly.
										</p>
									</div>

									<div className="grid gap-6 sm:grid-cols-2">
										<div>
											<label
												htmlFor="name"
												className="mb-2 block text-sm font-medium text-foreground"
											>
												Name
											</label>
											<input
												id="name"
												type="text"
												value={formState.name}
												onChange={(e) =>
													setFormState({ ...formState, name: e.target.value })
												}
												required
												className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
												placeholder="Your name"
											/>
										</div>
										<div>
											<label
												htmlFor="email"
												className="mb-2 block text-sm font-medium text-foreground"
											>
												Email
											</label>
											<input
												id="email"
												type="email"
												value={formState.email}
												onChange={(e) =>
													setFormState({ ...formState, email: e.target.value })
												}
												required
												className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
												placeholder="you@company.com"
											/>
										</div>
									</div>

									<div>
										<label
											htmlFor="company"
											className="mb-2 block text-sm font-medium text-foreground"
										>
											Company (Optional)
										</label>
										<input
											id="company"
											type="text"
											value={formState.company}
											onChange={(e) =>
												setFormState({ ...formState, company: e.target.value })
											}
											className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
											placeholder="Your company name"
										/>
									</div>

									<div>
										<label
											htmlFor="message"
											className="mb-2 block text-sm font-medium text-foreground"
										>
											Message
										</label>
										<textarea
											id="message"
											rows={5}
											value={formState.message}
											onChange={(e) =>
												setFormState({ ...formState, message: e.target.value })
											}
											required
											className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-foreground transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
											placeholder="Tell us how we can help..."
										/>
									</div>

									<Button
										type="submit"
										disabled={isSubmitting}
										className="w-full gap-2 py-6 shadow-lg shadow-red-500/20"
									>
										{isSubmitting ? (
											<>
												<div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
												Sending...
											</>
										) : (
											<>
												<Send className="size-4" />
												Send Message
											</>
										)}
									</Button>
								</form>
							)}
						</motion.div>

						{/* Contact Info */}
						<motion.div
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.5, delay: 0.2 }}
							className="space-y-6"
						>
							{/* Info Cards */}
							<div className="grid gap-4 sm:grid-cols-2">
								{contactInfo.map((info) => {
									const Icon = info.icon;
									const content = (
										<div
											key={info.title}
											className="rounded-2xl border border-border/50 bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl dark:bg-neutral-900/80"
										>
											<div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
												<Icon className="size-5 text-red-600 dark:text-red-400" />
											</div>
											<h3 className="font-medium text-foreground">
												{info.title}
											</h3>
											<p className="mt-1 text-sm text-muted-foreground">
												{info.value}
											</p>
										</div>
									);

									return info.href ? (
										<a key={info.title} href={info.href}>
											{content}
										</a>
									) : (
										<div key={info.title}>{content}</div>
									);
								})}
							</div>

							{/* AI Team CTA */}
							<div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-6 shadow-lg dark:border-red-900/50 dark:from-red-950/30 dark:to-neutral-900 sm:p-8">
								<div className="flex items-start gap-4">
									<div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-700 shadow-lg shadow-red-500/25">
										<MessageSquare className="size-6 text-white" />
									</div>
									<div>
										<h3 className="mb-2 text-lg font-semibold text-foreground">
											Talk to Our AI Executives
										</h3>
										<p className="mb-4 text-sm text-muted-foreground">
											Sales and Marketing Strategy 24/7. Get instant strategic
											advice from Alexandria (CMO) and Kim (CSO).
										</p>
										<a href="/login">
											<Button className="gap-2 shadow-lg shadow-red-500/20">
												Start Consulting Now
											</Button>
										</a>
									</div>
								</div>
							</div>

							{/* FAQ Note */}
							<div className="rounded-2xl border border-border/50 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:bg-neutral-900/80">
								<h3 className="mb-3 font-semibold text-foreground">
									Common Questions
								</h3>
								<ul className="space-y-3 text-sm text-muted-foreground">
									<li className="flex items-start gap-2">
										<span className="mt-1 text-red-500">•</span>
										<span>
											<strong className="text-foreground">Free trial?</strong>{" "}
											Yes! Start with 50 free messages to test our AI
											executives.
										</span>
									</li>
									<li className="flex items-start gap-2">
										<span className="mt-1 text-red-500">•</span>
										<span>
											<strong className="text-foreground">
												Enterprise plans?
											</strong>{" "}
											Contact us for custom pricing and features.
										</span>
									</li>
									<li className="flex items-start gap-2">
										<span className="mt-1 text-red-500">•</span>
										<span>
											<strong className="text-foreground">
												Data security?
											</strong>{" "}
											We use enterprise-grade encryption and never share your
											data.
										</span>
									</li>
								</ul>
							</div>
						</motion.div>
					</div>
				</div>
			</section>
		</div>
	);
}
