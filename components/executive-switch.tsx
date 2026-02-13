"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crown, Sparkles, UserRound, Users } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BOT_PERSONALITIES, type BotType } from "@/lib/bot-personalities";
import { chatBreadcrumb } from "@/lib/sentry";
import { cn } from "@/lib/utils";

interface ExecutiveSwitchProps {
	selectedExecutive: BotType;
	onExecutiveChange: (executive: BotType) => void;
	disabled?: boolean;
}

const getExecutiveIcon = (
	executive: BotType,
	size: "sm" | "md" | "lg" = "md",
) => {
	const personality = BOT_PERSONALITIES[executive];
	const sizeClasses = {
		sm: "size-6",
		md: "size-10",
		lg: "size-16",
	};
	const iconSizes = {
		sm: "h-3 w-3",
		md: "h-5 w-5",
		lg: "h-6 w-6",
	};

	const iconClass = cn(
		"overflow-hidden rounded-full border-2 border-white/50 shadow-lg transition-all duration-300",
		sizeClasses[size],
	);

	// If avatar exists, use it
	if (personality.avatar) {
		return (
			<motion.div
				className={iconClass}
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
			>
				<Image
					alt={`${personality.name} avatar`}
					className="size-full object-cover"
					height={size === "sm" ? 24 : size === "md" ? 40 : 64}
					src={personality.avatar}
					width={size === "sm" ? 24 : size === "md" ? 40 : 64}
				/>
			</motion.div>
		);
	}

	// Fallback to icons if no avatar
	switch (personality.icon) {
		case "Crown":
			return (
				<motion.div
					className={cn(
						iconClass,
						"flex items-center justify-center bg-gradient-to-br from-rose-400 to-red-600 text-white",
					)}
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.95 }}
				>
					<Crown className={iconSizes[size]} />
				</motion.div>
			);
		case "UserRound":
			return (
				<motion.div
					className={cn(
						iconClass,
						"flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-700 text-white",
					)}
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.95 }}
				>
					<UserRound className={iconSizes[size]} />
				</motion.div>
			);
		case "Users":
			return (
				<motion.div
					className={cn(
						iconClass,
						"flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-700 text-white",
					)}
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.95 }}
				>
					<Users className={iconSizes[size]} />
				</motion.div>
			);
		default:
			return (
				<motion.div
					className={cn(
						iconClass,
						"flex items-center justify-center bg-gradient-to-br from-gray-500 to-gray-700 text-white",
					)}
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.95 }}
				>
					<UserRound className={iconSizes[size]} />
				</motion.div>
			);
	}
};

