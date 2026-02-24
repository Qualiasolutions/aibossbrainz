"use client";

import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { AnimatePresence, motion } from "framer-motion";
import {
	ArrowLeft,
	ArrowRight,
	Bookmark,
	Brain,
	Briefcase,
	Building2,
	Download,
	Globe,
	LayoutGrid,
	Lightbulb,
	Loader2,
	Map,
	MessageSquare,
	Mic,
	Rocket,
	Search,
	Sparkles,
	Target,
	Users,
	Zap,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "@/components/toast";
import { useCsrf } from "@/hooks/use-csrf";
import { BOT_PERSONALITIES, FOCUS_MODES } from "@/lib/bot-personalities";
import { INDUSTRIES } from "@/lib/constants/business-profile";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

interface UserProfile {
	displayName: string | null;
	companyName: string | null;
	industry: string | null;
	onboardedAt: string | null;
}

type OnboardingStep =
	| "welcome"
	| "meet-team"
	| "focus-modes"
	| "strategy-canvas"
	| "smart-features"
	| "voice-power"
	| "profile"
	| "ready";

const STEPS: OnboardingStep[] = [
	"welcome",
	"meet-team",
	"focus-modes",
	"strategy-canvas",
	"smart-features",
	"voice-power",
	"profile",
	"ready",
];

const alexandria = BOT_PERSONALITIES.alexandria;
const kim = BOT_PERSONALITIES.kim;

// Tour-only steps (no profile collection)
const TOUR_STEPS: OnboardingStep[] = [
	"welcome",
	"meet-team",
	"focus-modes",
	"strategy-canvas",
	"smart-features",
	"voice-power",
	"ready",
];

export function OnboardingModal() {
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isTourMode, setIsTourMode] = useState(false);
	const [step, setStep] = useState<OnboardingStep>("welcome");
	// Profile fields
	const [displayName, setDisplayName] = useState("");
	const [companyName, setCompanyName] = useState("");
	const [industry, setIndustry] = useState("");
	const { csrfFetch, isLoading: csrfLoading } = useCsrf();

	const activeSteps = isTourMode ? TOUR_STEPS : STEPS;

	// Listen for "start-product-tour" custom event from sidebar
	useEffect(() => {
		const handleStartTour = () => {
			setIsTourMode(true);
			setStep("welcome");
			setIsOpen(true);
			setIsLoading(false);
		};
		window.addEventListener("start-product-tour", handleStartTour);
		return () =>
			window.removeEventListener("start-product-tour", handleStartTour);
	}, []);

	useEffect(() => {
		async function checkProfile() {
			try {
				const res = await fetch("/api/profile");
				if (res.ok) {
					const profile: UserProfile = await res.json();
					if (!profile.onboardedAt) {
						setIsOpen(true);
					}
				}
			} catch (error) {
				console.error("Failed to fetch profile:", error);
			} finally {
				setIsLoading(false);
			}
		}

		checkProfile();
	}, []);

	const currentStepIndex = activeSteps.indexOf(step);

	const goNext = () => {
		const nextIndex = currentStepIndex + 1;
		if (nextIndex < activeSteps.length) {
			setStep(activeSteps[nextIndex]);
		}
	};

	const goBack = () => {
		const prevIndex = currentStepIndex - 1;
		if (prevIndex >= 0) {
			setStep(activeSteps[prevIndex]);
		}
	};

	const closeTour = () => {
		setIsOpen(false);
		setStep("welcome");
		setIsTourMode(false);
	};

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
				setStep("ready");
				setTimeout(() => {
					setIsOpen(false);
					setIsTourMode(false);
				}, 3000);
			} else {
				const errorData = await res.json().catch(() => ({}));
				console.error("Failed to save profile:", errorData);
				toast({
					type: "error",
					description: "Failed to save your profile. Please try again.",
				});
			}
		} catch (error) {
			console.error("Failed to save profile:", error);
			toast({
				type: "error",
				description: "Something went wrong. Please try again.",
			});
		} finally {
			setIsSaving(false);
		}
	};

	// Don't render anything until we know whether to show the modal
	if (isLoading || !isOpen) return null;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && isTourMode) closeTour();
			}}
		>
			<DialogContent
				className="max-w-xl overflow-hidden border-0 bg-white p-0 shadow-2xl sm:rounded-2xl"
				onPointerDownOutside={(e) => {
					if (!isTourMode) e.preventDefault();
				}}
				onEscapeKeyDown={(e) => {
					if (!isTourMode) e.preventDefault();
				}}
			>
				{/* Step progress indicator */}
				<div className="flex items-center justify-center gap-1.5 bg-stone-50 py-3">
					{activeSteps.map((s, i) => (
						<motion.div
							key={s}
							className={cn(
								"h-1.5 rounded-full transition-all duration-300",
								i <= currentStepIndex
									? "w-6 bg-gradient-to-r from-rose-500 to-red-500"
									: "w-1.5 bg-stone-200",
							)}
							initial={false}
							animate={{
								width: i <= currentStepIndex ? 24 : 6,
							}}
						/>
					))}
				</div>

				<AnimatePresence mode="wait">
					{step === "welcome" && (
						<WelcomeStep key="welcome" onNext={goNext} />
					)}
					{step === "meet-team" && (
						<MeetTeamStep key="meet-team" onNext={goNext} onBack={goBack} />
					)}
					{step === "focus-modes" && (
						<FocusModesStep
							key="focus-modes"
							onNext={goNext}
							onBack={goBack}
						/>
					)}
					{step === "strategy-canvas" && (
						<StrategyCanvasStep
							key="strategy-canvas"
							onNext={goNext}
							onBack={goBack}
						/>
					)}
					{step === "smart-features" && (
						<SmartFeaturesStep
							key="smart-features"
							onNext={goNext}
							onBack={goBack}
						/>
					)}
					{step === "voice-power" && (
						<VoicePowerStep
							key="voice-power"
							onNext={goNext}
							onBack={goBack}
						/>
					)}
					{!isTourMode && step === "profile" && (
						<ProfileStep
							key="profile"
							displayName={displayName}
							setDisplayName={setDisplayName}
							companyName={companyName}
							setCompanyName={setCompanyName}
							industry={industry}
							setIndustry={setIndustry}
							onSubmit={saveAndFinish}
							onBack={goBack}
							isSaving={isSaving}
						/>
					)}
					{step === "ready" && (
						<ReadyStep
							key="ready"
							displayName={displayName || "there"}
							tourMode={isTourMode}
							onClose={closeTour}
						/>
					)}
				</AnimatePresence>
			</DialogContent>
		</Dialog>
	);
}

