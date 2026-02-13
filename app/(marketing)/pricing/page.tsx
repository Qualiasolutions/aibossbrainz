import type { Metadata } from "next";
import { PricingPageClient } from "./pricing-client";

export const metadata: Metadata = {
	title: "Pricing | BossBrainz",
	description:
		"Simple, transparent pricing for AI executive consulting. Choose monthly, annual, or lifetime access to Alexandria (CMO) and Kim (CSO).",
};

export default function PricingPage() {
	return <PricingPageClient />;
}
