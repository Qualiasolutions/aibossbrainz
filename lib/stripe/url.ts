import "server-only";

import { PRODUCTION_DOMAIN, PRODUCTION_URL } from "@/lib/constants";
import { logger } from "@/lib/logger";

const ALLOWED_HOSTS = [PRODUCTION_DOMAIN, "localhost", "127.0.0.1"];

/**
 * Get a validated app URL for Stripe redirects.
 * Uses NEXT_PUBLIC_APP_URL env var, falls back to origin header
 * (only if the host is in the allowlist), then production URL.
 */
export function getValidAppUrl(request?: Request): string {
	// 1. Try env var first
	const envUrl = (process.env.NEXT_PUBLIC_APP_URL || "")
		.trim()
		.replace(/\/+$/, "");
	if (envUrl) {
		try {
			const parsed = new URL(envUrl);
			return `${parsed.protocol}//${parsed.host}`;
		} catch {
			logger.error({ envUrl }, "Invalid NEXT_PUBLIC_APP_URL, using production fallback");
			return PRODUCTION_URL;
		}
	}

	// 2. Try origin header (only for allowed hosts)
	if (request) {
		const origin = request.headers.get("origin");
		if (origin) {
			try {
				const parsed = new URL(origin);
				if (ALLOWED_HOSTS.includes(parsed.hostname)) {
					return `${parsed.protocol}//${parsed.host}`;
				}
			} catch {
				// Invalid origin, fall through
			}
		}
	}

	// 3. Production fallback
	return PRODUCTION_URL;
}
