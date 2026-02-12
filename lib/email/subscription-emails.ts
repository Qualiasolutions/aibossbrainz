import "server-only";
import { sendViaMandrill } from "./mandrill";

const APP_URL =
	process.env.NEXT_PUBLIC_APP_URL || "https://bossbrainz.aleccimedia.com";

/** Escape user-supplied strings before interpolating into HTML emails. */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Send welcome email after signup confirmation
 */
export async function sendWelcomeEmail({
	email,
	displayName,
}: {
	email: string;
	displayName?: string | null;
}): Promise<{ success: boolean; error?: unknown }> {
	const name = escapeHtml(displayName || email.split("@")[0]);

	return sendViaMandrill({
		to: email,
		subject: "Welcome to Boss Brainz - Your AI Executive Team Awaits!",
		html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #f43f5e, #dc2626); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Boss Brainz!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Your AI-Powered Executive Team</p>
          </div>
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${name},</p>
            <p style="margin: 0 0 20px; color: #374151;">
              Congratulations on taking the first step toward transforming your sales and marketing strategy!
            </p>
            <p style="margin: 0 0 20px; color: #374151;">
              You now have access to two AI executives ready to help you grow:
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 15px;"><strong style="color: #be185d;">Alexandria (CMO)</strong> - Your brand strategist and marketing expert</p>
              <p style="margin: 0;"><strong style="color: #dc2626;">Kim (CSO)</strong> - Your sales and revenue growth specialist</p>
            </div>
            <p style="margin: 0 0 25px; color: #374151;">
              Start a conversation and see what they can do for your business!
            </p>
            <div style="text-align: center;">
              <a href="${APP_URL}/new" style="display: inline-block; background: linear-gradient(to right, #f43f5e, #dc2626); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Start Your First Chat
              </a>
            </div>
            <hr style="border: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              Need help? Reply to this email or contact us at info@qualiasolutions.net
            </p>
          </div>
        </div>
      `,
	});
}

/**
 * Send subscription cancellation confirmation email
 */
export async function sendCancellationEmail({
	email,
	displayName,
	subscriptionEndDate,
}: {
	email: string;
	displayName?: string | null;
	subscriptionEndDate: string | null;
}): Promise<{ success: boolean; error?: unknown }> {
	const name = escapeHtml(displayName || email.split("@")[0]);
	const endDate = subscriptionEndDate
		? new Date(subscriptionEndDate).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: "the end of your billing period";

	return sendViaMandrill({
		to: email,
		subject: "Your Boss Brainz Subscription Has Been Cancelled",
		html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #6b7280, #374151); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Subscription Cancelled</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${name},</p>
            <p style="margin: 0 0 20px; color: #374151;">
              We've received your cancellation request. Your subscription has been cancelled and you will not be charged again.
            </p>
            <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-weight: 500;">
                You'll continue to have access until: <strong>${endDate}</strong>
              </p>
            </div>
            <p style="margin: 0 0 20px; color: #374151;">
              We're sorry to see you go. If you change your mind, you can always resubscribe from your account settings.
            </p>
            <p style="margin: 0 0 25px; color: #374151;">
              If you have any feedback on how we could improve, we'd love to hear from you - just reply to this email.
            </p>
            <div style="text-align: center;">
              <a href="${APP_URL}/account" style="display: inline-block; background: #374151; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                View Account
              </a>
            </div>
            <hr style="border: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              Questions? Contact us at info@qualiasolutions.net
            </p>
          </div>
        </div>
      `,
	});
}

/**
 * Send trial started email
 */
export async function sendTrialStartedEmail({
	email,
	displayName,
	trialEndDate,
	planName,
}: {
	email: string;
	displayName?: string | null;
	trialEndDate: Date;
	planName: string;
}): Promise<{ success: boolean; error?: unknown }> {
	const name = escapeHtml(displayName || email.split("@")[0]);
	const safePlanName = escapeHtml(planName);
	const endDateFormatted = trialEndDate.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return sendViaMandrill({
		to: email,
		subject: "Your 14-Day Free Trial Has Started!",
		html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Your Trial Has Started!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">14 Days of Full Access</p>
          </div>
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi ${name},</p>
            <p style="margin: 0 0 20px; color: #374151;">
              Great news! Your 14-day free trial of the <strong>${safePlanName}</strong> plan is now active.
            </p>
            <div style="background: #d1fae5; border: 1px solid #10b981; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #065f46; font-weight: 500;">
                Trial ends: <strong>${endDateFormatted}</strong>
              </p>
              <p style="margin: 10px 0 0; color: #065f46; font-size: 14px;">
                You won't be charged until your trial ends.
              </p>
            </div>
            <p style="margin: 0 0 20px; color: #374151;">
              During your trial, you have full access to:
            </p>
            <ul style="margin: 0 0 20px; padding-left: 20px; color: #374151;">
              <li style="margin-bottom: 8px;">Unlimited conversations with Alexandria and Kim</li>
              <li style="margin-bottom: 8px;">Strategy Canvas tools (SWOT, BMC, Journey Maps)</li>
              <li style="margin-bottom: 8px;">Voice calls with your AI executives</li>
              <li style="margin-bottom: 8px;">Document generation and exports</li>
            </ul>
            <div style="text-align: center;">
              <a href="${APP_URL}/new" style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Start Using Boss Brainz
              </a>
            </div>
            <hr style="border: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              Questions? Contact us at info@qualiasolutions.net
            </p>
          </div>
        </div>
      `,
	});
}
