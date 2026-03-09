import { getLandingPageContent } from "@/lib/cms/landing-page";
import { MarketingLayoutClient } from "./marketing-layout-client";

export default async function MarketingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const content = await getLandingPageContent();

	return (
		<MarketingLayoutClient content={content}>{children}</MarketingLayoutClient>
	);
}