export function ExecutiveSwitch({
	selectedExecutive,
	onExecutiveChange,
	disabled = false,
}: ExecutiveSwitchProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		return () => setMounted(false);
	}, []);

	// Close modal on ESC key
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "unset";
		};
	}, [isOpen]);

	const handleExecutiveSelect = useCallback(
		(executive: BotType) => {
			// Track executive switch for Sentry breadcrumbs
			if (executive !== selectedExecutive) {
				chatBreadcrumb.executiveSwitched(selectedExecutive, executive);
			}
			onExecutiveChange(executive);
			setIsOpen(false);
		},
		[selectedExecutive, onExecutiveChange],
	);

	const selectedPersonality = BOT_PERSONALITIES[selectedExecutive];
	const otherExecutives = useMemo(
		() =>
			Object.entries(BOT_PERSONALITIES).filter(
				([key]) => key !== selectedExecutive,
			),
		[selectedExecutive],
	);

	// Keyboard navigation for executive options
	const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	const handleOptionKeyDown = useCallback(
		(e: React.KeyboardEvent, index: number) => {
			const total = otherExecutives.length;
			let nextIndex = index;

			if (e.key === "ArrowDown" || e.key === "ArrowRight") {
				e.preventDefault();
				nextIndex = (index + 1) % total;
			} else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
				e.preventDefault();
				nextIndex = (index - 1 + total) % total;
			} else if (e.key === "Home") {
				e.preventDefault();
				nextIndex = 0;
			} else if (e.key === "End") {
				e.preventDefault();
				nextIndex = total - 1;
			}

			if (nextIndex !== index) {
				optionRefs.current[nextIndex]?.focus();
			}
		},
		[otherExecutives.length],
	);

	// Focus first option when modal opens
	useEffect(() => {
		if (isOpen) {
			requestAnimationFrame(() => {
				optionRefs.current[0]?.focus();
			});
		}
	}, [isOpen]);

	// Focus trap: keep Tab/Shift+Tab cycling within the modal
	const modalRef = useRef<HTMLDivElement>(null);
	const handleModalKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === "Tab") {
			const focusableElements = modalRef.current?.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			);
			if (!focusableElements?.length) return;
			const first = focusableElements[0] as HTMLElement;
			const last = focusableElements[
				focusableElements.length - 1
			] as HTMLElement;
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}, []);

	return (
		<div className="relative">
			<Button
				className={cn(
					"group relative flex min-h-[44px] items-center gap-2.5 rounded-md border border-neutral-200 bg-white px-3 text-left shadow-sm transition-all duration-200 sm:h-10 sm:gap-3 sm:px-4",
					"hover:border-red-200 hover:shadow hover:bg-red-50/30",
					"focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:ring-offset-1",
					disabled && "cursor-not-allowed opacity-60",
				)}
				disabled={disabled}
				onClick={() => setIsOpen(!isOpen)}
				variant="outline"
			>
				<div className="flex items-center gap-2.5 sm:gap-3">
					<motion.div
						animate={{ scale: 1 }}
						className="flex-shrink-0"
						initial={{ scale: 0.8 }}
						key={selectedExecutive}
						transition={{ type: "spring", stiffness: 260, damping: 26 }}
					>
						{getExecutiveIcon(selectedExecutive, "sm")}
					</motion.div>

					<div className="flex flex-col">
						<span className="font-medium text-xs text-neutral-900 sm:text-sm">
							{selectedPersonality.name.split(" ")[0]}
						</span>
						<span className="hidden text-neutral-500 text-[10px] sm:block">
							{selectedPersonality.role.split("(")[0].trim()}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-1.5 pl-1.5 sm:gap-2 sm:pl-3">
					<span className="hidden rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-600 text-[10px] sm:inline-flex">
						Active
					</span>

					<motion.div
						animate={{ rotate: isOpen ? 180 : 0 }}
						className="text-neutral-400"
						transition={{ duration: 0.2 }}
					>
						<svg
							className="size-3.5 sm:size-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								d="M19 9l-7 7-7-7"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
							/>
						</svg>
					</motion.div>
				</div>
			</Button>

			{/* Premium Modal Popup */}
			{mounted &&
				isOpen &&
				createPortal(
					<AnimatePresence>
						{/* biome-ignore lint/a11y/noNoninteractiveElementToKeyboardEvent: focus trap requires onKeyDown on the modal container */}
						<div
							className="fixed inset-0 z-[99999]"
							onKeyDown={handleModalKeyDown}
							ref={modalRef}
							role="dialog"
							aria-label="Select executive"
							aria-modal="true"
						>
							{/* Modal Backdrop */}
							<motion.div
								animate={{ opacity: 1 }}
								className="absolute inset-0 bg-neutral-100/80 backdrop-blur-sm"
								exit={{ opacity: 0 }}
								initial={{ opacity: 0 }}
								onClick={() => setIsOpen(false)}
								transition={{ duration: 0.2 }}
							/>

							{/* Modal Content */}
							<div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
								<motion.div
									animate={{ opacity: 1, scale: 1, y: 0 }}
									className="relative w-full max-w-3xl"
									exit={{ opacity: 0, scale: 0.98, y: 10 }}
									initial={{ opacity: 0, scale: 0.98, y: 10 }}
									transition={{
										duration: 0.25,
										ease: [0.25, 0.46, 0.45, 0.94],
									}}
								>
									{/* Modal Card */}
									<Card className="overflow-hidden border border-neutral-200 bg-white shadow-2xl shadow-neutral-300/50">
										{/* Modal Header */}
										<div className="relative border-b border-neutral-100 bg-white px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
											{/* Subtle red accent line */}
											<div className="absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-red-500 via-red-600 to-red-500" />

											<div className="relative z-10">
												<div className="flex items-start justify-between gap-3 sm:items-center">
													<div className="flex items-center gap-3 sm:gap-4">
														<div className="hidden sm:block">
															<Sparkles className="h-5 w-5 text-red-500 sm:h-6 sm:w-6" />
														</div>
														<div>
															<h1 className="font-semibold text-base text-neutral-900 sm:text-xl lg:text-2xl">
																Select Executive
															</h1>
															<p className="mt-0.5 text-xs text-neutral-500 sm:mt-1 sm:text-sm">
																Choose your AI consultant
															</p>
														</div>
													</div>

													{/* Close Button */}
													<Button
														aria-label="Close executive selection"
														className="h-8 w-8 flex-shrink-0 rounded-md border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-all duration-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 sm:h-9 sm:w-9"
														onClick={() => setIsOpen(false)}
														ref={closeButtonRef}
														size="icon"
														variant="outline"
													>
														<svg
															className="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																d="M6 18L18 6M6 6l12 12"
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
															/>
														</svg>
													</Button>
												</div>
											</div>
										</div>

										{/* Modal Body */}
										<div className="max-h-[60vh] overflow-y-auto bg-neutral-50/50 p-4 sm:max-h-none sm:p-6">
											<div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
												{/* Current Executive Section */}
												<div className="space-y-3 sm:space-y-4">
													<div className="flex items-center gap-2">
														<div className="h-px flex-1 bg-neutral-200" />
														<div className="flex items-center gap-2">
															<Badge className="border-0 bg-red-500 px-2.5 py-0.5 font-medium text-white text-[10px] sm:text-xs">
																ACTIVE
															</Badge>
															<motion.div
																animate={{ scale: [1, 1.2, 1] }}
																className="h-1.5 w-1.5 rounded-full bg-red-500"
																transition={{
																	duration: 2,
																	repeat: Number.POSITIVE_INFINITY,
																}}
															/>
														</div>
														<div className="h-px flex-1 bg-neutral-200" />
													</div>

													<motion.div
														animate={{ opacity: 1, x: 0 }}
														className="group"
														initial={{ opacity: 0, x: -10 }}
														transition={{ duration: 0.3 }}
													>
														<div className="rounded-lg border border-red-200 bg-white p-4 shadow-sm shadow-red-100/50 sm:p-5">
															<div className="flex items-center gap-3 sm:gap-4">
																<div className="relative flex-shrink-0">
																	{getExecutiveIcon(selectedExecutive, "md")}
																	<div className="-bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 absolute">
																		<div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 sm:h-5 sm:w-5">
																			<svg
																				className="h-2.5 w-2.5 text-white"
																				fill="none"
																				stroke="currentColor"
																				viewBox="0 0 24 24"
																			>
																				<path
																					d="M5 13l4 4L19 7"
																					strokeLinecap="round"
																					strokeLinejoin="round"
																					strokeWidth={3}
																				/>
																			</svg>
																		</div>
																	</div>
																</div>
																<div className="min-w-0 flex-1">
																	<h3 className="truncate font-semibold text-sm text-neutral-900 sm:text-base">
																		{selectedPersonality.name}
																	</h3>
																	<p className="truncate text-xs text-neutral-500">
																		{selectedPersonality.role}
																	</p>
																	<p className="mt-2 line-clamp-2 text-xs text-neutral-600 leading-relaxed sm:line-clamp-none sm:text-sm">
																		{selectedPersonality.description}
																	</p>
																</div>
															</div>
														</div>
													</motion.div>
												</div>

												{/* Other Executives Section */}
												<div className="space-y-3 sm:space-y-4">
													<div className="flex items-center gap-2">
														<div className="h-px flex-1 bg-neutral-200" />
														<Badge className="border-0 bg-neutral-100 px-2.5 py-0.5 font-medium text-neutral-600 text-[10px] sm:text-xs">
															AVAILABLE
														</Badge>
														<div className="h-px flex-1 bg-neutral-200" />
													</div>

													<div
														aria-label="Available executives"
														className="space-y-2"
														role="radiogroup"
													>
														{otherExecutives.map(
															([key, personality], index) => (
																<motion.div
																	animate={{ opacity: 1, x: 0 }}
																	exit={{ opacity: 0, x: -10 }}
																	initial={{ opacity: 0, x: 10 }}
																	key={key}
																	transition={{
																		duration: 0.2,
																		delay: 0.05 + index * 0.05,
																	}}
																>
																	{/* biome-ignore lint/a11y/useSemanticElements: custom radio button pattern using button+role for accessible dropdown */}
																	<button
																		aria-checked={false}
																		className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-1 rounded-lg"
																		onClick={() =>
																			handleExecutiveSelect(key as BotType)
																		}
																		onKeyDown={(e) =>
																			handleOptionKeyDown(e, index)
																		}
																		ref={(el) => {
																			optionRefs.current[index] = el;
																		}}
																		role="radio"
																		type="button"
																	>
																		<div className="rounded-lg border border-neutral-200 bg-white p-3 transition-all duration-200 hover:border-red-200 hover:shadow hover:bg-red-50/30 sm:p-4">
																			<div className="flex items-center gap-3">
																				{getExecutiveIcon(key as BotType, "sm")}
																				<div className="min-w-0 flex-1">
																					<h4 className="truncate font-medium text-sm text-neutral-900">
																						{personality.name}
																					</h4>
																					<p className="truncate text-xs text-neutral-500">
																						{personality.role}
																					</p>
																				</div>
																				<div className="flex-shrink-0 opacity-40 transition-all duration-200 group-hover:opacity-100">
																					<div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-100 transition-colors group-hover:bg-red-500">
																						<svg
																							className="h-3.5 w-3.5 text-neutral-400 transition-colors group-hover:text-white"
																							fill="none"
																							stroke="currentColor"
																							viewBox="0 0 24 24"
																						>
																							<path
																								d="M13 7l5 5m0 0l-5 5m5-5H6"
																								strokeLinecap="round"
																								strokeLinejoin="round"
																								strokeWidth={2}
																							/>
																						</svg>
																					</div>
																				</div>
																			</div>
																		</div>
																	</button>
																</motion.div>
															),
														)}
													</div>
												</div>
											</div>

											{/* Modal Footer */}
											<div className="mt-4 hidden items-center justify-between border-t border-neutral-200 pt-4 sm:flex">
												<p className="text-xs text-neutral-400">
													Select an advisor to customize your conversation
												</p>
												<Button
													className="h-8 rounded-md border border-neutral-200 bg-white px-4 font-medium text-neutral-600 text-xs shadow-sm transition-all duration-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
													onClick={() => setIsOpen(false)}
													variant="outline"
												>
													Cancel
												</Button>
											</div>
										</div>
									</Card>
								</motion.div>
							</div>
						</div>
					</AnimatePresence>,
					document.body,
				)}
		</div>
	);
}