// Step wrapper with consistent animation
function StepWrapper({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.25 }}
			className={cn("relative flex flex-col px-8 pt-6 pb-8", className)}
		>
			{children}
		</motion.div>
	);
}

// Navigation buttons component
function StepNav({
	onNext,
	onBack,
	nextLabel = "Continue",
	showBack = true,
	disabled = false,
	loading = false,
}: {
	onNext: () => void;
	onBack?: () => void;
	nextLabel?: string;
	showBack?: boolean;
	disabled?: boolean;
	loading?: boolean;
}) {
	return (
		<div className="mt-6 flex items-center gap-3">
			{showBack && onBack && (
				<Button
					variant="ghost"
					onClick={onBack}
					className="h-11 px-4 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
				>
					<ArrowLeft className="mr-1.5 size-4" />
					Back
				</Button>
			)}
			<Button
				onClick={onNext}
				disabled={disabled || loading}
				className="group h-11 flex-1 bg-stone-900 font-semibold text-white transition-all hover:bg-stone-800 disabled:opacity-50"
			>
				{loading ? (
					<>
						<Loader2 className="mr-2 size-4 animate-spin" />
						Setting up...
					</>
				) : (
					<>
						{nextLabel}
						<ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
					</>
				)}
			</Button>
		</div>
	);
}

// Step 1: Welcome
function WelcomeStep({ onNext }: { onNext: () => void }) {
	return (
		<StepWrapper className="items-center pt-10 pb-10">
			<VisuallyHidden.Root>
				<DialogTitle>Welcome to Boss Brainz</DialogTitle>
				<DialogDescription>
					Your executive AI consulting team awaits
				</DialogDescription>
			</VisuallyHidden.Root>

			{/* Animated logo/brand mark */}
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
							transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
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
							transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
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
				Meet your executive AI consulting team. Let's show you around in about
				2 minutes.
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
					Let's Get Started
					<Sparkles className="ml-2 size-4" />
				</Button>
			</motion.div>
		</StepWrapper>
	);
}

