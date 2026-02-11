import { Resend } from "resend";

const SUPPORT_EMAIL = "info@qualiasolutions.net";

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

export async function sendTicketNotificationEmail({
  ticketId,
  subject,
  message,
  userEmail,
}: {
  ticketId: string;
  subject: string;
  message: string;
  userEmail: string;
}): Promise<{ success: boolean; error?: unknown }> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "API key not configured" };
  }

  try {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://bossbrainz.aleccimedia.com";

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [SUPPORT_EMAIL],
      subject: `[New Support Ticket] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #f43f5e, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">New Support Ticket</h2>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0 0 10px;"><strong>Ticket ID:</strong> ${ticketId}</p>
            <p style="margin: 0 0 10px;"><strong>From:</strong> ${userEmail}</p>
            <p style="margin: 0 0 10px;"><strong>Subject:</strong> ${subject}</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
            <h3 style="margin: 0 0 10px; color: #374151;">Message:</h3>
            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
              ${message.replace(/\n/g, "<br />")}
            </div>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 14px;">
              <a href="${appUrl}/admin/support-tickets/${ticketId}" style="color: #dc2626; text-decoration: none;">
                View in Admin Panel &rarr;
              </a>
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Email] Failed to send ticket notification:", error);
      return { success: false, error };
    }

    console.log("[Email] Ticket notification sent:", data?.id);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending ticket notification:", error);
    return { success: false, error };
  }
}

export async function sendTicketReplyNotification({
  ticketId,
  subject,
  replyContent,
  userEmail,
}: {
  ticketId: string;
  subject: string;
  replyContent: string;
  userEmail: string;
}): Promise<{ success: boolean; error?: unknown }> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "API key not configured" };
  }

  try {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://bossbrainz.aleccimedia.com";

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [userEmail],
      subject: `Re: ${subject} - Support Ticket Update`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #f43f5e, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">Support Ticket Update</h2>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0 0 20px; color: #374151;">Our team has responded to your support request.</p>
            <h3 style="margin: 0 0 10px; color: #374151;">Response:</h3>
            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
              ${replyContent.replace(/\n/g, "<br />")}
            </div>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
            <p>
              <a href="${appUrl}" style="display: inline-block; background: linear-gradient(to right, #f43f5e, #dc2626); color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                View Full Conversation
              </a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
              Ticket ID: ${ticketId}
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Email] Failed to send reply notification:", error);
      return { success: false, error };
    }

    console.log("[Email] Reply notification sent:", data?.id);
    return { success: true };
  } catch (error) {
    console.error("[Email] Error sending reply notification:", error);
    return { success: false, error };
  }
}
