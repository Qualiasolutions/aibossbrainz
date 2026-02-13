import type { Metadata } from "next";
import { TermsPageClient } from "./terms-client";

export const metadata: Metadata = {
	title: "Terms of Service | BossBrainz",
	description:
		"Terms of service for BossBrainz by Alecci Media LLC. Review the terms governing your use of our AI executive consulting platform.",
};

export default function TermsPage() {
	return <TermsPageClient />;
}
