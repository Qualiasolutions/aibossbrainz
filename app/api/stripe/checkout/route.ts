import { NextResponse } from "next/server";
import { z } from "zod";
import { withCsrf } from "@/lib/security/with-csrf";
import { createCheckoutSession } from "@/lib/stripe/actions";
import { STRIPE_PRICES, type StripePlanId } from "@/lib/stripe/config";
import { getValidAppUrl } from "@/lib/stripe/url";
import { createClient } from "@/lib/supabase/server";

const checkoutSchema = z.object({
	planId: z.enum(["monthly", "annual", "lifetime"]),
});

export const POST = withCsrf(async (request: Request) => {
	try {
		// Validate Stripe configuration at runtime
		if (!process.env.STRIPE_SECRET_KEY) {
			console.error("[Stripe Checkout] STRIPE_SECRET_KEY is not configured");
			return NextResponse.json(
				{ error: "Payment system is not configured. Please contact support." },
				{ status: 503 },
			);
		}

		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user?.id || !user?.email) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const { planId } = checkoutSchema.parse(body);

		// Check if price ID is configured for this plan
		const priceId = STRIPE_PRICES[planId as StripePlanId];
		if (!priceId || priceId.includes("placeholder")) {
			console.error(
				`[Stripe Checkout] Price ID not configured for plan: ${planId}. Current value: ${priceId}`,
			);
			return NextResponse.json(
				{ error: "This plan is not yet available. Please contact support." },
				{ status: 503 },
			);
		}

		const appUrl = getValidAppUrl(request);
		console.log(`[Stripe Checkout] Using app URL: ${appUrl}`);

		// Build URLs with properly encoded query parameters
		const successUrl = new URL(`${appUrl}/subscribe`);
		successUrl.searchParams.set("payment", "success");
		successUrl.searchParams.set("redirect", "/new");

		const cancelUrl = new URL(`${appUrl}/pricing`);
		cancelUrl.searchParams.set("payment", "cancelled");

		const checkoutUrl = await createCheckoutSession({
			userId: user.id,
			email: user.email,
			planId: planId as StripePlanId,
			successUrl: successUrl.toString(),
			cancelUrl: cancelUrl.toString(),
		});

		return NextResponse.json({ url: checkoutUrl });
	} catch (error) {
		console.error("[Stripe Checkout] Error:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
		}

		// Check for specific Stripe errors
		if (error instanceof Error) {
			if (error.message.includes("STRIPE_SECRET_KEY")) {
				return NextResponse.json(
					{
						error: "Payment system is not configured. Please contact support.",
					},
					{ status: 503 },
				);
			}
			if (error.message.includes("No such price")) {
				return NextResponse.json(
					{
						error:
							"This pricing plan is not available. Please contact support.",
					},
					{ status: 503 },
				);
			}
		}

		return NextResponse.json(
			{ error: "Failed to create checkout session. Please try again." },
			{ status: 500 },
		);
	}
});
