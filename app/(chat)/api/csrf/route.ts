import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
	generateCsrfToken,
	getCsrfToken,
	validateCsrfToken,
} from "@/lib/security/csrf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Required for node:crypto

const CSRF_COOKIE_NAME = "__csrf";

// DESIGN(DOC-02): This endpoint is intentionally unauthenticated. CSRF tokens must be
// available before auth (subscribe page, login forms). Security relies on the double-submit
// pattern: HMAC-signed token must match in both httpOnly cookie and request header.

/**
 * GET /api/csrf - Get or generate CSRF token
 * Returns existing token if valid, otherwise generates new one
 */
export async function GET() {
	try {
		// Try to get existing token from cookie, but handle cases where cookies aren't available
		let existingToken: string | undefined;
		try {
			existingToken = await getCsrfToken();
		} catch {
			// cookies() may fail in certain contexts (e.g., during prefetch)
			existingToken = undefined;
		}

		if (existingToken && validateCsrfToken(existingToken)) {
			return NextResponse.json({ token: existingToken });
		}

		// Generate new token and set cookie via response headers
		const newToken = generateCsrfToken();
		const response = NextResponse.json({ token: newToken });

		response.cookies.set(CSRF_COOKIE_NAME, newToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			path: "/",
			maxAge: 60 * 60 * 24, // 24 hours
		});

		return response;
	} catch (error) {
		// Log but don't expose internal errors - generate a new token as fallback
		logger.error({ err: error }, "CSRF token error");

		// Fallback: generate token without checking existing cookie
		try {
			const fallbackToken = generateCsrfToken();
			const response = NextResponse.json({ token: fallbackToken });
			response.cookies.set(CSRF_COOKIE_NAME, fallbackToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "strict",
				path: "/",
				maxAge: 60 * 60 * 24,
			});
			return response;
		} catch (fallbackError) {
			logger.error({ err: fallbackError }, "CSRF fallback failed");
			return NextResponse.json(
				{ error: "Failed to generate CSRF token" },
				{ status: 500 },
			);
		}
	}
}
