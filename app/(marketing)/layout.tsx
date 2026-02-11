import { getLandingPageContent } from "@/lib/cms/landing-page";
import { createClient } from "@/lib/supabase/server";
import { MarketingLayoutClient } from "./marketing-layout-client";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = await getLandingPageContent();

  // Check if user is logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <MarketingLayoutClient content={content} isLoggedIn={!!user}>
      {children}
    </MarketingLayoutClient>
  );
}
