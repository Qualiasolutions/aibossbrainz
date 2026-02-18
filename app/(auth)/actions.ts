"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { PRODUCTION_URL } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { checkAuthRateLimit } from "@/lib/security/rate-limiter";
import { createClient } from "@/lib/supabase/server";

const authFormSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
});

const emailSchema = z.object({
	email: z.string().email(),
});

const passwordResetSchema = z.object({
	password: z.string().min(8),
	confirmPassword: z.string().min(8),
});

export type LoginActionState = {
	status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
};

export type SignupActionState = {
	status:
		| "idle"
		| "in_progress"
		| "success"
		| "failed"
		| "invalid_data"
		| "user_exists"
		| "weak_password";
};

export type ForgotPasswordActionState = {
	status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
};

export type ResetPasswordActionState = {
	status:
		| "idle"
		| "in_progress"
		| "success"
		| "failed"
		| "invalid_data"
		| "mismatch";
	message?: string;
};

export const login = async (
	_: LoginActionState,
	formData: FormData,
): Promise<LoginActionState> => {
	try {
		const validatedData = authFormSchema.parse({
			email: formData.get("email"),
			password: formData.get("password"),
		});

		// Get client IP for rate limiting
		const headersList = await headers();
		const ip =
			headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
			headersList.get("x-real-ip") ||
			headersList.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
			"unknown";

		// Check rate limit (5 attempts per 15 minutes per IP)
		const rateLimit = await checkAuthRateLimit(ip, "login", 5);
		if (!rateLimit.allowed) {
			logger.warn({ ip, action: "login" }, "Login rate limit exceeded");
			return { status: "failed" }; // Don't reveal rate limit to user
		}

		const supabase = await createClient();
		const { error } = await supabase.auth.signInWithPassword({
			email: validatedData.email,
			password: validatedData.password,
		});

		if (error) {
			logger.error({ err: error }, "Login failed");
			return { status: "failed" };
		}

		return { status: "success" };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { status: "invalid_data" };
		}
		return { status: "failed" };
	}
};

export const signup = async (
	_: SignupActionState,
	formData: FormData,
): Promise<SignupActionState> => {
	try {
		const validatedData = authFormSchema.parse({
			email: formData.get("email"),
			password: formData.get("password"),
		});

		// Get client IP for rate limiting
		const headersList = await headers();
		const ip =
			headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
			headersList.get("x-real-ip") ||
			headersList.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
			"unknown";

		// Check rate limit (3 attempts per 15 minutes per IP for signup)
		const rateLimit = await checkAuthRateLimit(ip, "signup", 3);
		if (!rateLimit.allowed) {
			logger.warn({ ip, action: "signup" }, "Signup rate limit exceeded");
			return { status: "failed" }; // Don't reveal rate limit to user
		}

		const plan = formData.get("plan") as string | null;
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_URL;

		// Build redirect URL with plan if present
		const redirectUrl = plan
			? `${baseUrl}/auth/callback?plan=${plan}`
			: `${baseUrl}/auth/callback`;

		const supabase = await createClient();
		const { data, error } = await supabase.auth.signUp({
			email: validatedData.email,
			password: validatedData.password,
			options: {
				emailRedirectTo: redirectUrl,
			},
		});

		if (error) {
			logger.error({ err: error }, "Signup failed");
			if (error.message.includes("already registered")) {
				return { status: "user_exists" };
			}
			if ("code" in error && error.code === "weak_password") {
				return { status: "weak_password" };
			}
			return { status: "failed" };
		}

		// Supabase returns a fake success with empty identities when the email
		// already exists and email confirmations are enabled
		if (data.user && data.user.identities?.length === 0) {
			return { status: "user_exists" };
		}

		return { status: "success" };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { status: "invalid_data" };
		}
		return { status: "failed" };
	}
};

export const requestPasswordReset = async (
	_: ForgotPasswordActionState,
	formData: FormData,
): Promise<ForgotPasswordActionState> => {
	try {
		const validatedData = emailSchema.parse({
			email: formData.get("email"),
		});

		// Get client IP for rate limiting
		const headersList = await headers();
		const ip =
			headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
			headersList.get("x-real-ip") ||
			headersList.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
			"unknown";

		// Check rate limit (3 attempts per 15 minutes per IP for password reset)
		const rateLimit = await checkAuthRateLimit(ip, "reset", 3);
		if (!rateLimit.allowed) {
			logger.warn(
				{ ip, action: "reset" },
				"Password reset rate limit exceeded",
			);
			return { status: "success" }; // Always return success to prevent email enumeration
		}

		const supabase = await createClient();

		// Get the base URL for the redirect
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_URL;

		const { error } = await supabase.auth.resetPasswordForEmail(
			validatedData.email,
			{
				redirectTo: `${baseUrl}/auth/callback?next=/reset-password`,
			},
		);

		if (error) {
			logger.error({ err: error }, "Password reset request failed");
			// Don't reveal if email exists or not for security
			return { status: "success" };
		}

		return { status: "success" };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { status: "invalid_data" };
		}
		return { status: "failed" };
	}
};

export const resetPassword = async (
	_: ResetPasswordActionState,
	formData: FormData,
): Promise<ResetPasswordActionState> => {
	try {
		const validatedData = passwordResetSchema.parse({
			password: formData.get("password"),
			confirmPassword: formData.get("confirmPassword"),
		});

		// Check passwords match
		if (validatedData.password !== validatedData.confirmPassword) {
			return { status: "mismatch" };
		}

		const supabase = await createClient();

		const { error } = await supabase.auth.updateUser({
			password: validatedData.password,
		});

		if (error) {
			logger.error({ err: error }, "Password update failed");
			return { status: "failed", message: error.message };
		}

		return { status: "success" };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { status: "invalid_data" };
		}
		return { status: "failed" };
	}
};
