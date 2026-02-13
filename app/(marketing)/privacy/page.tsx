import type { Metadata } from "next";
import { PrivacyPageClient } from "./privacy-client";

export const metadata: Metadata = {
	title: "Privacy Policy | BossBrainz",
	description:
		"Learn how Alecci Media LLC collects, uses, and protects your personal information when using BossBrainz and our AI executive services.",
};

export default function PrivacyPage() {
	return <PrivacyPageClient />;
}
