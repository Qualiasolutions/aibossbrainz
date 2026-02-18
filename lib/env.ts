import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		AUTH_SECRET: z
			.string()
			.min(1, "AUTH_SECRET is required")
			.optional(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		VERCEL_ENV: z.string().optional(),
		REDIS_URL: z.string().url().optional(),
		BLOB_READ_WRITE_TOKEN: z.string().optional(),
		OPENROUTER_API_KEY: z
			.string()
			.min(1, "OPENROUTER_API_KEY is required for AI chat")
			.optional(),
		SUPABASE_SERVICE_ROLE_KEY: z
			.string()
			.min(
				1,
				"SUPABASE_SERVICE_ROLE_KEY is required for server-side operations",
			)
			.optional(),
		STRIPE_SECRET_KEY: z
			.string()
			.min(1, "STRIPE_SECRET_KEY is required for payments")
			.optional(),
		STRIPE_WEBHOOK_SECRET: z
			.string()
			.min(
				1,
				"STRIPE_WEBHOOK_SECRET is required for Stripe webhook verification",
			)
			.optional(),
		ELEVENLABS_API_KEY: z.string().optional(),
		TAVILY_API_KEY: z.string().optional(),
		SERPER_API_KEY: z.string().optional(),
		// Observability
		SENTRY_DSN: z.string().url().optional(),
		SENTRY_AUTH_TOKEN: z.string().optional(),
		// Cron jobs
		CRON_SECRET: z.string().optional(),
		// Logging
		LOG_LEVEL: z
			.enum(["fatal", "error", "warn", "info", "debug", "trace"])
			.optional(),
		// Mailchimp
		MAILCHIMP_API_KEY: z.string().optional(),
		MAILCHIMP_SERVER_PREFIX: z.string().optional(),
		MAILCHIMP_AUDIENCE_ID: z.string().optional(),
		// Mandrill (transactional email)
		MANDRILL_API_KEY: z.string().optional(),
		MANDRILL_FROM_EMAIL: z.string().email().optional(),
		// Stripe price IDs
		STRIPE_PRICE_MONTHLY: z.string().optional(),
		STRIPE_PRICE_ANNUAL: z.string().optional(),
		STRIPE_PRICE_LIFETIME: z.string().optional(),
		STRIPE_PORTAL_CONFIG_ID: z.string().optional(),
		// ElevenLabs voice IDs
		ELEVENLABS_VOICE_ID_ALEXANDRIA: z.string().optional(),
		ELEVENLABS_VOICE_ID_KIM: z.string().optional(),
		// Fireflies
		FIREFLIES_API_KEY: z.string().optional(),
		// Testing
		PLAYWRIGHT: z.string().optional(),
		CI_PLAYWRIGHT: z.string().optional(),
		PLAYWRIGHT_TEST_BASE_URL: z.string().optional(),
	},
	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		NEXT_PUBLIC_APP_URL: z.string().url().optional(),
		NEXT_PUBLIC_SUPABASE_URL: z
			.string()
			.url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
			.optional(),
		NEXT_PUBLIC_SUPABASE_ANON_KEY: z
			.string()
			.min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required")
			.optional(),
		NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
	},
	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		AUTH_SECRET: process.env.AUTH_SECRET,
		NODE_ENV: process.env.NODE_ENV,
		VERCEL_ENV: process.env.VERCEL_ENV,
		REDIS_URL: process.env.REDIS_URL,
		BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
		OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
		SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
		STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
		STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
		ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
		TAVILY_API_KEY: process.env.TAVILY_API_KEY,
		SERPER_API_KEY: process.env.SERPER_API_KEY,
		SENTRY_DSN: process.env.SENTRY_DSN,
		SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
		CRON_SECRET: process.env.CRON_SECRET,
		LOG_LEVEL: process.env.LOG_LEVEL,
		MAILCHIMP_API_KEY: process.env.MAILCHIMP_API_KEY,
		MAILCHIMP_SERVER_PREFIX: process.env.MAILCHIMP_SERVER_PREFIX,
		MAILCHIMP_AUDIENCE_ID: process.env.MAILCHIMP_AUDIENCE_ID,
		MANDRILL_API_KEY: process.env.MANDRILL_API_KEY,
		MANDRILL_FROM_EMAIL: process.env.MANDRILL_FROM_EMAIL,
		STRIPE_PRICE_MONTHLY: process.env.STRIPE_PRICE_MONTHLY,
		STRIPE_PRICE_ANNUAL: process.env.STRIPE_PRICE_ANNUAL,
		STRIPE_PRICE_LIFETIME: process.env.STRIPE_PRICE_LIFETIME,
		STRIPE_PORTAL_CONFIG_ID: process.env.STRIPE_PORTAL_CONFIG_ID,
		ELEVENLABS_VOICE_ID_ALEXANDRIA: process.env.ELEVENLABS_VOICE_ID_ALEXANDRIA,
		ELEVENLABS_VOICE_ID_KIM: process.env.ELEVENLABS_VOICE_ID_KIM,
		FIREFLIES_API_KEY: process.env.FIREFLIES_API_KEY,
		PLAYWRIGHT: process.env.PLAYWRIGHT,
		CI_PLAYWRIGHT: process.env.CI_PLAYWRIGHT,
		PLAYWRIGHT_TEST_BASE_URL: process.env.PLAYWRIGHT_TEST_BASE_URL,
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
	},
	/**
	 * Run `build` or `dev` with SKIP_ENV_VALIDATION to skip env validation.
	 * This is especially useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined.
	 * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});
