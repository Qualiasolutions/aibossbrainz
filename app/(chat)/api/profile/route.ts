import { z } from "zod";
import { apiRequestLogger } from "@/lib/api-logging";
import { safeParseJson } from "@/lib/api-utils";
import {
	ensureUserExists,
	getUserProfile,
	updateUserProfile,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient } from "@/lib/supabase/server";
import type { BotType } from "@/lib/supabase/types";

// Validation schema for profile updates
const profileUpdateSchema = z.object({
	displayName: z
		.string()
		.max(100, "Display name too long")
		.optional()
		.nullable(),
	companyName: z
		.string()
		.max(200, "Company name too long")
		.optional()
		.nullable(),
	industry: z.string().max(100, "Industry too long").optional().nullable(),
	businessGoals: z
		.string()
		.max(2000, "Business goals too long")
		.optional()
		.nullable(),
	preferredBotType: z
		.enum(["alexandria", "kim", "collaborative"])
		.optional()
		.nullable(),
	productsServices: z
		.string()
		.max(2000, "Products/services description too long")
		.optional()
		.nullable(),
	websiteUrl: z
		.string()
		.url("Invalid URL format")
		.refine(
			(url) => /^https?:\/\//i.test(url),
			"URL must use HTTP or HTTPS protocol",
		)
		.or(z.literal(""))
		.optional()
		.nullable(),
	targetMarket: z
		.string()
		.max(500, "Target market too long")
		.optional()
		.nullable(),
	competitors: z
		.string()
		.max(500, "Competitors too long")
		.optional()
		.nullable(),
	annualRevenue: z
		.string()
		.max(50, "Revenue range too long")
		.optional()
		.nullable(),
	yearsInBusiness: z
		.string()
		.max(50, "Years in business too long")
		.optional()
		.nullable(),
	employeeCount: z
		.string()
		.max(50, "Employee count too long")
		.optional()
		.nullable(),
	completeOnboarding: z.boolean().optional(),
});

// GET - Fetch user profile
export async function GET() {
	const apiLog = apiRequestLogger("/api/profile");
	apiLog.start();

	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user || !user.email) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		// Ensure User record exists (syncs from Supabase Auth)
		await ensureUserExists({ id: user.id, email: user.email });

		const profile = await getUserProfile({ userId: user.id });

		apiLog.success({ userId: user.id });

		// Return default values if profile fields are null
		return Response.json({
			id: user.id,
			email: user.email,
			displayName: profile?.displayName ?? null,
			companyName: profile?.companyName ?? null,
			industry: profile?.industry ?? null,
			businessGoals: profile?.businessGoals ?? null,
			preferredBotType: profile?.preferredBotType ?? null,
			onboardedAt: profile?.onboardedAt ?? null,
			productsServices: profile?.productsServices ?? null,
			websiteUrl: profile?.websiteUrl ?? null,
			targetMarket: profile?.targetMarket ?? null,
			competitors: profile?.competitors ?? null,
			annualRevenue: profile?.annualRevenue ?? null,
			yearsInBusiness: profile?.yearsInBusiness ?? null,
			employeeCount: profile?.employeeCount ?? null,
		});
	} catch (error) {
		apiLog.error(error);
		return new ChatSDKError("bad_request:database").toResponse();
	}
}

// POST - Update user profile
export const POST = withCsrf(async (request: Request) => {
	const apiLog = apiRequestLogger("/api/profile");
	apiLog.start();

	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user || !user.email) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		// Ensure User record exists (syncs from Supabase Auth)
		await ensureUserExists({ id: user.id, email: user.email });

		const body = await safeParseJson(request);

		// Validate input with Zod schema
		const parseResult = profileUpdateSchema.safeParse(body);
		if (!parseResult.success) {
			apiLog.warn("Validation failed", { errors: parseResult.error.flatten() });
			return Response.json(
				{ error: "Invalid input", details: parseResult.error.flatten() },
				{ status: 400 },
			);
		}

		const d = parseResult.data;

		await updateUserProfile({
			userId: user.id,
			displayName: d.displayName ?? undefined,
			companyName: d.companyName ?? undefined,
			industry: d.industry ?? undefined,
			businessGoals: d.businessGoals ?? undefined,
			preferredBotType: (d.preferredBotType ?? undefined) as
				| BotType
				| undefined,
			productsServices: d.productsServices ?? undefined,
			websiteUrl: d.websiteUrl || undefined,
			targetMarket: d.targetMarket ?? undefined,
			competitors: d.competitors ?? undefined,
			annualRevenue: d.annualRevenue ?? undefined,
			yearsInBusiness: d.yearsInBusiness ?? undefined,
			employeeCount: d.employeeCount ?? undefined,
			completeOnboarding: d.completeOnboarding,
		});

		apiLog.success({
			userId: user.id,
			completeOnboarding: d.completeOnboarding,
		});

		return Response.json({ success: true });
	} catch (error) {
		apiLog.error(error);

		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}

		return new ChatSDKError("bad_request:database").toResponse();
	}
});
