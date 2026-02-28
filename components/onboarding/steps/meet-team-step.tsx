"use client";

import {
	Brain,
	LayoutGrid,
	MessageSquare,
	Users,
} from "lucide-react";
import { TargetedStep } from "../shared/targeted-step";

interface TourStep {
	id: string;
	target?: string;
	title: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	placement?: "top" | "bottom";
}

interface MeetTeamStepProps {
	step: TourStep;
	onSkip: () => void;
}

export const MEET_TEAM_STEPS: TourStep[] = [
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
];

export function MeetTeamStep({ step, onSkip }: MeetTeamStepProps) {
	return <TargetedStep step={step} onSkip={onSkip} />;
}
