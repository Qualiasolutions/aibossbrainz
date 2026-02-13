import type { Metadata } from "next";
import { getLandingPageContent } from "@/lib/cms/landing-page";
import { AboutPageClient } from "./about-client";

export const metadata: Metadata = {
	title: "About | BossBrainz",
	description:
		"Learn about Alecci Media and the AI executive team behind BossBrainz. Meet Alexandria (CMO) and Kim (CSO), your 24/7 strategic advisors.",
};

export const revalidate = 300;

export default async function AboutPage() {
	const content = await getLandingPageContent();

	return <AboutPageClient content={content} />;
}
