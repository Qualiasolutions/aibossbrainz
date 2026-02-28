"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Building2, Sparkles } from "lucide-react";
import { useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/components/toast";
import { useCsrf } from "@/hooks/use-csrf";
import { logClientError } from "@/lib/client-logger";
import { cn } from "@/lib/utils";
import {
	OnboardingContext,
	type ProfileFormData,
} from "./onboarding-context";
import { MeetTeamStep, MEET_TEAM_STEPS } from "./steps/meet-team-step";
import { ProfileStep } from "./steps/profile-step";
import { ReadyStep } from "./steps/ready-step";
import { WelcomeStep } from "./steps/welcome-step";

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
	icon: React.ComponentType<{ className?: string }>;
	placement?: "top" | "bottom";
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_STEPS: TourStep[] = [
	{
		id: "welcome",
		title: "Welcome to Boss Brainz",
		description:
			"Meet your executive AI consulting team. Let's show you around.",
		icon: Sparkles,
	},
	...MEET_TEAM_STEPS,
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

// ─── Main Component ──────────────────────────────────────────────────────────

export function OnboardingModal() {
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isTourMode, setIsTourMode] = useState(false);
	const [stepIndex, setStepIndex] = useState(0);
	const [mounted, setMounted] = useState(false);
	const [formData, setFormData] = useState<ProfileFormData>({
		displayName: "",
		companyName: "",
		industry: "",
	});
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
				logClientError(error, {
					component: "OnboardingModal",
					action: "fetch_profile",
				});
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

	const handleSetFormData = useCallback(
		(data: Partial<ProfileFormData>) => {
			setFormData((prev) => ({ ...prev, ...data }));
		},
		[],
	);

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
					displayName: formData.displayName.trim() || null,
					companyName: formData.companyName.trim() || null,
					industry: formData.industry || null,
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

	const contextValue = {
		stepIndex,
		totalSteps: activeSteps.length,
		goNext: currentStep.id === "profile" ? saveAndFinish : goNext,
		goBack,
		canGoBack: stepIndex > 0,
		isTourMode,
		formData,
		setFormData: handleSetFormData,
		isSaving,
	};

	return createPortal(
		<OnboardingContext.Provider value={contextValue}>
			<div
				className="fixed inset-0 z-[100000]"
				aria-modal="true"
				role="dialog"
				aria-label={currentStep.title}
			>
				<AnimatePresence mode="wait">
					{currentStep.target ? (
						<MeetTeamStep
							key={currentStep.id}
							step={currentStep}
							onSkip={closeTour}
						/>
					) : (
						<CenteredStep
							key={currentStep.id}
							step={currentStep}
							onSkip={closeTour}
						/>
					)}
				</AnimatePresence>
			</div>
		</OnboardingContext.Provider>,
		document.body,
	);
}

// ─── Centered Step (backdrop + card) ─────────────────────────────────────────

function CenteredStep({
	step,
	onSkip,
}: {
	step: TourStep;
	onSkip: () => void;
}) {
	const { stepIndex, totalSteps, isTourMode, goNext } =
		useContext(OnboardingContext)!;

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
				onClick={isTourMode ? onSkip : undefined}
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
						{Array.from({ length: totalSteps }).map((_, i) => (
							<motion.div
								// biome-ignore lint/suspicious/noArrayIndexKey: static step indicators
								key={i}
								className={cn(
									"h-1.5 rounded-full transition-all",
									i <= stepIndex
										? "w-6 bg-gradient-to-r from-rose-500 to-red-500"
										: "w-1.5 bg-stone-200",
								)}
								animate={{ width: i <= stepIndex ? 24 : 6 }}
							/>
						))}
					</div>

					<AnimatePresence mode="wait">
						{step.id === "welcome" && <WelcomeStep key="welcome" />}
						{step.id === "profile" && (
							<ProfileStep key="profile" onSubmit={goNext} />
						)}
						{step.id === "ready" && (
							<ReadyStep key="ready" onClose={onSkip} />
						)}
					</AnimatePresence>
				</motion.div>
			</div>
		</motion.div>
	);
}
