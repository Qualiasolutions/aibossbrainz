"use client";

import { Check, ChevronRight, Shield, Sparkles, Users } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const ALECCI_LOGO_URL = "/images/alecci-media-logo.webp";

const valueProps = [
	{ icon: Users, text: "AI executive team at your command" },
	{ icon: Sparkles, text: "Personalized strategy & insights" },
	{ icon: Shield, text: "14-day free trial, cancel anytime" },
];

export default function WelcomeStep({
	onContinue,
}: { onContinue: () => void }) {
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