// Step 2: Meet Your Team
function MeetTeamStep({
	onNext,
	onBack,
}: {
	onNext: () => void;
	onBack: () => void;
}) {
	return (
		<StepWrapper>
			<VisuallyHidden.Root>
				<DialogTitle>Meet Your Executive Team</DialogTitle>
				<DialogDescription>Alexandria and Kim are ready to help</DialogDescription>
			</VisuallyHidden.Root>

			<div className="mb-5 text-center">
				<h2 className="mb-1 font-bold text-xl tracking-tight text-stone-900">
					Your Executive Team
				</h2>
				<p className="text-sm text-stone-500">
					Two AI experts with complementary skills
				</p>
			</div>

			{/* Executive cards - side by side */}
			<div className="mb-2 grid grid-cols-2 gap-3">
				{/* Alexandria */}
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.1 }}
					className="overflow-hidden rounded-xl border border-stone-200 bg-gradient-to-b from-white to-rose-50/30"
				>
					<div className="bg-gradient-to-r from-rose-500 to-rose-600 p-3">
						<div className="flex items-center gap-2.5">
							{alexandria.avatar && (
								<div className="relative size-10 overflow-hidden rounded-full border-2 border-white/30 shadow-lg">
									<Image
										src={alexandria.avatar}
										alt={alexandria.name}
										fill
										className="object-cover"
										sizes="40px"
									/>
								</div>
							)}
							<div>
								<p className="font-semibold text-sm text-white">Alexandria</p>
								<p className="text-[11px] text-white/70">Chief Marketing Officer</p>
							</div>
						</div>
					</div>
					<div className="p-3">
						<p className="mb-2 text-xs leading-relaxed text-stone-600">
							Brand strategist & creative director. Expert in positioning,
							messaging, and customer experience.
						</p>
						<div className="flex flex-wrap gap-1">
							{["Branding", "Content", "Social"].map((skill) => (
								<span
									key={skill}
									className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700"
								>
									{skill}
								</span>
							))}
						</div>
					</div>
				</motion.div>

				{/* Kim */}
				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.2 }}
					className="overflow-hidden rounded-xl border border-stone-200 bg-gradient-to-b from-white to-red-50/30"
				>
					<div className="bg-gradient-to-r from-red-500 to-red-600 p-3">
						<div className="flex items-center gap-2.5">
							{kim.avatar && (
								<div className="relative size-10 overflow-hidden rounded-full border-2 border-white/30 shadow-lg">
									<Image
										src={kim.avatar}
										alt={kim.name}
										fill
										className="object-cover"
										sizes="40px"
									/>
								</div>
							)}
							<div>
								<p className="font-semibold text-sm text-white">Kim</p>
								<p className="text-[11px] text-white/70">Chief Strategy Officer</p>
							</div>
						</div>
					</div>
					<div className="p-3">
						<p className="mb-2 text-xs leading-relaxed text-stone-600">
							Sales strategist & business analyst. Expert in pricing, revenue,
							and market expansion.
						</p>
						<div className="flex flex-wrap gap-1">
							{["Sales", "Pricing", "Growth"].map((skill) => (
								<span
									key={skill}
									className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700"
								>
									{skill}
								</span>
							))}
						</div>
					</div>
				</motion.div>
			</div>

			{/* Collaborative hint */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.3 }}
				className="flex items-center gap-3 rounded-lg bg-stone-100 p-3"
			>
				<div className="flex -space-x-2">
					{alexandria.avatar && (
						<div className="relative size-6 overflow-hidden rounded-full border border-white">
							<Image
								src={alexandria.avatar}
								alt=""
								fill
								className="object-cover"
								sizes="24px"
							/>
						</div>
					)}
					{kim.avatar && (
						<div className="relative size-6 overflow-hidden rounded-full border border-white">
							<Image src={kim.avatar} alt="" fill className="object-cover" sizes="24px" />
						</div>
					)}
				</div>
				<p className="text-xs text-stone-600">
					<span className="font-medium">Collaborative mode</span> — Get both
					perspectives at once for comprehensive advice
				</p>
			</motion.div>

			<StepNav onNext={onNext} onBack={onBack} showBack={false} />
		</StepWrapper>
	);
}

