import { redirect } from "next/navigation";
import { ensureUserExists, getUserProfile } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { AccountClient } from "./account-client";

export default async function AccountPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user || !user.email) {
		redirect("/login");
	}

	await ensureUserExists({ id: user.id, email: user.email });
	const profile = await getUserProfile({ userId: user.id });

	const initialProfile = {
		id: user.id,
		email: user.email,
		displayName: profile?.displayName ?? null,
		companyName: profile?.companyName ?? null,
		industry: profile?.industry ?? null,
		businessGoals: profile?.businessGoals ?? null,
		preferredBotType: profile?.preferredBotType ?? null,
		onboardedAt: profile?.onboardedAt ?? null,
		productsServices: profile?.productsServices ?? null,
		websiteUrl: profile?.websiteUrl ?? null,
		targetMarket: profile?.targetMarket ?? null,
		competitors: profile?.competitors ?? null,
		annualRevenue: profile?.annualRevenue ?? null,
		yearsInBusiness: profile?.yearsInBusiness ?? null,
		employeeCount: profile?.employeeCount ?? null,
	};

	return (
		<div className="mx-auto max-w-4xl px-4 py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-stone-900">Account Settings</h1>
				<p className="mt-1 text-stone-500">
					Manage your profile and business information
				</p>
			</div>

			<AccountClient initialProfile={initialProfile} />
		</div>
	);
}
