import { getUserFullProfile } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import SubscriptionClient, {
	type SubscriptionData,
} from "./subscription-client";

function getInitialSubscriptionData(): SubscriptionData {
	return {
		subscriptionType: null,
		subscriptionStatus: null,
		subscriptionStartDate: null,
		subscriptionEndDate: null,
		hasStripeSubscription: false,
	};
}

export default async function SubscriptionPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return (
			<SubscriptionClient initialSubscription={getInitialSubscriptionData()} />
		);
	}

	const profile = await getUserFullProfile({ userId: user.id });
	const initialSubscription: SubscriptionData = {
		subscriptionType: profile?.subscriptionType ?? null,
		subscriptionStatus: profile?.subscriptionStatus ?? null,
		subscriptionStartDate: profile?.subscriptionStartDate ?? null,
		subscriptionEndDate: profile?.subscriptionEndDate ?? null,
		hasStripeSubscription:
			profile?.subscriptionStatus === "active" ||
			profile?.subscriptionStatus === "trialing" ||
			Boolean(profile?.stripeCustomerId),
	};

	return <SubscriptionClient initialSubscription={initialSubscription} />;
}
