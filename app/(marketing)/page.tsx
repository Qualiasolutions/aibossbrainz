import type { Metadata } from "next";
import { getLandingPageContent } from "@/lib/cms/landing-page";
import { LandingPageClient } from "./landing-page-client";

export const metadata: Metadata = {
	title: "BossBrainz | AI Executive Consulting by Alecci Media",
	description:
		"Get 24/7 executive-level marketing and sales strategy from AI-powered consultants Alexandria (CMO) and Kim (CSO). Grow your business with BossBrainz.",
};

// Revalidate landing page every 5 minutes (ISR)
// CMS content rarely changes, no need for dynamic rendering
export const revalidate = 300;

export default async function LandingPage() {
	const content = await getLandingPageContent();

	return <LandingPageClient content={content} />;
}
