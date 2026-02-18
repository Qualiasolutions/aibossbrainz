import "server-only";
import { unstable_cache } from "next/cache";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/server";
import {
	defaultLandingPageContent,
	type LandingPageCMSContent,
} from "./landing-page-types";

// Re-export types for convenience
export type { LandingPageCMSContent } from "./landing-page-types";
export { getGradientStyle } from "./landing-page-types";

async function fetchLandingPageContentUncached(): Promise<LandingPageCMSContent> {
	try {
		const supabase = createServiceClient();

		const { data, error } = await supabase
			.from("LandingPageContent")
			.select("section, key, value");

		if (error || !data) {
			logger.error({ err: error }, "Failed to fetch landing page CMS content");
			return defaultLandingPageContent;
		}

		// Build content object from database rows
		const content: Record<string, Record<string, string>> = {};
		for (const row of data) {
			if (!content[row.section]) {
				content[row.section] = {};
			}
			content[row.section][row.key] = row.value;
		}

		// Merge with defaults to ensure all fields exist
		return {
			hero: { ...defaultLandingPageContent.hero, ...content.hero },
			executives: {
				...defaultLandingPageContent.executives,
				...content.executives,
			},
			benefits: { ...defaultLandingPageContent.benefits, ...content.benefits },
			cta: { ...defaultLandingPageContent.cta, ...content.cta },
			theme: { ...defaultLandingPageContent.theme, ...content.theme },
			header: { ...defaultLandingPageContent.header, ...content.header },
			footer: { ...defaultLandingPageContent.footer, ...content.footer },
			checkup: { ...defaultLandingPageContent.checkup, ...content.checkup },
		};
	} catch (err) {
		logger.error({ err }, "Exception in fetchLandingPageContent");
		return defaultLandingPageContent;
	}
}

// Cached version with 60 second revalidation
export const getLandingPageContent = unstable_cache(
	fetchLandingPageContentUncached,
	["landing-page-content"],
	{
		revalidate: 60, // Revalidate every 60 seconds
		tags: ["landing-page"],
	},
);
