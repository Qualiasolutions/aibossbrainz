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
	free: env.STRIPE_PRICE_FREE || "price_free_placeholder",
	starter: env.STRIPE_PRICE_STARTER || "price_starter_placeholder",
	growth: env.STRIPE_PRICE_GROWTH || "price_growth_placeholder",
	pro: env.STRIPE_PRICE_PRO || "price_pro_placeholder",
	enterprise: env.STRIPE_PRICE_ENTERPRISE || "price_enterprise_placeholder",
} as const;

export type StripePlanId = keyof typeof STRIPE_PRICES;

export const PLAN_DETAILS: Record<
	StripePlanId,
	{
		name: string;
		price: number;
		period: string;
		subscriptionType: "free" | "starter" | "growth" | "pro" | "enterprise";
		durationMonths: number; // 0 for forever/lifetime, 1 for monthly
	}
> = {
	free: {
		name: "Free",
		price: 0,
		period: "Forever",
		subscriptionType: "free",
		durationMonths: 0,
	},
	starter: {
		name: "Starter",
		price: 89,
		period: "Monthly",
		subscriptionType: "starter",
		durationMonths: 1,
	},
	growth: {
		name: "Growth",
		price: 179,
		period: "Monthly",
		subscriptionType: "growth",
		durationMonths: 1,
	},
	pro: {
		name: "Pro",
		price: 349,
		period: "Monthly",
		subscriptionType: "pro",
		durationMonths: 1,
	},
	enterprise: {
		name: "Enterprise",
		price: 799,
		period: "Monthly",
		subscriptionType: "enterprise",
		durationMonths: 1,
	},
};
