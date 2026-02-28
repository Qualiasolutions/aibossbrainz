"use client";

import { cn } from "@/lib/utils";
import { useOnboarding } from "../onboarding-context";

export function StepDots() {
	const { stepIndex, totalSteps } = useOnboarding();

	return (
		<div className="flex items-center gap-1">
			{Array.from({ length: totalSteps }).map((_, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: static dot indicators
					key={i}
					className={cn(
						"rounded-full transition-all duration-300",
						i === stepIndex
							? "h-2 w-4 bg-rose-500"
							: i < stepIndex
								? "size-2 bg-rose-300"
								: "size-2 bg-stone-200",
					)}
				/>
			))}
		</div>
	);
}
