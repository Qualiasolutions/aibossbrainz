import { getLandingPageContent } from "@/lib/cms/landing-page";
import { MarketingLayoutClient } from "./marketing-layout-client";

async function getIsLoggedIn(): Promise<boolean> {
	try {
		// Only attempt auth check if Supabase env vars are available
		if (
			!process.env.NEXT_PUBLIC_SUPABASE_URL ||
			!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
		) {
			return false;
		}
		const { createClient } = await import("@/lib/supabase/server");
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		return !!user;
	} catch {
		return false;
	}
}

export default async function MarketingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const content = await getLandingPageContent();
	const isLoggedIn = await getIsLoggedIn();

	return (
		<MarketingLayoutClient content={content} isLoggedIn={isLoggedIn}>
			{children}
		</MarketingLayoutClient>
	);
}
