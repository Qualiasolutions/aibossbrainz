import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	const baseUrl =
		process.env.NEXT_PUBLIC_APP_URL || "https://bossbrainz.aleccimedia.com";

	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/api/", "/chat/"],
			},
		],
		sitemap: `${baseUrl}/sitemap.xml`,
	};
}
