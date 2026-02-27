"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	ArrowLeft,
	ArrowRight,
	Brain,
	Building2,
	LayoutGrid,
	Loader2,
	MessageSquare,
	Sparkles,
	Users,
} from "lucide-react";
import Image from "next/image";
import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "@/components/toast";
import { useCsrf } from "@/hooks/use-csrf";
import { BOT_PERSONALITIES } from "@/lib/bot-personalities";
import { INDUSTRIES } from "@/lib/constants/business-profile";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserProfile {
	displayName: string | null;
	companyName: string | null;
	industry: string | null;
	onboardedAt: string | null;
}

interface TourStep {
	id: string;
	target?: string;
	title: string;
	description: string;
	icon: typeof Sparkles;
	placement?: "top" | "bottom";
}

interface ProfileProps {
	displayName: string;
	setDisplayName: Dispatch<SetStateAction<string>>;
	companyName: string;
	setCompanyName: Dispatch<SetStateAction<string>>;
	industry: string;
	setIndustry: Dispatch<SetStateAction<string>>;
	isSaving: boolean;
}

interface StepNavProps {
	stepIndex: number;
	totalSteps: number;
	onNext: () => void;
	onBack: () => void;
	canGoBack: boolean;
	isTourMode: boolean;
	onSkip: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const alexandria = BOT_PERSONALITIES.alexandria;
const kim = BOT_PERSONALITIES.kim;

const ALL_STEPS: TourStep[] = [
	{
		id: "welcome",
		title: "Welcome to Boss Brainz",
		description:
			"Meet your executive AI consulting team. Let's show you around.",
		icon: Sparkles,
	},
	{
		id: "executive-switch",
		target: "executive-switch",
		title: "Your Executive Team",
		description:
			"Switch between AI executives — Alexandria for marketing & branding, Kim for sales & strategy, or both together for comprehensive advice.",
		icon: Users,
		placement: "bottom",
	},
	{
		id: "strategy-canvas",
		target: "strategy-canvas",
		title: "Strategy Canvas",
		description:
			"Your visual strategy toolkit — SWOT analysis, business model canvas, customer journey maps, and brainstorming boards.",
		icon: LayoutGrid,
		placement: "bottom",
	},
	{
		id: "focus-modes",
		target: "focus-modes",
		title: "Focus Modes",
		description:
			"Steer conversations toward specific topics — pricing, messaging, customer journey, social media, or launch strategy.",
		icon: Brain,
		placement: "top",
	},
	{
		id: "chat-input",
		target: "chat-input",
		title: "Start a Conversation",
		description:
			"Type your question, attach files, or use voice input. Export conversations as PDF from the menu anytime.",
		icon: MessageSquare,
		placement: "top",
	},
	{
		id: "profile",
		title: "Quick Setup",
		description: "Personalize your experience (optional)",
		icon: Building2,
	},
	{
		id: "ready",
		title: "You're all set!",
		description:
			"Your executive consulting team is ready to help you grow your business.",
		icon: Sparkles,
	},
];

const TOUR_ONLY_STEPS = ALL_STEPS.filter((s) => s.id !== "profile");

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_GAP = 16;
const TOOLTIP_WIDTH = 360;
const EDGE_MARGIN = 16;

// ─── Hooks ───────────────────────────────────────────────────────────────────

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

// ─── Main Component ──────────────────────────────────────────────────────────

export function OnboardingModal() {
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isTourMode, setIsTourMode] = useState(false);
	const [stepIndex, setStepIndex] = useState(0);
	const [mounted, setMounted] = useState(false);
	const [displayName, setDisplayName] = useState("");
	const [companyName, setCompanyName] = useState("");
	const [industry, setIndustry] = useState("");
	const { csrfFetch, isLoading: csrfLoading } = useCsrf();

	const activeSteps = isTourMode ? TOUR_ONLY_STEPS : ALL_STEPS;
	const currentStep = activeSteps[stepIndex];

	useEffect(() => {
		setMounted(true);
		return () => setMounted(false);
	}, []);

