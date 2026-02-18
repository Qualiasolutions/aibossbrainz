export type LandingPageCMSContent = {
	hero: {
		title_main: string;
		title_highlight: string;
		subtitle: string;
		cta_primary_text: string;
		cta_primary_link: string;
		cta_secondary_text: string;
		cta_secondary_link: string;
		media_type: "none" | "image" | "video";
		media_url: string;
	};
	executives: {
		section_title: string;
		section_title_highlight: string;
		section_subtitle: string;
		alex_name: string;
		alex_role: string;
		alex_image: string;
		alex_expertise: string;
		kim_name: string;
		kim_role: string;
		kim_image: string;
		kim_expertise: string;
		alex_description: string;
		kim_description: string;
	};
	checkup: {
		section_title: string;
		item_1_title: string;
		item_1_value: string;
		item_2_title: string;
		item_2_value: string;
		item_3_title: string;
		item_3_value: string;
	};
	benefits: {
		section_title: string;
		section_subtitle: string;
		benefit_1_title: string;
		benefit_1_desc: string;
		benefit_1_icon: string;
		benefit_2_title: string;
		benefit_2_desc: string;
		benefit_2_icon: string;
		benefit_3_title: string;
		benefit_3_desc: string;
		benefit_3_icon: string;
		benefit_4_title: string;
		benefit_4_desc: string;
		benefit_4_icon: string;
	};
	cta: {
		title: string;
		subtitle: string;
		cta_primary_text: string;
		cta_primary_link: string;
		cta_secondary_text: string;
		cta_secondary_link: string;
	};
	theme: {
		primary_gradient_from: string;
		primary_gradient_to: string;
		accent_color: string;
		background_color: string;
	};
	header: {
		logo_url: string;
	};
	footer: {
		tagline: string;
		email: string;
		copyright: string;
	};
};

// Default content as fallback
export const defaultLandingPageContent: LandingPageCMSContent = {
	hero: {
		title_main: "AI Boss Brainz",
		title_highlight: "Your Sales & Marketing Experts 24/7",
		subtitle:
			"AI-powered. Expert-led. Get high-level sales and marketing strategy built to grow your brand, results-obsessed, and ready to drop strategies that work.",
		cta_primary_text: "Start 14-Day Free Trial",
		cta_primary_link: "/signup",
		cta_secondary_text: "View Pricing",
		cta_secondary_link: "/pricing",
		media_type: "none" as const,
		media_url: "",
	},
	executives: {
		section_title: "Meet Your",
		section_title_highlight: "Sales and Marketing Masterminds",
		section_subtitle:
			"40+ years bringing Fortune 500 strategy to founders to the next level. Now laser-focused on scaling your brand with strategy that actually sells.",
		alex_name: "Alexandria Alecci",
		alex_role: "Chief Marketing Officer",
		alex_image: "/images/alex-avatar.png",
		alex_expertise: "Brand Strategy,Go-to-Market,Digital Campaigns",
		kim_name: "Kim Mylls",
		kim_role: "Chief Sales Officer",
		kim_image: "/images/kim-avatar.png",
		kim_expertise: "Enterprise Sales,Pipeline Growth,Deal Closing",
		alex_description:
			"Brand strategist with Fortune 500 experience. Specializes in go-to-market strategy, brand positioning, and digital campaigns that drive growth.",
		kim_description:
			"Revenue architect and sales optimization expert. Helps build pipelines, improve conversion rates, and close deals more effectively.",
	},
	checkup: {
		section_title: "What You Get with Annual",
		item_1_title: "The Sales & Marketing Checkup",
		item_1_value: "$97",
		item_2_title: "Access to Our Resource Library",
		item_2_value: "$1,000+",
		item_3_title: "Monthly Group Sales & Marketing Strategy Call",
		item_3_value: "$6,000",
	},
	benefits: {
		section_title: "Get the Move-the-Needle Strategies Now",
		section_subtitle: "Watch your business grow with expert guidance on demand",
		benefit_1_title: "Rapid-Fire Strategy",
		benefit_1_desc:
			"At your fingertips so you never stall on sales or marketing again",
		benefit_1_icon: "Zap",
		benefit_2_title: "Talk It Out or Type It In",
		benefit_2_desc:
			"'Live' call feature - hear our voices in real-time. Feel like you're talking to Alexandria and Kim.",
		benefit_2_icon: "Mic",
		benefit_3_title: "Plug-and-Play Plans",
		benefit_3_desc: "Sales and marketing plans built to convert, no generic BS",
		benefit_3_icon: "Target",
		benefit_4_title: "40+ Years of Proof",
		benefit_4_desc:
			"Fortune 500 and founder success - proven strategies from hundreds of brands and teams",
		benefit_4_icon: "TrendingUp",
	},
	cta: {
		title: "This Is How You Grow Without Being Great at Sales or Marketing",
		subtitle:
			"You don't need to be a sales expert or marketing genius to grow - you just need the right messaging and strategy. Thousands of entrepreneurs are using our proven tools to scale. Stop second-guessing every move. Start dominating.",
		cta_primary_text: "Start 14-Day Free Trial",
		cta_primary_link: "/signup",
		cta_secondary_text: "View Pricing",
		cta_secondary_link: "/pricing",
	},
	theme: {
		primary_gradient_from: "red-500",
		primary_gradient_to: "red-600",
		accent_color: "rose-500",
		background_color: "white",
	},
	header: {
		logo_url: "/images/logo.png",
	},
	footer: {
		tagline: "Sales and Marketing Strategy 24/7",
		email: "ai.bossbrainz@aleccimedia.com",
		copyright: "AI Boss Brainz. All rights reserved.",
	},
};

// Helper to convert Tailwind color classes to CSS
export function getGradientStyle(from: string, to: string): string {
	const colorMap: Record<string, string> = {
		"red-500": "#ef4444",
		"red-600": "#dc2626",
		"red-700": "#b91c1c",
		"rose-500": "#f43f5e",
		"rose-600": "#e11d48",
		"pink-500": "#ec4899",
		"purple-500": "#a855f7",
		"blue-500": "#3b82f6",
		"emerald-500": "#10b981",
		"stone-900": "#1c1917",
		white: "#ffffff",
	};

	const fromHex = colorMap[from] || "#ef4444";
	const toHex = colorMap[to] || "#dc2626";

	return `linear-gradient(to right, ${fromHex}, ${toHex})`;
}
