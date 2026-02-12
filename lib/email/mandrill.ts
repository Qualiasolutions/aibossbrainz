import "server-only";

const MANDRILL_API_URL = "https://mandrillapp.com/api/1.0/messages/send.json";

type MandrillResult = { success: boolean; id?: string; error?: string };

/**
 * Send an email via Mandrill (Mailchimp Transactional).
 * Returns success/failure without throwing.
 */
export async function sendViaMandrill({
	to,
	subject,
	html,
	fromEmail,
	fromName = "AI Boss Brainz",
}: {
	to: string | string[];
	subject: string;
	html: string;
	fromEmail?: string;
	fromName?: string;
}): Promise<MandrillResult> {
	const apiKey = process.env.MANDRILL_API_KEY;
	if (!apiKey) {
		console.warn("[Mandrill] MANDRILL_API_KEY not configured, skipping email");
		return { success: false, error: "API key not configured" };
	}

	const recipients = Array.isArray(to) ? to : [to];
	const from =
		fromEmail || process.env.MANDRILL_FROM_EMAIL || "noreply@aleccimedia.com";

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10_000);

		const response = await fetch(MANDRILL_API_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			signal: controller.signal,
			body: JSON.stringify({
				key: apiKey,
				message: {
					from_email: from,
					from_name: fromName,
					to: recipients.map((email) => ({ email, type: "to" })),
					subject,
					html,
				},
			}),
		});

		clearTimeout(timeout);

		if (!response.ok) {
			const text = await response.text();
			console.error(`[Mandrill] API error ${response.status}: ${text}`);
			return { success: false, error: `API error ${response.status}` };
		}

		const data = (await response.json()) as Array<{
			_id: string;
			status: string;
			reject_reason: string | null;
		}>;
		const first = data[0];

		if (first?.status === "rejected") {
			console.error(`[Mandrill] Email rejected: ${first.reject_reason}`);
			return { success: false, error: `Rejected: ${first.reject_reason}` };
		}

		console.log(`[Mandrill] Email sent: ${first?._id} (${first?.status})`);
		return { success: true, id: first?._id };
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		console.error(`[Mandrill] Error: ${msg}`);
		return { success: false, error: msg };
	}
}
