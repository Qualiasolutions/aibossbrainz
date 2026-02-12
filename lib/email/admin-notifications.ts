import { Resend } from "resend";

const ADMIN_EMAIL = "info@qualiasolutions.net";

// Lazy-initialize Resend client to avoid errors when API key is not set
function getResendClient(): Resend | null {
	if (!process.env.RESEND_API_KEY) {
		return null;
	}
	return new Resend(process.env.RESEND_API_KEY);
}

// Use the app domain or fallback to a default
const FROM_EMAIL =
	process.env.RESEND_FROM_EMAIL || "Alecci Media AI <noreply@resend.dev>";

/**
 * Send a notification email to the admin team.
 * Used for alerting on system issues (e.g., Mailchimp failures).
 *
 * Silently logs a warning if RESEND_API_KEY is not configured (doesn't throw).
 *
 * @param subject - Email subject (will be prefixed with "[Alert]")
 * @param message - Plain text message body (newlines converted to <br />)
 */
export async function sendAdminNotification({
	subject,
	message,
}: {
	subject: string;
	message: string;
}): Promise<void> {
	const resend = getResendClient();
	if (!resend) {
		console.warn(
			"[Email] RESEND_API_KEY not configured, skipping admin notification",
		);
		return;
	}

	try {
		const timestamp = new Date().toISOString();

		const { data, error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: [ADMIN_EMAIL],
			subject: `[Alert] ${subject}`,
			html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #dc2626, #b91c1c); padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">System Alert</h2>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h3 style="margin: 0 0 16px; color: #374151;">${subject}</h3>
            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; font-family: monospace; white-space: pre-wrap;">
              ${message.replace(/\n/g, "<br />")}
            </div>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Timestamp: ${timestamp}
            </p>
          </div>
        </div>
      `,
		});

		if (error) {
			console.error("[Email] Failed to send admin notification:", error);
			return;
		}

		console.log("[Email] Admin notification sent:", data?.id);
	} catch (error) {
		console.error("[Email] Error sending admin notification:", error);
		// Don't throw - admin notifications should never break the main flow
	}
}
