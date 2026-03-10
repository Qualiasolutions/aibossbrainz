import { headers } from "next/headers";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { sendAdminNotification } from "@/lib/email/admin-notifications";
import { sendWelcomeEmail } from "@/lib/email/subscription-emails";
import { createRequestLogger, logger } from "@/lib/logger";
import { applyPaidTag } from "@/lib/mailchimp/tags";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * ThriveCart IPN webhook payload schema.
 * Docs: https://thrivecart.com/docs/api/
 *
 * ThriveCart sends POST with JSON body containing purchase data.
 * `thrivecart_secret` is a shared secret configured in ThriveCart IPN settings.
 */
const thriveCartEventSchema = z.object({
	event: z.string(),
	thrivecart_secret: z.string(),
	customer: z.object({
		email: z.string().email(),
		name: z.string().optional(),
	}),
	order: z
		.object({
			id: z.union([z.string(), z.number()]).optional(),
			invoice_id: z.string().optional(),
		})
		.optional(),
	base_product: z
		.object({
			id: z.union([z.string(), z.number()]).optional(),
			name: z.string().optional(),
		})
		.optional(),
});

type ThriveCartEvent = z.infer<typeof thriveCartEventSchema>;

const THRIVECART_SECRET = process.env.THRIVECART_SECRET;

/**
 * Map ThriveCart product name/ID to our subscription type.
 * Update this mapping when adding new products in ThriveCart.
 */
function resolveSubscriptionType(
	event: ThriveCartEvent,
): "monthly" | "annual" | "lifetime" {
	const productName = event.base_product?.name?.toLowerCase() ?? "";

	if (productName.includes("lifetime")) return "lifetime";
	if (productName.includes("annual") || productName.includes("yearly"))
		return "annual";

	// Default to monthly for any other product
	return "monthly";
}

export async function POST(request: Request) {
	if (!THRIVECART_SECRET) {
		logger.error("Missing THRIVECART_SECRET");
		return NextResponse.json(
			{ error: "Webhook secret not configured" },
			{ status: 500 },
		);
	}

	// Rate limiting: basic IP check
	const headersList = await headers();
	const clientIp =
		headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		headersList.get("x-real-ip") ||
		"unknown";

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const parsed = thriveCartEventSchema.safeParse(body);
	if (!parsed.success) {
		logger.warn(
			{ errors: parsed.error.flatten(), clientIp },
			"ThriveCart webhook: invalid payload",
		);
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}

	const event = parsed.data;

	// Verify shared secret
	if (event.thrivecart_secret !== THRIVECART_SECRET) {
		logger.warn({ clientIp }, "ThriveCart webhook: invalid secret");
		return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
	}

	const reqLog = createRequestLogger(
		`tc-${event.order?.id ?? Date.now()}`,
	);
	reqLog.info(
		{ eventType: event.event, email: event.customer.email },
		"Processing ThriveCart webhook",
	);

	try {
		switch (event.event) {
			case "order.success": {
				const { email, name } = event.customer;
				const subscriptionType = resolveSubscriptionType(event);
				const supabase = createServiceClient();

				// Check if user already exists
				const { data: existingUser } = await supabase
					.from("User")
					.select("id, email, subscriptionStatus")
					.eq("email", email)
					.is("deletedAt", null)
					.single();

				if (existingUser) {
					// User exists — activate their subscription
					const durationMonths =
						subscriptionType === "monthly"
							? 1
							: subscriptionType === "annual"
								? 12
								: 9999;
					const endDate = new Date();
					endDate.setMonth(endDate.getMonth() + durationMonths);

					const { error: updateError } = await supabase
						.from("User")
						.update({
							subscriptionType,
							subscriptionStatus: "active",
							subscriptionStartDate: new Date().toISOString(),
							subscriptionEndDate: endDate.toISOString(),
						})
						.eq("id", existingUser.id);

					if (updateError) {
						reqLog.error(
							{ err: updateError, userId: existingUser.id },
							"Failed to activate ThriveCart subscription",
						);
					} else {
						reqLog.info(
							{ userId: existingUser.id, subscriptionType },
							"ThriveCart subscription activated for existing user",
						);
					}
				} else {
					reqLog.info(
						{ email },
						"ThriveCart purchase — user not yet registered, sending welcome email",
					);
				}

				// Send welcome email + Mailchimp tag + admin notification (non-blocking)
				after(async () => {
					try {
						await sendWelcomeEmail({
							email,
							displayName: name || null,
						});
					} catch (err) {
						logger.error(
							{ err, email },
							"ThriveCart: failed to send welcome email",
						);
					}

					try {
						if (existingUser) {
							await applyPaidTag(email, subscriptionType);
						}
					} catch (err) {
						logger.error(
							{ err, email },
							"ThriveCart: failed to apply Mailchimp tag",
						);
					}

					try {
						await sendAdminNotification({
							subject: "New ThriveCart Purchase",
							message: [
								`Customer: ${name || "N/A"} <${email}>`,
								`Product: ${event.base_product?.name || "Unknown"}`,
								`Order: ${event.order?.id || "N/A"}`,
								`Subscription: ${subscriptionType}`,
								`User exists: ${existingUser ? "Yes" : "No (email sent)"}`,
							].join("\n"),
							type: "success",
						});
					} catch (err) {
						logger.error(
							{ err },
							"ThriveCart: failed to send admin notification",
						);
					}
				});

				break;
			}

			case "order.refund": {
				const { email } = event.customer;
				const supabase = createServiceClient();

				const { data: user } = await supabase
					.from("User")
					.select("id")
					.eq("email", email)
					.is("deletedAt", null)
					.single();

				if (user) {
					const { error: updateError } = await supabase
						.from("User")
						.update({
							subscriptionStatus: "cancelled",
							stripeSubscriptionId: null,
						})
						.eq("id", user.id);

					if (updateError) {
						reqLog.error(
							{ err: updateError, userId: user.id },
							"Failed to cancel subscription on refund",
						);
					} else {
						reqLog.info(
							{ userId: user.id },
							"Subscription cancelled due to ThriveCart refund",
						);
					}
				}

				after(async () => {
					try {
						await sendAdminNotification({
							subject: "ThriveCart Refund",
							message: [
								`Customer: ${event.customer.name || "N/A"} <${email}>`,
								`Order: ${event.order?.id || "N/A"}`,
								`User found: ${user ? "Yes" : "No"}`,
							].join("\n"),
							type: "alert",
						});
					} catch (err) {
						logger.error(
							{ err },
							"ThriveCart: failed to send refund admin notification",
						);
					}
				});

				break;
			}

			default:
				reqLog.info(
					{ eventType: event.event },
					"Unhandled ThriveCart event",
				);
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		reqLog.error({ err: error }, "ThriveCart webhook handler failed");
		return NextResponse.json(
			{ error: "Webhook handler failed" },
			{ status: 500 },
		);
	}
}
