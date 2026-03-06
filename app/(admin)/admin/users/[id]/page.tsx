import { ArrowLeft } from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubscriptionManager } from "@/components/admin/subscription-manager";
import { UserTypeSelector } from "@/components/admin/user-type-selector";
import { Button } from "@/components/ui/button";
import {
	cancelSubscriptionByAdmin,
	getUserById,
	isUserAdmin,
	updateUserByAdmin,
	updateUserSubscription,
} from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionType } from "@/lib/supabase/types";

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

function formatDate(dateString: string | null | undefined): string {
	if (!dateString) return "N/A";
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

async function updateUserType(userId: string, userType: string) {
	"use server";
	await requireAdmin();
	await updateUserByAdmin(userId, {
		userType: userType === "none" ? null : userType,
	});
	revalidatePath(`/admin/users/${userId}`);
}

async function changeSubscription(
	userId: string,
	subscriptionType: SubscriptionType,
) {
	"use server";
	await requireAdmin();
	await updateUserSubscription(userId, subscriptionType);
	revalidatePath(`/admin/users/${userId}`);
}

async function cancelSubscription(userId: string) {
	"use server";
	await requireAdmin();
	await cancelSubscriptionByAdmin(userId);
	revalidatePath(`/admin/users/${userId}`);
}

export default async function UserDetailsPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await requireAdmin();
	const { id } = await params;
	const user = await getUserById(id);

	if (!user) {
		notFound();
	}

	return (
		<div className="p-4 md:p-6 lg:p-8">
			{/* Back Button */}
			<Link href="/admin/users">
				<Button variant="ghost" className="mb-4 md:mb-6 gap-2">
					<ArrowLeft className="h-4 w-4" />
					Back to Users
				</Button>
			</Link>

			{/* Header */}
			<div className="mb-6 lg:mb-8">
				<h1 className="text-2xl md:text-3xl font-bold text-neutral-900">
					{user.displayName || "No Name"}
				</h1>
				<p className="text-neutral-500 mt-1 truncate">{user.email}</p>
			</div>

			{/* User Details Grid */}
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{/* Profile Info */}
				<div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
					<h2 className="text-lg font-semibold text-neutral-900 mb-4">
						Profile Information
					</h2>
					<dl className="space-y-3">
						<div>
							<dt className="text-sm text-neutral-500">Display Name</dt>
							<dd className="text-neutral-900">
								{user.displayName || "Not set"}
							</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500">Email</dt>
							<dd className="text-neutral-900">{user.email}</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500">Company</dt>
							<dd className="text-neutral-900">
								{user.companyName || "Not set"}
							</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500">Industry</dt>
							<dd className="text-neutral-900">{user.industry || "Not set"}</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500 mb-1">User Category</dt>
							<dd>
								<UserTypeSelector
									userId={user.id}
									currentType={user.userType ?? null}
									updateAction={updateUserType}
								/>
							</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500">Business Goals</dt>
							<dd className="text-neutral-900">
								{user.businessGoals || "Not set"}
							</dd>
						</div>
					</dl>
				</div>

				{/* Subscription Info + Management */}
				<SubscriptionManager
					userId={user.id}
					subscriptionType={user.subscriptionType}
					subscriptionStatus={user.subscriptionStatus}
					subscriptionStartDate={user.subscriptionStartDate}
					subscriptionEndDate={user.subscriptionEndDate}
					stripeCustomerId={user.stripeCustomerId}
					stripeSubscriptionId={user.stripeSubscriptionId}
					onChangeSubscription={changeSubscription}
					onCancelSubscription={cancelSubscription}
				/>

				{/* Activity & Status */}
				<div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
					<h2 className="text-lg font-semibold text-neutral-900 mb-4">
						Activity & Status
					</h2>
					<dl className="space-y-3">
						<div>
							<dt className="text-sm text-neutral-500">Total Chats</dt>
							<dd className="text-neutral-900 font-semibold">
								{user.chatCount}
							</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500">Total Messages</dt>
							<dd className="text-neutral-900 font-semibold">
								{user.messageCount}
							</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500">Last Active</dt>
							<dd className="text-neutral-900">
								{formatDate(user.lastActiveAt)}
							</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500">Onboarded</dt>
							<dd className="text-neutral-900">
								{user.onboardedAt ? (
									<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
										{formatDate(user.onboardedAt)}
									</span>
								) : (
									<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500">
										Not onboarded
									</span>
								)}
							</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500">Admin</dt>
							<dd className="text-neutral-900">
								{user.isAdmin ? (
									<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
										Yes
									</span>
								) : (
									<span className="text-neutral-500">No</span>
								)}
							</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500">Preferred Executive</dt>
							<dd className="text-neutral-900">
								{user.preferredBotType || "Not set"}
							</dd>
						</div>
					</dl>
				</div>
			</div>

			{/* Dates Section */}
			<div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
				<h2 className="text-lg font-semibold text-neutral-900 mb-4">
					Important Dates
				</h2>
				<div className="grid gap-4 md:grid-cols-3">
					<div>
						<dt className="text-sm text-neutral-500">TOS Accepted</dt>
						<dd className="text-neutral-900">
							{formatDate(user.tosAcceptedAt)}
						</dd>
					</div>
					<div>
						<dt className="text-sm text-neutral-500">Profile Updated</dt>
						<dd className="text-neutral-900">
							{formatDate(user.profileUpdatedAt)}
						</dd>
					</div>
					<div>
						<dt className="text-sm text-neutral-500">Deleted</dt>
						<dd className="text-neutral-900">
							{user.deletedAt ? (
								<span className="text-rose-600">
									{formatDate(user.deletedAt)}
								</span>
							) : (
								<span className="text-emerald-600">Active</span>
							)}
						</dd>
					</div>
				</div>
			</div>
		</div>
	);
}
