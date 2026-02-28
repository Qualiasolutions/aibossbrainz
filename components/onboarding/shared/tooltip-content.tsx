"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "../onboarding-context";
import { StepDots } from "./step-dots";

interface TourStep {
	id: string;
	target?: string;
	title: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	placement?: "top" | "bottom";
}

interface TooltipContentProps {
	step: TourStep;
	onSkip: () => void;
}

export function TooltipContent({ step, onSkip }: TooltipContentProps) {
	const { goNext, goBack, canGoBack, isTourMode } = useOnboarding();
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
				<StepDots />
				<div className="flex items-center gap-2">
					{isTourMode && (
						<button
							type="button"
							onClick={onSkip}
							className="text-xs text-stone-400 transition-colors hover:text-stone-600"
						>
							Skip
						</button>
					)}
					{canGoBack && (
						<Button
							variant="ghost"
							size="sm"
							onClick={goBack}
							className="h-8 px-2 text-stone-500 hover:bg-stone-100"
						>
							<ArrowLeft className="size-3.5" />
						</Button>
					)}
					<Button
						size="sm"
						onClick={goNext}
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