// Step 3: Focus Modes
function FocusModesStep({
	onNext,
	onBack,
}: {
	onNext: () => void;
	onBack: () => void;
}) {
	const focusModesList = [
		{ mode: FOCUS_MODES.business_analysis, icon: Search },
		{ mode: FOCUS_MODES.pricing, icon: Target },
		{ mode: FOCUS_MODES.key_messaging, icon: MessageSquare },
		{ mode: FOCUS_MODES.customer_journey, icon: Users },
		{ mode: FOCUS_MODES.social_media, icon: Globe },
		{ mode: FOCUS_MODES.launch_strategy, icon: Rocket },
	];

	return (
		<StepWrapper>
			<VisuallyHidden.Root>
				<DialogTitle>Focus Modes</DialogTitle>
				<DialogDescription>
					Specialized conversation modes for different business needs
				</DialogDescription>
			</VisuallyHidden.Root>

			<div className="mb-5 text-center">
				<div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
					<Brain className="size-6 text-white" />
				</div>
				<h2 className="mb-1 font-bold text-xl tracking-tight text-stone-900">
					Focus Modes
				</h2>
				<p className="text-sm text-stone-500">
					Switch modes to steer the conversation toward specific business topics
				</p>
			</div>

			{/* Focus mode chips preview */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="mb-4 rounded-xl border border-stone-200 bg-stone-50 p-4"
			>
				<p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-stone-400">
					Available Focus Modes
				</p>
				<div className="grid grid-cols-3 gap-2">
					{focusModesList.map(({ mode, icon: Icon }, index) => (
						<motion.div
							key={mode.id}
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.15 + index * 0.05 }}
							className={cn(
								"flex flex-col items-center gap-1.5 rounded-lg border bg-white p-2.5 transition-all",
								index === 1
									? "border-red-300 ring-2 ring-red-100"
									: "border-stone-200",
							)}
						>
							<Icon
								className={cn(
									"size-4",
									index === 1 ? "text-red-500" : "text-stone-400",
								)}
							/>
							<span
								className={cn(
									"text-[10px] font-medium",
									index === 1 ? "text-red-600" : "text-stone-600",
								)}
							>
								{mode.name}
							</span>
						</motion.div>
					))}
				</div>
			</motion.div>

			{/* How it works */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.4 }}
				className="flex items-start gap-3 rounded-lg bg-blue-50 p-3"
			>
				<Zap className="mt-0.5 size-4 shrink-0 text-blue-500" />
				<p className="text-xs leading-relaxed text-blue-800">
					<span className="font-medium">How it works:</span> Select a focus mode
					before asking your question. The AI will tailor its response to that
					specific business area.
				</p>
			</motion.div>

			<StepNav onNext={onNext} onBack={onBack} />
		</StepWrapper>
	);
}

