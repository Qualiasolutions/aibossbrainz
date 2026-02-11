import { getLandingPageContent } from "@/lib/cms/landing-page";
import { AboutPageClient } from "./about-client";

export const revalidate = 300;

export default async function AboutPage() {
  const content = await getLandingPageContent();

  return <AboutPageClient content={content} />;
}
