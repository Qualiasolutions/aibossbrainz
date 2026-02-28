"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BOT_PERSONALITIES } from "@/lib/bot-personalities";
import { useOnboarding } from "../onboarding-context";

const alexandria = BOT_PERSONALITIES.alexandria;
const kim = BOT_PERSONALITIES.kim;

export function WelcomeStep() {
	const { goNext } = useOnboarding();

	return (
		<motion.div
			className="flex flex-col items-center px-8 pt-10 pb-10"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.25 }}
		>
			<motion.div
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
				className="relative mb-6"
			>
				<div className="flex -space-x-5">
					{alexandria.avatar && (
						<motion.div
							initial={{ x: 20, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							transition={{
								delay: 0.2,
								type: "spring",
								stiffness: 200,
							}}
							className="relative z-10 size-20 overflow-hidden rounded-full border-4 border-white shadow-xl"
						>
							<Image
								src={alexandria.avatar}
								alt={alexandria.name}
								fill
								className="object-cover"
								sizes="80px"
							/>
						</motion.div>
					)}
					{kim.avatar && (
						<motion.div
							initial={{ x: -20, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							transition={{
								delay: 0.3,
								type: "spring",
								stiffness: 200,
							}}
							className="relative size-20 overflow-hidden rounded-full border-4 border-white shadow-xl"
						>
							<Image
								src={kim.avatar}
								alt={kim.name}
								fill
								className="object-cover"
								sizes="80px"
							/>
						</motion.div>
					)}
				</div>
				<div className="absolute inset-0 -z-10 scale-150 rounded-full bg-gradient-to-br from-rose-200/50 to-red-200/50 blur-3xl" />
			</motion.div>

			<motion.h2
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.35 }}
				className="mb-2 text-center font-bold text-2xl tracking-tight text-stone-900"
			>
				Welcome to Boss Brainz
			</motion.h2>

			<motion.p
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.45 }}
				className="mb-8 max-w-sm text-center text-base leading-relaxed text-stone-500"
			>
				Meet your executive AI consulting team. Let&apos;s show you around.
			</motion.p>

			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.55 }}
				className="w-full max-w-xs"
			>
				<Button
					autoFocus
					onClick={goNext}
					className="group h-12 w-full bg-gradient-to-r from-rose-500 to-red-500 font-semibold text-white shadow-lg shadow-rose-500/25 transition-all hover:from-rose-600 hover:to-red-600 hover:shadow-xl hover:shadow-rose-500/30"
				>
					Let&apos;s Get Started
					<Sparkles className="ml-2 size-4" />
				</Button>
			</motion.div>
		</motion.div>
	);
}
