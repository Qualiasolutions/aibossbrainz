"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Highlight = {
	title: string;
	description: string;
};

type AuthShellProps = {
	eyebrow?: string;
	title: string;
	description: string;
	children: ReactNode;
	highlights?: Highlight[];
	className?: string;
	showLogo?: boolean;
};

const ALECCI_LOGO_URL =
	"https://images.squarespace-cdn.com/content/v1/5ea759fa9e5575487ad28cd0/1591228238957-80Y8AGN1M9TTXTYNJ5QK/AM_Logo_Horizontal_4C+%281%29.jpg?format=500w";

export function AuthShell({
	title,
	description,
	highlights = [],
	children,
	className,
	showLogo = true,
}: AuthShellProps) {
	return (
		<div
			className={cn(
				"relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-stone-50",
				className,
			)}
		>
			{/* Refined background - subtle, sophisticated */}
			<div aria-hidden className="pointer-events-none absolute inset-0">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-100 via-stone-50 to-white" />
				<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
			</div>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="relative z-10 grid w-full max-w-6xl items-center gap-16 px-6 py-20 sm:px-8 lg:grid-cols-[1fr_420px] lg:gap-20 lg:px-12"
				initial={{ opacity: 0, y: 16 }}
				transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
			>
				{/* Left side - Brand & highlights */}
				<div className="space-y-12">
					{/* Logo */}
					{showLogo && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.5 }}
						>
							<Image
								src={ALECCI_LOGO_URL}
								alt="Alecci Media"
								width={180}
								height={45}
								className="h-10 w-auto object-contain"
								priority
							/>
						</motion.div>
					)}

					{/* Title & description */}
					<div className="space-y-5">
						<motion.h1
							animate={{ opacity: 1, y: 0 }}
							className="font-light text-4xl text-stone-900 leading-[1.15] tracking-tight sm:text-5xl"
							initial={{ opacity: 0, y: 12 }}
							transition={{
								duration: 0.5,
								delay: 0.1,
								ease: [0.22, 1, 0.36, 1],
							}}
						>
							{title}
						</motion.h1>

						<motion.p
							animate={{ opacity: 1, y: 0 }}
							className="max-w-lg text-lg text-stone-500 leading-relaxed"
							initial={{ opacity: 0, y: 10 }}
							transition={{
								duration: 0.5,
								delay: 0.15,
								ease: [0.22, 1, 0.36, 1],
							}}
						>
							{description}
						</motion.p>
					</div>

					{/* Highlights - minimal, refined */}
					{highlights.length > 0 && (
						<motion.div
							className="space-y-4"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.5, delay: 0.25 }}
						>
							{highlights.map(
								(
									{ title: highlightTitle, description: highlightDescription },
									index,
								) => (
									<motion.div
										key={highlightTitle}
										className="group"
										initial={{ opacity: 0, x: -12 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{
											duration: 0.4,
											delay: 0.3 + index * 0.08,
											ease: [0.22, 1, 0.36, 1],
										}}
									>
										<div className="flex items-start gap-4">
											<div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-stone-300 transition-colors duration-300 group-hover:bg-stone-900" />
											<div className="space-y-1">
												<h3 className="text-sm font-medium text-stone-900 tracking-wide">
													{highlightTitle}
												</h3>
												<p className="text-sm text-stone-500 leading-relaxed">
													{highlightDescription}
												</p>
											</div>
										</div>
									</motion.div>
								),
							)}
						</motion.div>
					)}
				</div>

				{/* Right side - Form card */}
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="relative"
					initial={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
				>
					{/* Premium card with subtle border */}
					<div className="relative rounded-2xl border border-stone-200/60 bg-white p-8 shadow-xl shadow-stone-200/20">
						{/* Top accent line */}
						<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stone-900/20 to-transparent" />

						{/* Content */}
						<div className="flex flex-col gap-6">{children}</div>
					</div>
				</motion.div>
			</motion.div>
		</div>
	);
}
