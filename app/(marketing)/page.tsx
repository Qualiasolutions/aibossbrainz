import { getLandingPageContent } from "@/lib/cms/landing-page";
import { LandingPageClient } from "./landing-page-client";

// Revalidate landing page every 5 minutes (ISR)
// CMS content rarely changes, no need for dynamic rendering
export const revalidate = 300;

export default async function LandingPage() {
  const content = await getLandingPageContent();

  return <LandingPageClient content={content} />;
}
