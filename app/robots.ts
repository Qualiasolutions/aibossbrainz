import type { MetadataRoute } from "next";
import { PRODUCTION_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_URL;

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
