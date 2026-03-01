import { AnalyticsContent } from "@/components/admin/analytics-content";
import {
	getAdminStats,
	getAllUsers,
	getSubscriptionStats,
	isUserAdmin,
} from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("Unauthorized");
	const admin = await isUserAdmin(user.id);
	if (!admin) throw new Error("Forbidden");
	return user;
}

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
	// Defense-in-depth: verify admin access before loading sensitive data
	await requireAdmin();

	const [stats, users, subStats] = await Promise.all([
		getAdminStats(),
		getAllUsers(),
		getSubscriptionStats({ excludeTeam: true }),
	]);

	return <AnalyticsContent stats={stats} users={users} subStats={subStats} />;
}
