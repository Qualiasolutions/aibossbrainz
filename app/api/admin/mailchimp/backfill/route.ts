import { NextResponse } from "next/server";
import { isUserAdmin } from "@/lib/admin/queries";
import { applyTrialTags } from "@/lib/mailchimp/tags";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/mailchimp/backfill
 *
 * Admin-only endpoint to backfill Mailchimp trial tags for existing verified trial users.
 * This is a one-time operation after deploying the Mailchimp integration.
 *
 * Safe to run multiple times - Mailchimp tags are idempotent.
 */
export const POST = withCsrf(async () => {
	// Check authenticated user
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	// Check admin status
	const isAdmin = await isUserAdmin(user.id);
	if (!isAdmin) {
		return NextResponse.json(
			{ error: "Forbidden - Admin only" },
			{ status: 403 },
		);
	}

	// Use service client to bypass RLS for querying all users
	const serviceClient = createServiceClient();

	// Query all trial users with verified emails
	const { data: trialUsers, error: queryError } = await serviceClient
		.from("User")
		.select("id, email, subscriptionType")
		.eq("subscriptionStatus", "trialing")
		.not("email", "is", null)
		.is("deletedAt", null);

	if (queryError) {
		console.error(
			"[Mailchimp Backfill] Failed to query trial users:",
			queryError,
		);
		return NextResponse.json(
			{ error: "Failed to query users" },
			{ status: 500 },
		);
	}

	if (!trialUsers || trialUsers.length === 0) {
		return NextResponse.json({
			total: 0,
			success: 0,
			failed: 0,
			message: "No trial users to backfill",
		});
	}

	// Process each user with small delay to respect Mailchimp rate limits
	const results = {
		total: trialUsers.length,
		success: 0,
		failed: 0,
		errors: [] as { email: string; error: string }[],
	};

	for (const trialUser of trialUsers) {
		if (!trialUser.email) continue;

		const subscriptionType =
			trialUser.subscriptionType === "monthly" ||
			trialUser.subscriptionType === "annual" ||
			trialUser.subscriptionType === "lifetime"
				? trialUser.subscriptionType
				: null;

		const result = await applyTrialTags(trialUser.email, subscriptionType);

		if (result.success) {
			results.success++;
		} else {
			results.failed++;
			results.errors.push({
				email: trialUser.email,
				error: result.error || "Unknown error",
			});
		}

		// Each applyTrialTags makes 2-4 API calls (upsert + tag per operation).
		// Mailchimp limit is 10 req/sec, so 400ms keeps us safely under.
		await new Promise((resolve) => setTimeout(resolve, 400));
	}

	console.log(
		`[Mailchimp Backfill] Completed: ${results.success}/${results.total} users tagged`,
	);

	return NextResponse.json(results);
});