	// Lock body scroll while tour is active
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
			return () => {
				document.body.style.overflow = "";
			};
		}
	}, [isOpen]);

	// Listen for "start-product-tour" custom event from sidebar
	useEffect(() => {
		const handleStartTour = () => {
			setIsTourMode(true);
			setStepIndex(0);
			setIsOpen(true);
			setIsLoading(false);
		};
		window.addEventListener("start-product-tour", handleStartTour);
		return () =>
			window.removeEventListener("start-product-tour", handleStartTour);
	}, []);

	// Check if user needs onboarding
	useEffect(() => {
		async function checkProfile() {
			try {
				const res = await fetch("/api/profile");
				if (res.ok) {
					const profile: UserProfile = await res.json();
					if (!profile.onboardedAt) setIsOpen(true);
				}
			} catch (error) {
				console.error("Failed to fetch profile:", error);
			} finally {
				setIsLoading(false);
			}
		}
		checkProfile();
	}, []);

	const goNext = useCallback(() => {
		setStepIndex((prev) => Math.min(prev + 1, activeSteps.length - 1));
	}, [activeSteps.length]);

	const goBack = useCallback(() => {
		setStepIndex((prev) => Math.max(prev - 1, 0));
	}, []);

	const closeTour = useCallback(() => {
		setIsOpen(false);
		setStepIndex(0);
		setIsTourMode(false);
	}, []);

	// Escape to skip (tour mode only)
	useEffect(() => {
		if (!isTourMode || !isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeTour();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isTourMode, isOpen, closeTour]);

	const saveAndFinish = async () => {
		if (csrfLoading) {
			toast({
				type: "error",
				description: "Please wait a moment and try again.",
			});
			return;
		}

		setIsSaving(true);
		try {
			const res = await csrfFetch("/api/profile", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					displayName: displayName.trim() || null,
					companyName: companyName.trim() || null,
					industry: industry || null,
					completeOnboarding: true,
				}),
			});

			if (res.ok) {
				goNext(); // moves to "ready"
				setTimeout(() => {
					setIsOpen(false);
					setIsTourMode(false);
				}, 3000);
			} else {
				toast({
					type: "error",
					description: "Failed to save your profile. Please try again.",
				});
			}
		} catch {
			toast({
				type: "error",
				description: "Something went wrong. Please try again.",
			});
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading || !isOpen || !mounted || !currentStep) return null;

	const navProps: StepNavProps = {
		stepIndex,
		totalSteps: activeSteps.length,
		onNext: currentStep.id === "profile" ? saveAndFinish : goNext,
		onBack: goBack,
		canGoBack: stepIndex > 0,
		isTourMode,
		onSkip: closeTour,
	};

	return createPortal(
		<div
			className="fixed inset-0 z-[100000]"
			aria-modal="true"
			role="dialog"
			aria-label={currentStep.title}
		>
			<AnimatePresence mode="wait">
				{currentStep.target ? (
					<TargetedStep
						key={currentStep.id}
						step={currentStep}
						nav={navProps}
					/>
				) : (
					<CenteredStep
						key={currentStep.id}
						step={currentStep}
						nav={navProps}
						profileProps={{
							displayName,
							setDisplayName,
							companyName,
							setCompanyName,
							industry,
							setIndustry,
							isSaving,
						}}
						displayName={displayName}
					/>
				)}
			</AnimatePresence>
		</div>,
		document.body,
	);
}

// ─── Targeted Step (spotlight + tooltip) ─────────────────────────────────────

function TargetedStep({ step, nav }: { step: TourStep; nav: StepNavProps }) {
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
					onClick={nav.isTourMode ? nav.onSkip : undefined}
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
						<TooltipContent step={step} nav={nav} />
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
				onClick={nav.isTourMode ? nav.onSkip : undefined}
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
					<TooltipContent step={step} nav={nav} />
				</div>
			</motion.div>
		</motion.div>
	);
}

// ─── Tooltip Content (shared) ────────────────────────────────────────────────

