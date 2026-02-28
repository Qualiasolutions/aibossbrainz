"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BOT_PERSONALITIES } from "@/lib/bot-personalities";
import { useOnboarding } from "../onboarding-context";

const alexandria = BOT_PERSONALITIES.alexandria;
const kim = BOT_PERSONALITIES.kim;

interface ReadyStepProps {
	onClose?: () => void;
}

export function ReadyStep({ onClose }: ReadyStepProps) {
	const { formData, isTourMode } = useOnboarding();
	const displayName = formData.displayName || "there";

	return (
		<motion.div
			className="flex flex-col items-center px-8 py-12"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.25 }}
		>
			<motion.div
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
				className="relative mb-6"
			>
				<div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl">
					<motion.svg
						className="size-10 text-white"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={2.5}
						stroke="currentColor"
						initial={{ pathLength: 0 }}
						animate={{ pathLength: 1 }}
						transition={{ delay: 0.3, duration: 0.4 }}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M4.5 12.75l6 6 9-13.5"
						/>
					</motion.svg>
				</div>
				<div className="absolute -inset-4 -z-10 rounded-full bg-emerald-400/20 blur-2xl" />
			</motion.div>

			<motion.h3
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.25 }}
				className="mb-2 text-center font-bold text-2xl tracking-tight text-stone-900"
			>
				{isTourMode ? "Tour Complete!" : `You're all set, ${displayName}!`}
			</motion.h3>

			<motion.p
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.35 }}
				className="mb-6 max-w-xs text-center text-base text-stone-500"
			>
				Your executive consulting team is ready to help you grow your business.
			</motion.p>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.45 }}
				className="flex items-center justify-center gap-5"
			>
				{[
					{ exec: alexandria, delay: 0.5 },
					{ exec: kim, delay: 0.6 },
				].map(({ exec, delay }) =>
					exec.avatar ? (
						<div key={exec.name} className="relative">
							<div className="relative size-16 overflow-hidden rounded-full border-3 border-white shadow-xl ring-2 ring-stone-100">
								<Image
									src={exec.avatar}
									alt={exec.name}
									fill
									className="object-cover"
									sizes="64px"
								/>
							</div>
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								transition={{ delay }}
								className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white"
							>
								<svg
									className="size-3.5 text-white"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clipRule="evenodd"
									/>
								</svg>
							</motion.div>
						</div>
					) : null,
				)}
			</motion.div>

			{isTourMode ? (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.7 }}
					className="mt-8 w-full max-w-xs"
				>
					<Button
						onClick={onClose}
						className="h-11 w-full bg-stone-900 font-semibold text-white transition-all hover:bg-stone-800"
					>
						Start Chatting
					</Button>
				</motion.div>
			) : (
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.7 }}
					className="mt-8 text-sm text-stone-400"
				>
					Starting your first session...
				</motion.p>
			)}
		</motion.div>
	);
}
