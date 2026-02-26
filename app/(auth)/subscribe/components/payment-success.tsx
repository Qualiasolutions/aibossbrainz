"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const ALECCI_LOGO_URL = "/images/alecci-media-logo.webp";

export default function PaymentSuccess({
	redirectPath,
}: { redirectPath: string }) {
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
