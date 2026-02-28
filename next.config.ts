import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
	openAnalyzer: false,
});

const nextConfig: NextConfig = {
	compiler: {
		removeConsole: {
			exclude: ["error", "warn"], // Preserve for Sentry
		},
	},
	experimental: {
		// Tree-shake barrel exports for heavy libraries to reduce bundle size
		optimizePackageImports: [
			"framer-motion",
			"lucide-react",
			"date-fns",
			"react-syntax-highlighter",
			"codemirror",
			"@codemirror/state",
			"@codemirror/view",
			"@codemirror/lang-javascript",
			"@codemirror/lang-python",
			"@codemirror/lang-html",
			"@codemirror/lang-css",
			"@codemirror/lang-json",
			"@codemirror/lang-markdown",
			"prosemirror-view",
			"prosemirror-state",
			"prosemirror-model",
			"prosemirror-example-setup",
			"@phosphor-icons/react",
			"@radix-ui/react-dialog",
			"@radix-ui/react-popover",
			"@radix-ui/react-select",
			"@radix-ui/react-slider",
			"@radix-ui/react-switch",
			"@radix-ui/react-tabs",
			"@radix-ui/react-visually-hidden",
		],
	},
	images: {
		remotePatterns: [
			{
				hostname: "avatar.vercel.sh",
			},
			{
				hostname: "i.ibb.co",
			},
			{
				hostname: "esymbjpzjjkffpfqukxw.supabase.co",
			},
			{
				hostname: "images.squarespace-cdn.com",
			},
			{
				hostname: "*.public.blob.vercel-storage.com",
			},
		],
	},

	// Security headers are defined in vercel.json (single source of truth)
	// This avoids conflicts between next.config.ts and vercel.json headers.
	// vercel.json includes: CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
	// Referrer-Policy, Permissions-Policy, and embed-specific overrides.

	// Redirect www to non-www for canonical URLs
	async redirects() {
		return [
			{
				source: "/:path*",
				has: [{ type: "host", value: "aleccinew.vercel.app" }],
				destination: "https://bossbrainz.aleccimedia.com/:path*",
				permanent: true,
			},
			{
				source: "/:path*",
				has: [{ type: "host", value: "www.bossbrainz.aleccimedia.com" }],
				destination: "https://bossbrainz.aleccimedia.com/:path*",
				permanent: true,
			},
		];
	},

	webpack: (config, { isServer }) => {
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
			};
		}
		return config;
	},
};

// Export with wrapper composition: baseConfig → withBundleAnalyzer → withSentryConfig
const configWithAnalyzer = withBundleAnalyzer(nextConfig);

export default withSentryConfig(configWithAnalyzer, {
	silent: true,
	authToken: process.env.SENTRY_AUTH_TOKEN,
	bundleSizeOptimizations: {
		excludeDebugStatements: true,
	},
});
