import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
	if (!stripeInstance) {
		if (!process.env.STRIPE_SECRET_KEY) {
			throw new Error("STRIPE_SECRET_KEY is not set");
		}
		// Configure Stripe with explicit timeouts (30s for API requests, 80s for webhook operations)
		stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
			timeout: 30000, // 30 seconds for API requests
			maxNetworkRetries: 2, // Retry failed requests up to 2 times
		});
	}
	return stripeInstance;
}

// For backwards compatibility - lazy getter
export const stripe = {
	get customers() {
		return getStripe().customers;
	},
	get checkout() {
		return getStripe().checkout;
	},
	get billingPortal() {
		return getStripe().billingPortal;
	},
	get subscriptions() {
		return getStripe().subscriptions;
	},
	get webhooks() {
		return getStripe().webhooks;
	},
};

// Price IDs from Stripe Dashboard
// These should be created in Stripe Dashboard first
export const STRIPE_PRICES = {
	// Monthly plan: $297/month
	monthly: env.STRIPE_PRICE_MONTHLY || "price_monthly_placeholder",
	// Annual plan: $2,500 one-time for 12 months
	annual: env.STRIPE_PRICE_ANNUAL || "price_annual_placeholder",
	// Lifetime plan: $3,500 one-time forever
	lifetime: env.STRIPE_PRICE_LIFETIME || "price_lifetime_placeholder",
} as const;

export type StripePlanId = keyof typeof STRIPE_PRICES;

export const PLAN_DETAILS: Record<
	StripePlanId,
	{
		name: string;
		price: number;
		period: string;
		subscriptionType: "monthly" | "annual" | "lifetime";
		durationMonths: number;
	}
> = {
	monthly: {
		name: "Most Flexible",
		price: 297,
		period: "Monthly",
		subscriptionType: "monthly",
		durationMonths: 1,
	},
	annual: {
		name: "Best Value",
		price: 2500,
		period: "Annual",
		subscriptionType: "annual",
		durationMonths: 12,
	},
	lifetime: {
		name: "Exclusive Lifetime",
		price: 3500,
		period: "One-Time",
		subscriptionType: "lifetime",
		durationMonths: 9999, // Effectively forever
	},
};
