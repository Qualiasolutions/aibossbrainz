"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useOnboarding } from "../onboarding-context";
import { TooltipContent } from "./tooltip-content";

interface TourStep {
	id: string;
	target?: string;
	title: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	placement?: "top" | "bottom";
}

interface TargetedStepProps {
	step: TourStep;
	onSkip: () => void;
}

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_GAP = 16;
const TOOLTIP_WIDTH = 360;
const EDGE_MARGIN = 16;

function useTargetRect(target?: string) {
	const [rect, setRect] = useState<DOMRect | null>(null);

	useEffect(() => {
		if (!target) {
			setRect(null);
			return;
		}

		const updateRect = () => {
			const el = document.querySelector(`[data-tour="${target}"]`);
			if (el) {
				setRect(el.getBoundingClientRect());
			} else {
				setRect(null);
			}
		};

		const rafId = requestAnimationFrame(updateRect);
		window.addEventListener("resize", updateRect);
		window.addEventListener("scroll", updateRect, true);

		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener("resize", updateRect);
			window.removeEventListener("scroll", updateRect, true);
		};
	}, [target]);

	return rect;
}

export function TargetedStep({ step, onSkip }: TargetedStepProps) {
	const { isTourMode } = useOnboarding();
	const rect = useTargetRect(step.target);

	// Fallback: if target element not found, show as centered card
	if (!rect) {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.2 }}
			>
				<div
					className="fixed inset-0 bg-black/50 backdrop-blur-sm"
					onClick={isTourMode ? onSkip : undefined}
					aria-hidden
				/>
				<div className="fixed inset-0 flex items-center justify-center p-4">
					<motion.div
						className="w-full max-w-sm overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ type: "spring", stiffness: 300, damping: 30 }}
					>
						<div className="h-1 w-full bg-gradient-to-r from-rose-500 to-red-500" />
						<TooltipContent step={step} onSkip={onSkip} />
					</motion.div>
				</div>
			</motion.div>
		);
	}

	const placement = step.placement || "bottom";
	const isMobile = window.innerWidth < 640;
	const tooltipWidth = isMobile
		? window.innerWidth - EDGE_MARGIN * 2
		: TOOLTIP_WIDTH;

	const targetCenterX = rect.left + rect.width / 2;

	let tooltipStyle: React.CSSProperties;
	let arrowStyle: React.CSSProperties;
	let arrowDirection: "up" | "down";

	if (placement === "bottom") {
		const top = rect.bottom + SPOTLIGHT_PADDING + TOOLTIP_GAP;
		let left = targetCenterX - tooltipWidth / 2;
		left = Math.max(
			EDGE_MARGIN,
			Math.min(window.innerWidth - tooltipWidth - EDGE_MARGIN, left),
		);
		const arrowLeft = Math.max(
			24,
			Math.min(tooltipWidth - 24, targetCenterX - left),
		);
		tooltipStyle = { top, left, width: tooltipWidth };
		arrowStyle = { left: arrowLeft, top: -6 };
		arrowDirection = "up";
	} else {
		const bottom =
			window.innerHeight - rect.top + SPOTLIGHT_PADDING + TOOLTIP_GAP;
		let left = targetCenterX - tooltipWidth / 2;
		left = Math.max(
			EDGE_MARGIN,
			Math.min(window.innerWidth - tooltipWidth - EDGE_MARGIN, left),
		);
		const arrowLeft = Math.max(
			24,
			Math.min(tooltipWidth - 24, targetCenterX - left),
		);
		tooltipStyle = { bottom, left, width: tooltipWidth };
		arrowStyle = { left: arrowLeft, bottom: -6 };
		arrowDirection = "down";
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
		>
			{/* Backdrop click handler */}
			<div
				className="fixed inset-0"
				onClick={isTourMode ? onSkip : undefined}
				aria-hidden
			/>

			{/* Spotlight cutout */}
			<motion.div
				className="pointer-events-none fixed rounded-xl"
				initial={{ opacity: 0 }}
				animate={{
					opacity: 1,
					left: rect.left - SPOTLIGHT_PADDING,
					top: rect.top - SPOTLIGHT_PADDING,
					width: rect.width + SPOTLIGHT_PADDING * 2,
					height: rect.height + SPOTLIGHT_PADDING * 2,
				}}
				transition={{ type: "spring", stiffness: 300, damping: 30 }}
				style={{
					boxShadow:
						"0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 20px 4px rgba(0, 0, 0, 0.1)",
				}}
			/>

			{/* Accent glow around target */}
			<motion.div
				className="pointer-events-none fixed rounded-xl"
				initial={{ opacity: 0 }}
				animate={{
					opacity: 1,
					left: rect.left - SPOTLIGHT_PADDING - 2,
					top: rect.top - SPOTLIGHT_PADDING - 2,
					width: rect.width + SPOTLIGHT_PADDING * 2 + 4,
					height: rect.height + SPOTLIGHT_PADDING * 2 + 4,
				}}
				transition={{ type: "spring", stiffness: 300, damping: 30 }}
				style={{
					border: "2px solid rgba(244, 63, 94, 0.4)",
					boxShadow: "0 0 16px 2px rgba(244, 63, 94, 0.15)",
				}}
			/>

			{/* Tooltip */}
			<motion.div
				className="fixed z-10"
				initial={{ opacity: 0, y: arrowDirection === "up" ? 10 : -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.15, duration: 0.25 }}
				style={tooltipStyle}
			>
				{/* Arrow */}
				<div className="absolute z-20" style={arrowStyle}>
					<div
						className={cn(
							"size-3 rotate-45 border bg-white",
							arrowDirection === "up"
								? "border-b-0 border-r-0 border-stone-200"
								: "border-t-0 border-l-0 border-stone-200",
						)}
					/>
				</div>

				{/* Card */}
				<div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl">
					<div className="h-1 w-full bg-gradient-to-r from-rose-500 to-red-500" />
					<TooltipContent step={step} onSkip={onSkip} />
				</div>
			</motion.div>
		</motion.div>
	);
}