// Step 4: Strategy Canvas
function StrategyCanvasStep({
	onNext,
	onBack,
}: {
	onNext: () => void;
	onBack: () => void;
}) {
	const canvasTools = [
		{
			name: "SWOT Analysis",
			description: "Strengths, Weaknesses, Opportunities, Threats",
			icon: LayoutGrid,
			color: "from-emerald-500 to-teal-600",
			bgColor: "bg-emerald-50",
			textColor: "text-emerald-700",
		},
		{
			name: "Business Model",
			description: "Map your business model canvas",
			icon: Briefcase,
			color: "from-violet-500 to-purple-600",
			bgColor: "bg-violet-50",
			textColor: "text-violet-700",
		},
		{
			name: "Customer Journey",
			description: "Visualize the customer experience",
			icon: Map,
			color: "from-orange-500 to-amber-600",
			bgColor: "bg-orange-50",
			textColor: "text-orange-700",
		},
		{
			name: "Brainstorm",
			description: "Capture ideas and insights",
			icon: Lightbulb,
			color: "from-pink-500 to-rose-600",
			bgColor: "bg-pink-50",
			textColor: "text-pink-700",
		},
	];

	return (
		<StepWrapper>
			<VisuallyHidden.Root>
				<DialogTitle>Strategy Canvas</DialogTitle>
				<DialogDescription>
					Interactive strategy tools to visualize your business
				</DialogDescription>
			</VisuallyHidden.Root>

			<div className="mb-5 text-center">
				<div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
					<LayoutGrid className="size-6 text-white" />
				</div>
				<h2 className="mb-1 font-bold text-xl tracking-tight text-stone-900">
					Strategy Canvas
				</h2>
				<p className="text-sm text-stone-500">
					Visual tools to map and organize your business strategy
				</p>
			</div>

			{/* Canvas tools grid */}
			<div className="mb-4 grid grid-cols-2 gap-2.5">
				{canvasTools.map((tool, index) => (
					<motion.div
						key={tool.name}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 + index * 0.08 }}
						className={cn(
							"group rounded-xl border border-stone-200 p-3 transition-all hover:border-stone-300 hover:shadow-sm",
							tool.bgColor,
						)}
					>
						<div
							className={cn(
								"mb-2 flex size-8 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm",
								tool.color,
							)}
						>
							<tool.icon className="size-4 text-white" />
						</div>
						<p className={cn("mb-0.5 font-semibold text-xs", tool.textColor)}>
							{tool.name}
						</p>
						<p className="text-[10px] leading-relaxed text-stone-500">
							{tool.description}
						</p>
					</motion.div>
				))}
			</div>

			{/* Tip */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.5 }}
				className="flex items-start gap-3 rounded-lg bg-emerald-50 p-3"
			>
				<Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-500" />
				<p className="text-xs leading-relaxed text-emerald-800">
					<span className="font-medium">Pro tip:</span> The AI can automatically
					populate your canvas tools during conversation. Just ask to "fill out
					my SWOT" or "create a business model."
				</p>
			</motion.div>

			<StepNav onNext={onNext} onBack={onBack} />
		</StepWrapper>
	);
}

// Step 5: Smart Features
function SmartFeaturesStep({
	onNext,
	onBack,
}: {
	onNext: () => void;
	onBack: () => void;
}) {
	const features = [
		{
			icon: Globe,
			title: "Web Search",
			description: "AI searches the web for real-time market data and research",
			color: "text-blue-500",
			bgColor: "bg-blue-50",
		},
		{
			icon: Bookmark,
			title: "Save & React",
			description: "Mark messages as actionable, save for later, or flag for clarity",
			color: "text-amber-500",
			bgColor: "bg-amber-50",
		},
		{
			icon: Download,
			title: "Export PDF",
			description: "Download your conversations as professional PDF reports",
			color: "text-violet-500",
			bgColor: "bg-violet-50",
		},
		{
			icon: Lightbulb,
			title: "Action Items",
			description: "Track tasks and insights from your consulting sessions",
			color: "text-emerald-500",
			bgColor: "bg-emerald-50",
		},
	];

	return (
		<StepWrapper>
			<VisuallyHidden.Root>
				<DialogTitle>Smart Features</DialogTitle>
				<DialogDescription>
					Powerful tools to enhance your consulting experience
				</DialogDescription>
			</VisuallyHidden.Root>

			<div className="mb-5 text-center">
				<div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
					<Sparkles className="size-6 text-white" />
				</div>
				<h2 className="mb-1 font-bold text-xl tracking-tight text-stone-900">
					Smart Features
				</h2>
				<p className="text-sm text-stone-500">
					Tools to capture, organize, and act on insights
				</p>
			</div>

			{/* Features list */}
			<div className="space-y-2.5">
				{features.map((feature, index) => (
					<motion.div
						key={feature.title}
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.1 + index * 0.08 }}
						className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 transition-all hover:border-stone-300"
					>
						<div
							className={cn(
								"flex size-9 shrink-0 items-center justify-center rounded-lg",
								feature.bgColor,
							)}
						>
							<feature.icon className={cn("size-4", feature.color)} />
						</div>
						<div>
							<p className="mb-0.5 font-semibold text-sm text-stone-900">
								{feature.title}
							</p>
							<p className="text-xs leading-relaxed text-stone-500">
								{feature.description}
							</p>
						</div>
					</motion.div>
				))}
			</div>

			<StepNav onNext={onNext} onBack={onBack} />
		</StepWrapper>
	);
}

