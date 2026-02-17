import "dotenv/config";
import {
	getMailchimpClient,
	MAILCHIMP_AUDIENCE_ID,
	MAILCHIMP_TAGS,
} from "@/lib/mailchimp/client";
import {
	applyPaidTag,
	applyTrialTags,
	getSubscriberHash,
} from "@/lib/mailchimp/tags";

type Plan = "monthly" | "annual" | "lifetime";

function parseArgs(argv: string[]) {
	const args = new Map<string, string>();
	for (let i = 0; i < argv.length; i++) {
		const cur = argv[i];
		if (!cur?.startsWith("--")) continue;
		const key = cur.slice(2);
		const val = argv[i + 1];
		if (!val || val.startsWith("--")) {
			throw new Error(`Missing value for --${key}`);
		}
		args.set(key, val);
		i++;
	}

	const email = args.get("email");
	if (!email) throw new Error("Missing --email");

	const planRaw = args.get("plan");
	const plan =
		planRaw === "monthly" || planRaw === "annual" || planRaw === "lifetime"
			? (planRaw as Plan)
			: null;
	if (!plan)
		throw new Error("Missing/invalid --plan (monthly|annual|lifetime)");

	const modeRaw = args.get("mode") ?? "trial";
	const mode =
		modeRaw === "trial" || modeRaw === "paid" || modeRaw === "both"
			? (modeRaw as "trial" | "paid" | "both")
			: null;
	if (!mode) throw new Error("Invalid --mode (trial|paid|both)");

	const clearRaw = args.get("clear") ?? "true";
	const clear =
		clearRaw === "true" ? true : clearRaw === "false" ? false : null;
	if (clear === null) throw new Error("Invalid --clear (true|false)");

	return { email, plan, mode, clear };
}

async function clearKnownTags(email: string) {
	const client = getMailchimpClient();
	if (!client) throw new Error("Mailchimp client not configured");

	const subscriberHash = getSubscriberHash(email);
	const tagNames = [
		MAILCHIMP_TAGS.TRIAL,
		MAILCHIMP_TAGS.TRIAL_MONTHLY,
		MAILCHIMP_TAGS.TRIAL_ANNUAL,
		MAILCHIMP_TAGS.TRIAL_LIFETIME,
		MAILCHIMP_TAGS.PAID_MONTHLY,
		MAILCHIMP_TAGS.PAID_ANNUAL,
		MAILCHIMP_TAGS.PAID_LIFETIME,
	];

	await client.lists.updateListMemberTags(
		MAILCHIMP_AUDIENCE_ID,
		subscriberHash,
		{
			tags: tagNames.map((name) => ({ name, status: "inactive" as const })),
		},
	);
}

async function getActiveTags(email: string): Promise<string[]> {
	const client = getMailchimpClient();
	if (!client) throw new Error("Mailchimp client not configured");

	const subscriberHash = getSubscriberHash(email);
	const res = await client.lists.getListMemberTags(
		MAILCHIMP_AUDIENCE_ID,
		subscriberHash,
	);

	// mailchimp_marketing typings return a union that includes ErrorResponse.
	const tags = Array.isArray((res as any)?.tags) ? (res as any).tags : [];
	return tags
		.filter((t: any) => t?.status === "active")
		.map((t: any) => t.name);
}

async function main() {
	const { email, plan, mode, clear } = parseArgs(process.argv.slice(2));

	const client = getMailchimpClient();
	if (!client) {
		throw new Error(
			"Mailchimp is not configured (MAILCHIMP_API_KEY / MAILCHIMP_SERVER_PREFIX missing).",
		);
	}

	// Ensure member exists (same logic as applyTagWithRetry)
	const subscriberHash = getSubscriberHash(email);
	await client.lists.setListMember(MAILCHIMP_AUDIENCE_ID, subscriberHash, {
		email_address: email,
		status_if_new: "subscribed",
	});

	if (clear) {
		await clearKnownTags(email);
	}

	if (mode === "trial" || mode === "both") {
		const r = await applyTrialTags(email, plan);
		if (!r.success) throw new Error(r.error || "applyTrialTags failed");
	}

	if (mode === "paid" || mode === "both") {
		const r = await applyPaidTag(email, plan);
		if (!r.success) throw new Error(r.error || "applyPaidTag failed");
	}

	const active = await getActiveTags(email);

	// Minimal, machine-readable output (don’t print secrets).
	process.stdout.write(
		JSON.stringify(
			{
				email,
				plan,
				mode,
				activeTags: active,
				audienceId: MAILCHIMP_AUDIENCE_ID,
			},
			null,
			2,
		) + "\n",
	);
}

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err instanceof Error ? err.message : String(err));
	process.exit(1);
});
