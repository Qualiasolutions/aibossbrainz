import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const siteUrl =
	process.env.NEXT_PUBLIC_APP_URL || "https://bossbrainz.aleccimedia.com";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: "AI Boss Brainz",
		template: "%s | AI Boss Brainz",
	},
	description: "Your Sales and Marketing Secret Weapon",
	keywords: [
		"AI consulting",
		"marketing strategy",
		"sales strategy",
		"business AI",
		"executive coaching",
	],
	authors: [{ name: "Alecci Media" }, { name: "Qualia Solutions" }],
	creator: "Qualia Solutions",
	icons: {
		icon: [
			{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
			{ url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
			{ url: "/icon-192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icon-512.png", sizes: "512x512", type: "image/png" },
		],
		shortcut: [{ url: "/favicon-32x32.png" }],
		apple: [
			{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
		],
	},
	manifest: "/manifest.webmanifest",
	openGraph: {
		type: "website",
		locale: "en_US",
		url: siteUrl,
		siteName: "AI Boss Brainz",
		title: "AI Boss Brainz",
		description: "Your Sales and Marketing Secret Weapon",
		images: [
			{
				url: "/opengraph-image.png",
				width: 1200,
				height: 630,
				alt: "AI Boss Brainz",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "AI Boss Brainz",
		description: "Your Sales and Marketing Secret Weapon",
		images: ["/twitter-image.png"],
		creator: "@aleccimedia",
	},
	robots: {
		index: true,
		follow: true,
	},
};

export const viewport = {
	maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)";
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			className={`${GeistSans.variable} ${GeistMono.variable}`}
			// `next-themes` injects an extra classname to the body element to avoid
			// visual flicker before hydration. Hence the `suppressHydrationWarning`
			// prop is necessary to avoid the React hydration mismatch warning.
			// https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
			lang="en"
			suppressHydrationWarning
		>
			<head>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
					dangerouslySetInnerHTML={{
						__html: THEME_COLOR_SCRIPT,
					}}
				/>
			</head>
			<body className="min-h-screen bg-background text-foreground antialiased">
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					disableTransitionOnChange
					enableSystem={false}
				>
					<Toaster position="top-center" />
					<Suspense>{children}</Suspense>
				</ThemeProvider>
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
