import { NextResponse } from "next/server";
import { isUserAdmin } from "@/lib/admin/queries";
import { logger } from "@/lib/logger";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type {
	LandingPageContent,
	LandingPageSection,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

// GET - Fetch all landing page content (public for landing page rendering)
export async function GET() {
	const supabase = createServiceClient();

	const { data, error } = await supabase
		.from("LandingPageContent")
		.select("*")
		.order("section")
		.order("key");

	if (error) {
		logger.error({ err: error }, "Landing page CMS fetch error");
		return NextResponse.json(
			{ error: "Failed to fetch content" },
			{ status: 500 },
		);
	}

	// Group by section for easier consumption
	const groupedContent: Record<string, Record<string, string>> = {};
	for (const item of data as LandingPageContent[]) {
		if (!groupedContent[item.section]) {
			groupedContent[item.section] = {};
		}
		groupedContent[item.section][item.key] = item.value;
	}

	return NextResponse.json({
		content: groupedContent,
		raw: data,
	});
}

// PATCH - Update landing page content (admin only)
export const PATCH = withCsrf(async (request: Request) => {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const isAdmin = await isUserAdmin(user.id);
	if (!isAdmin) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const body = await request.json();
	const { section, key, value } = body as {
		section: LandingPageSection;
		key: string;
		value: string;
	};

	if (!section || !key || value === undefined) {
		return NextResponse.json(
			{ error: "Missing required fields: section, key, value" },
			{ status: 400 },
		);
	}

	const serviceClient = createServiceClient();

	const { data, error } = await serviceClient
		.from("LandingPageContent")
		.update({
			value,
			updatedBy: user.id,
		})
		.eq("section", section)
		.eq("key", key)
		.select()
		.single();

	if (error) {
		logger.error({ err: error, section, key }, "Landing page CMS update error");
		return NextResponse.json(
			{ error: "Failed to update content" },
			{ status: 500 },
		);
	}

	return NextResponse.json({ success: true, data });
});

// PUT - Bulk update landing page content (admin only)
export const PUT = withCsrf(async (request: Request) => {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const isAdmin = await isUserAdmin(user.id);
	if (!isAdmin) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const body = await request.json();
	const { updates } = body as {
		updates: Array<{ section: LandingPageSection; key: string; value: string }>;
	};

	if (!updates || !Array.isArray(updates)) {
		return NextResponse.json(
			{ error: "Missing required field: updates (array)" },
			{ status: 400 },
		);
	}

	const serviceClient = createServiceClient();
	const results = [];
	const errors = [];

	for (const update of updates) {
		const { section, key, value } = update;
		const { data, error } = await serviceClient
			.from("LandingPageContent")
			.update({
				value,
				updatedBy: user.id,
			})
			.eq("section", section)
			.eq("key", key)
			.select()
			.single();

		if (error) {
			errors.push({ section, key, error: error.message });
		} else {
			results.push(data);
		}
	}

	if (errors.length > 0) {
		return NextResponse.json(
			{ success: false, results, errors },
			{ status: 207 }, // Multi-status
		);
	}

	return NextResponse.json({ success: true, results });
});