function TooltipContent({ step, nav }: { step: TourStep; nav: StepNavProps }) {
	const Icon = step.icon;

	return (
		<div className="p-5">
			<div className="mb-3 flex items-start gap-3">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-red-500 shadow-sm">
					<Icon className="size-5 text-white" />
				</div>
				<div className="flex-1">
					<h3 className="font-bold text-sm text-stone-900 leading-tight">
						{step.title}
					</h3>
					<p className="mt-1 text-xs text-stone-500 leading-relaxed">
						{step.description}
					</p>
				</div>
			</div>
			<div className="flex items-center justify-between">
				<StepDots current={nav.stepIndex} total={nav.totalSteps} />
				<div className="flex items-center gap-2">
					{nav.isTourMode && (
						<button
							type="button"
							onClick={nav.onSkip}
							className="text-xs text-stone-400 transition-colors hover:text-stone-600"
						>
							Skip
						</button>
					)}
					{nav.canGoBack && (
						<Button
							variant="ghost"
							size="sm"
							onClick={nav.onBack}
							className="h-8 px-2 text-stone-500 hover:bg-stone-100"
						>
							<ArrowLeft className="size-3.5" />
						</Button>
					)}
					<Button
						size="sm"
						onClick={nav.onNext}
						className="h-8 gap-1.5 bg-stone-900 px-3 font-medium text-xs text-white hover:bg-stone-800"
					>
						Next
						<ArrowRight className="size-3" />
					</Button>
				</div>
			</div>
		</div>
	);
}

// ─── Centered Step (backdrop + card) ─────────────────────────────────────────

function CenteredStep({
	step,
	nav,
	profileProps,
	displayName,
}: {
	step: TourStep;
	nav: StepNavProps;
	profileProps: ProfileProps;
	displayName: string;
}) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.2 }}
		>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/50 backdrop-blur-sm"
				onClick={nav.isTourMode ? nav.onSkip : undefined}
				aria-hidden
			/>

			{/* Card */}
			<div className="fixed inset-0 flex items-center justify-center p-4">
				<motion.div
					className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
					initial={{ opacity: 0, scale: 0.95, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					transition={{ type: "spring", stiffness: 300, damping: 30 }}
				>
					{/* Progress bar */}
					<div className="flex items-center justify-center gap-1.5 bg-stone-50 py-3">
						{Array.from({ length: nav.totalSteps }).map((_, i) => (
							<motion.div
								// biome-ignore lint/suspicious/noArrayIndexKey: static step indicators
								key={i}
								className={cn(
									"h-1.5 rounded-full transition-all",
									i <= nav.stepIndex
										? "w-6 bg-gradient-to-r from-rose-500 to-red-500"
										: "w-1.5 bg-stone-200",
								)}
								animate={{ width: i <= nav.stepIndex ? 24 : 6 }}
							/>
						))}
					</div>

					<AnimatePresence mode="wait">
						{step.id === "welcome" && (
							<WelcomeContent key="welcome" onNext={nav.onNext} />
						)}
						{step.id === "profile" && (
							<ProfileContent
								key="profile"
								{...profileProps}
								onSubmit={nav.onNext}
								onBack={nav.onBack}
							/>
						)}
						{step.id === "ready" && (
							<ReadyContent
								key="ready"
								displayName={displayName || "there"}
								tourMode={nav.isTourMode}
								onClose={nav.onSkip}
							/>
						)}
					</AnimatePresence>
				</motion.div>
			</div>
		</motion.div>
	);
}

// ─── Welcome Content ─────────────────────────────────────────────────────────

function WelcomeContent({ onNext }: { onNext: () => void }) {
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
					onClick={onNext}
					className="group h-12 w-full bg-gradient-to-r from-rose-500 to-red-500 font-semibold text-white shadow-lg shadow-rose-500/25 transition-all hover:from-rose-600 hover:to-red-600 hover:shadow-xl hover:shadow-rose-500/30"
				>
					Let&apos;s Get Started
					<Sparkles className="ml-2 size-4" />
				</Button>
			</motion.div>
		</motion.div>
	);
}

