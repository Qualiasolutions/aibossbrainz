import { NextResponse } from "next/server";
import { withCsrf } from "@/lib/security/with-csrf";
import { createPortalSession } from "@/lib/stripe/actions";
import { getValidAppUrl } from "@/lib/stripe/url";
import { createClient } from "@/lib/supabase/server";

export const POST = withCsrf(async (request: Request) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appUrl = getValidAppUrl(request);

    const portalUrl = await createPortalSession({
      userId: user.id,
      returnUrl: `${appUrl}/new`,
    });

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error("[Stripe Portal] Error:", error);

    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 },
    );
  }
});
