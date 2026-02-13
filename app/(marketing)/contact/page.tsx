import type { Metadata } from "next";
import { ContactPageClient } from "./contact-client";

export const metadata: Metadata = {
	title: "Contact | BossBrainz",
	description:
		"Get in touch with the Alecci Media team. Questions about BossBrainz, pricing, or enterprise plans? We respond within 24 hours.",
};

export default function ContactPage() {
	return <ContactPageClient />;
}
