import "server-only";
import { PRODUCTION_URL } from "@/lib/constants";
import { sendViaMandrill } from "./mandrill";

const SUPPORT_EMAIL = "info@qualiasolutions.net";

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
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_URL;

	return sendViaMandrill({
		to: SUPPORT_EMAIL,
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
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_URL;

	return sendViaMandrill({
		to: userEmail,
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
}
