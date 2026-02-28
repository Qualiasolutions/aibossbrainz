"use client";

import { createContext, useContext } from "react";

interface ProfileFormData {
	displayName: string;
	companyName: string;
	industry: string;
}

interface OnboardingContextValue {
	stepIndex: number;
	totalSteps: number;
	goNext: () => void;
	goBack: () => void;
	isTourMode: boolean;
	canGoBack: boolean;
	formData: ProfileFormData;
	setFormData: (data: Partial<ProfileFormData>) => void;
	isSaving: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
	const ctx = useContext(OnboardingContext);
	if (!ctx)
		throw new Error("useOnboarding must be used within OnboardingProvider");
	return ctx;
}

export { OnboardingContext };
export type { OnboardingContextValue, ProfileFormData };
