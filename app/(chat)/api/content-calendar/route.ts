import {
	getContentCalendarByDate,
	getContentCalendarByMonth,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		const { searchParams } = new URL(request.url);
		const date = searchParams.get("date");
		const year = searchParams.get("year");
		const month = searchParams.get("month");

		// Fetch by specific date
		if (date) {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
				return new ChatSDKError("bad_request:api").toResponse();
			}
			const posts = await getContentCalendarByDate({
				userId: user.id,
				date,
			});
			return Response.json(posts);
		}

		// Fetch by month
		if (year && month) {
			const y = Number.parseInt(year, 10);
			const m = Number.parseInt(month, 10);
			if (
				Number.isNaN(y) ||
				Number.isNaN(m) ||
				m < 1 ||
				m > 12 ||
				y < 2000 ||
				y > 2100
			) {
				return new ChatSDKError("bad_request:api").toResponse();
			}
			const posts = await getContentCalendarByMonth({
				userId: user.id,
				year: y,
				month: m,
			});
			return Response.json(posts);
		}

		return new ChatSDKError("bad_request:api").toResponse();
	} catch (error) {
		logger.error({ err: error }, "Content calendar API GET error");
		return new ChatSDKError("bad_request:database").toResponse();
	}
}
