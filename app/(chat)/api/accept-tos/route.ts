import { createAuditLog, ensureUserExists } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient } from "@/lib/supabase/server";

export const POST = withCsrf(async (request) => {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user || !user.email) {
		return new ChatSDKError("unauthorized:auth").toResponse();
	}

	// Ensure User record exists (syncs from Supabase Auth)
	await ensureUserExists({ id: user.id, email: user.email });

	const acceptedAt = new Date().toISOString();

	// Update user's TOS acceptance timestamp
	const { error } = await supabase
		.from("User")
		.update({ tosAcceptedAt: acceptedAt })
		.eq("id", user.id);

	if (error) {
		logger.error({ err: error }, "Failed to update TOS acceptance");
		return new ChatSDKError(
			"bad_request:database",
			"Failed to accept Terms of Service",
		).toResponse();
	}

	// Audit log for compliance tracking
	await createAuditLog({
		userId: user.id,
		action: "tos_accepted",
		resource: "User",
		resourceId: user.id,
		details: { email: user.email, acceptedAt },
		ipAddress: request.headers.get("x-forwarded-for"),
		userAgent: request.headers.get("user-agent"),
	});

	return Response.json({ success: true, acceptedAt });
});

export async function GET() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return new ChatSDKError("unauthorized:auth").toResponse();
	}

	// Get user's TOS acceptance status
	const { data, error } = await supabase
		.from("User")
		.select("tosAcceptedAt")
		.eq("id", user.id)
		.single();

	// If user doesn't exist in User table yet (new user), return not accepted
	if (error && error.code === "PGRST116") {
		return Response.json({
			accepted: false,
			acceptedAt: null,
		});
	}

	if (error) {
		logger.error({ err: error }, "Failed to get TOS acceptance status");
		return new ChatSDKError(
			"bad_request:database",
			"Failed to get Terms of Service status",
		).toResponse();
	}

	return Response.json({
		accepted: !!data?.tosAcceptedAt,
		acceptedAt: data?.tosAcceptedAt || null,
	});
}
