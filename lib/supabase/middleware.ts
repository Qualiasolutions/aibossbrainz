import * as Sentry from "@sentry/nextjs";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Generate a unique request ID for tracing
 * Uses Vercel's request ID if available, otherwise generates a UUID
 */
export function generateRequestId(request: NextRequest): string {
	// Try Vercel-provided request ID first
	const vercelId = request.headers.get("x-vercel-id");
	if (vercelId) {
		return vercelId;
	}

	// Generate a simple unique ID (crypto.randomUUID is available in Edge runtime)
	return crypto.randomUUID();
}

/**
 * Create a request-scoped logger with request ID
 * This can be imported in API routes to use the request ID from headers
 */
export function getRequestLogger(request: NextRequest) {
	const requestId =
		request.headers.get("x-request-id") || generateRequestId(request);
	return logger.child({ requestId });
}

export async function updateSession(request: NextRequest) {
	// Generate request ID for tracing
	const requestId = generateRequestId(request);

	let supabaseResponse = NextResponse.next({
		request,
	});

	// Add request ID to response headers
	supabaseResponse.headers.set("x-request-id", requestId);

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					for (const { name, value } of cookiesToSet) {
						request.cookies.set(name, value);
					}
					supabaseResponse = NextResponse.next({
						request,
					});
					for (const { name, value, options } of cookiesToSet) {
						supabaseResponse.cookies.set(name, value, options);
					}
				},
			},
		},
	);

	// If a Supabase auth code lands on the wrong route (e.g. /?code=...),
	// redirect it to /auth/callback so the code exchange can happen properly
	const authCode = request.nextUrl.searchParams.get("code");
	if (authCode && request.nextUrl.pathname === "/") {
		const url = request.nextUrl.clone();
		url.pathname = "/auth/callback";
		// Preserve the code and any other params
		return NextResponse.redirect(url);
	}

	// Skip auth check entirely for marketing/static pages that never need auth.
	// This avoids the supabase.auth.getUser() round-trip on public pages.
	const marketingPaths = [
		"/pricing",
		"/contact",
		"/terms",
		"/privacy",
		"/about",
	];
	const reqPathname = request.nextUrl.pathname;
	if (
		marketingPaths.some(
			(p) => reqPathname === p || reqPathname.startsWith(`${p}/`),
		)
	) {
		return supabaseResponse;
	}

	// IMPORTANT: Avoid writing any logic between createServerClient and
	// supabase.auth.getUser(). A simple mistake could make it very hard to debug
	// issues with users being randomly logged out.

	const {
		data: { user },
	} = await supabase.auth.getUser();

	// Set Sentry user context for error correlation
	if (user) {
		Sentry.setUser({ id: user.id, email: user.email ?? undefined });
	} else {
		Sentry.setUser(null);
	}

	// Define public routes that don't require authentication
	const publicRoutes = [
		"/login",
		"/signup",
		"/register",
		"/forgot-password",
		"/reset-password",
		"/auth/callback",
		"/api/auth",
		"/pricing",
		"/contact",
		"/terms",
		"/privacy",
		"/subscribe",
	];
	const isPublicRoute =
		request.nextUrl.pathname === "/" ||
		publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

	// Allow public routes and API routes
	if (isPublicRoute || request.nextUrl.pathname.startsWith("/api/")) {
		return supabaseResponse;
	}

	// Redirect to login if not authenticated
	if (!user) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		const redirectResponse = NextResponse.redirect(url);
		redirectResponse.headers.set("x-request-id", requestId);
		return redirectResponse;
	}

	// Routes that require an active subscription (not pending)
	const subscriptionRequiredRoutes = [
		"/new",
		"/chat",
		"/analytics",
		"/history",
		"/reports",
		"/saved",
		"/swot",
		"/strategy-canvas",
		"/actionable",
		"/clarifications",
		"/call",
		"/executives",
	];

	const pathname = request.nextUrl.pathname;
	const requiresSubscription = subscriptionRequiredRoutes.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	);

	// Check subscription for protected routes
	// Reuse the user object from the auth check above to avoid a second DB query
	if (requiresSubscription) {
		// Query user's subscription status (single query, reuses connection)
		const { data: userData } = await supabase
			.from("User")
			.select(
				"subscriptionStatus, subscriptionType, subscriptionEndDate, isAdmin, stripeCustomerId",
			)
			.eq("id", user.id)
			.maybeSingle();

		// Determine if subscription is active
		let isActive = false;
		let reason = "signup";

		if (userData) {
			// Admins always have access
			if (userData.isAdmin) {
				isActive = true;
			} else if (
				userData.subscriptionStatus === "active" ||
				userData.subscriptionStatus === "trialing"
			) {
				// Check if subscription has expired
				if (userData.subscriptionEndDate) {
					const endDate = new Date(userData.subscriptionEndDate);
					const now = new Date();
					isActive = endDate > now;
					if (!isActive) {
						reason = "expired";
					}
				} else {
					// No end date = lifetime or active subscription
					isActive = true;
				}
			} else if (
				userData.subscriptionStatus === "pending" &&
				userData.stripeCustomerId
			) {
				// User has a Stripe customer but DB still says "pending" — webhook
				// likely failed. Redirect to subscribe with payment=success so the
				// subscribe page can sync from Stripe via the /api/subscription endpoint.
				const url = request.nextUrl.clone();
				url.pathname = "/subscribe";
				url.searchParams.set("payment", "success");
				url.searchParams.set("redirect", pathname);
				const redirectResponse = NextResponse.redirect(url);
				redirectResponse.headers.set("x-request-id", requestId);
				return redirectResponse;
			} else if (userData.subscriptionStatus === "pending") {
				reason = "signup";
			} else if (
				userData.subscriptionStatus === "expired" ||
				userData.subscriptionStatus === "cancelled"
			) {
				reason = "expired";
			}
		}

		// Redirect to subscribe page if not active
		if (!isActive) {
			const url = request.nextUrl.clone();
			url.pathname = "/subscribe";
			url.searchParams.set("reason", reason);
			// Preserve the intended destination for after payment
			url.searchParams.set("redirect", pathname);
			const redirectResponse = NextResponse.redirect(url);
			redirectResponse.headers.set("x-request-id", requestId);
			return redirectResponse;
		}
	}

	// IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
	// creating a new response object with NextResponse.next() make sure to:
	// 1. Pass the request in it, like so:
	//    const myNewResponse = NextResponse.next({ request })
	// 2. Copy over the cookies, like so:
	//    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
	// 3. Change the myNewResponse object to fit your needs, but avoid changing
	//    the cookies!
	// 4. Finally:
	//    return myNewResponse
	// If this is not done, you may be causing the browser and server to go out
	// of sync and terminate the user's session prematurely!

	return supabaseResponse;
}