// Step 6: Voice Power
function VoicePowerStep({
	onNext,
	onBack,
}: {
	onNext: () => void;
	onBack: () => void;
}) {
	return (
		<StepWrapper>
			<VisuallyHidden.Root>
				<DialogTitle>Voice Features</DialogTitle>
				<DialogDescription>Listen to AI responses in natural voice</DialogDescription>
			</VisuallyHidden.Root>

			<div className="mb-5 text-center">
				<div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
					<Mic className="size-6 text-white" />
				</div>
				<h2 className="mb-1 font-bold text-xl tracking-tight text-stone-900">
					Voice Playback
				</h2>
				<p className="text-sm text-stone-500">
					Listen to responses with natural text-to-speech
				</p>
			</div>

			{/* Voice demo visual */}
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="mb-4 rounded-xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-5"
			>
				<div className="flex items-center justify-center gap-3">
					{/* Sound wave animation */}
					<div className="flex items-center gap-1">
						{[3, 5, 7, 5, 3, 6, 4, 7, 5, 3].map((height, i) => (
							<motion.div
								key={i}
								className="w-1 rounded-full bg-violet-400"
								initial={{ height: 8 }}
								animate={{ height: [8, height * 4, 8] }}
								transition={{
									duration: 0.8,
									repeat: Number.POSITIVE_INFINITY,
									delay: i * 0.1,
								}}
							/>
						))}
					</div>
				</div>
				<p className="mt-4 text-center text-sm text-violet-700">
					"Click the speaker icon on any message to hear it read aloud."
				</p>
			</motion.div>

			{/* Benefits */}
			<div className="space-y-2">
				{[
					"Perfect for multitasking while getting advice",
					"Natural-sounding voice powered by ElevenLabs",
					"Works on all AI responses",
				].map((benefit, index) => (
					<motion.div
						key={benefit}
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.2 + index * 0.08 }}
						className="flex items-center gap-2 text-sm text-stone-600"
					>
						<div className="size-1.5 rounded-full bg-violet-400" />
						{benefit}
					</motion.div>
				))}
			</div>

			<StepNav onNext={onNext} onBack={onBack} />
		</StepWrapper>
	);
}

// Step 7: Profile
function ProfileStep({
	displayName,
	setDisplayName,
	companyName,
	setCompanyName,
	industry,
	setIndustry,
	onSubmit,
	onBack,
	isSaving,
}: {
	displayName: string;
	setDisplayName: (value: string) => void;
	companyName: string;
	setCompanyName: (value: string) => void;
	industry: string;
	setIndustry: (value: string) => void;
	onSubmit: () => void;
	onBack: () => void;
	isSaving: boolean;
}) {
	return (
		<StepWrapper>
			<VisuallyHidden.Root>
				<DialogTitle>Quick Setup</DialogTitle>
				<DialogDescription>Tell us a bit about yourself</DialogDescription>
			</VisuallyHidden.Root>

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
				{/* Name */}
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

				{/* Company */}
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
						<span className="font-normal text-stone-400 text-xs">(optional)</span>
					</Label>
					<Input
						id="companyName"
						placeholder="Your company or business name"
						value={companyName}
						onChange={(e) => setCompanyName(e.target.value)}
						className="h-11 border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:ring-stone-400/20"
					/>
				</motion.div>

				{/* Industry */}
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
						<span className="font-normal text-stone-400 text-xs">(optional)</span>
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

			<StepNav
				onNext={onSubmit}
				onBack={onBack}
				nextLabel="Finish Setup"
				loading={isSaving}
			/>
		</StepWrapper>
	);
}

// Step 8: Ready
function ReadyStep({
	displayName,
	tourMode = false,
	onClose,
}: {
	displayName: string;
	tourMode?: boolean;
	onClose?: () => void;
}) {
	return (
		<StepWrapper className="items-center py-12">
			<VisuallyHidden.Root>
				<DialogTitle>You're All Set</DialogTitle>
				<DialogDescription>
					Start chatting with your executive team
				</DialogDescription>
			</VisuallyHidden.Root>

			{/* Success animation */}
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

			{/* Executive avatars with checkmarks */}
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
		</StepWrapper>
	);
}
