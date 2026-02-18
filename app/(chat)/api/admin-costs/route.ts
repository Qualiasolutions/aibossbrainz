import { NextResponse } from "next/server";
import { isUserAdmin } from "@/lib/admin/queries";
import { getMonthlyCostSummary } from "@/lib/cost/tracker";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const admin = await isUserAdmin(user.id);
	if (!admin) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const url = new URL(request.url);
	const year =
		Number(url.searchParams.get("year")) || new Date().getFullYear();
	const month =
		Number(url.searchParams.get("month")) || new Date().getMonth() + 1;

	try {
		const summary = await getMonthlyCostSummary(year, month);
		return NextResponse.json(summary);
	} catch (error) {
		logger.error({ err: error }, "Failed to get monthly cost summary");
		return NextResponse.json(
			{ error: "Failed to get cost data" },
			{ status: 500 },
		);
	}
}
