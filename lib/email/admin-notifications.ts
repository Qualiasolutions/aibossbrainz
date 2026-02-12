import "server-only";
import { sendViaMandrill } from "./mandrill";

const ADMIN_EMAIL = "info@qualiasolutions.net";

/**
 * Send a notification email to the admin team via Mandrill.
 * Used for alerting on system issues or confirming successful operations.
 *
 * @param subject - Email subject (will be prefixed with "[Alert]" or "[Success]")
 * @param message - Plain text message body (newlines converted to <br />)
 * @param type - "alert" (red) or "success" (green)
 */
export async function sendAdminNotification({
	subject,
	message,
	type = "alert",
}: {
	subject: string;
	message: string;
	type?: "alert" | "success";
}): Promise<void> {
	const isSuccess = type === "success";
	const prefix = isSuccess ? "[Success]" : "[Alert]";
	const gradient = isSuccess
		? "linear-gradient(to right, #10b981, #059669)"
		: "linear-gradient(to right, #dc2626, #b91c1c)";
	const heading = isSuccess ? "Success" : "System Alert";
	const timestamp = new Date().toISOString();

	const result = await sendViaMandrill({
		to: ADMIN_EMAIL,
		subject: `${prefix} ${subject}`,
		html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${gradient}; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">${heading}</h2>
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

	if (!result.success) {
		console.error(
			`[Email] Failed to send admin notification: ${result.error}`,
		);
	}
}