// ─── Profile Content ─────────────────────────────────────────────────────────

function ProfileContent({
	displayName,
	setDisplayName,
	companyName,
	setCompanyName,
	industry,
	setIndustry,
	isSaving,
	onSubmit,
	onBack,
}: ProfileProps & { onSubmit: () => void; onBack: () => void }) {
	return (
		<motion.div
			className="flex flex-col px-8 pt-6 pb-8"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.25 }}
		>
			<div className="mb-5 text-center">
				<div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-stone-700 to-stone-900 shadow-lg">
					<Building2 className="size-6 text-white" />
				</div>
				<h2 className="mb-1 font-bold text-xl tracking-tight text-stone-900">
					Quick Setup
				</h2>
				<p className="text-sm text-stone-500">
					Personalize your experience (optional)
				</p>
			</div>

			<div className="space-y-4">
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="space-y-1.5"
				>
					<Label
						htmlFor="displayName"
						className="font-medium text-sm text-stone-700"
					>
						Your Name
					</Label>
					<Input
						id="displayName"
						placeholder="How should we address you?"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						className="h-11 border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:ring-stone-400/20"
						autoFocus
					/>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.15 }}
					className="space-y-1.5"
				>
					<Label
						htmlFor="companyName"
						className="font-medium text-sm text-stone-700"
					>
						Company{" "}
						<span className="font-normal text-stone-400 text-xs">
							(optional)
						</span>
					</Label>
					<Input
						id="companyName"
						placeholder="Your company or business name"
						value={companyName}
						onChange={(e) => setCompanyName(e.target.value)}
						className="h-11 border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:ring-stone-400/20"
					/>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="space-y-1.5"
				>
					<Label
						htmlFor="industry"
						className="font-medium text-sm text-stone-700"
					>
						Industry{" "}
						<span className="font-normal text-stone-400 text-xs">
							(optional)
						</span>
					</Label>
					<Select value={industry} onValueChange={setIndustry}>
						<SelectTrigger
							id="industry"
							className="h-11 border-stone-200 bg-white text-stone-900 focus:border-stone-400 focus:ring-stone-400/20"
						>
							<SelectValue placeholder="Select your industry" />
						</SelectTrigger>
						<SelectContent className="border-stone-200 bg-white">
							{INDUSTRIES.map((ind) => (
								<SelectItem
									key={ind}
									value={ind}
									className="text-stone-700 focus:bg-stone-50 focus:text-stone-900"
								>
									{ind}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</motion.div>
			</div>

			<div className="mt-6 flex items-center gap-3">
				<Button
					variant="ghost"
					onClick={onBack}
					className="h-11 px-4 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
				>
					<ArrowLeft className="mr-1.5 size-4" />
					Back
				</Button>
				<Button
					onClick={onSubmit}
					disabled={isSaving}
					className="group h-11 flex-1 bg-stone-900 font-semibold text-white transition-all hover:bg-stone-800 disabled:opacity-50"
				>
					{isSaving ? (
						<>
							<Loader2 className="mr-2 size-4 animate-spin" />
							Setting up...
						</>
					) : (
						<>
							Finish Setup
							<ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
						</>
					)}
				</Button>
			</div>
		</motion.div>
	);
}

// ─── Ready Content ───────────────────────────────────────────────────────────

function ReadyContent({
	displayName,
	tourMode = false,
	onClose,
}: {
	displayName: string;
	tourMode?: boolean;
	onClose?: () => void;
}) {
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
				{tourMode ? "Tour Complete!" : `You're all set, ${displayName}!`}
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

			{tourMode ? (
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

// ─── Step Dots ───────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
	return (
		<div className="flex items-center gap-1">
			{Array.from({ length: total }).map((_, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: static dot indicators
					key={i}
					className={cn(
						"rounded-full transition-all duration-300",
						i === current
							? "h-2 w-4 bg-rose-500"
							: i < current
								? "size-2 bg-rose-300"
								: "size-2 bg-stone-200",
					)}
				/>
			))}
		</div>
	);
}
