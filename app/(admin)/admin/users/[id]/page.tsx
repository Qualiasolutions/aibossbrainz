import { ArrowLeft } from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserTypeSelector } from "@/components/admin/user-type-selector";
import { Button } from "@/components/ui/button";
import {
	getUserById,
	isUserAdmin,
	updateUserByAdmin,
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

function formatSubscriptionType(type: string | null | undefined): string {
	switch (type) {
		case "trial":
			return "Trial (14 days)";
		case "monthly":
			return "Monthly";
		case "annual":
			return "Annual";
		case "lifetime":
			return "Lifetime";
		default:
			return "None";
	}
}

async function updateUserType(userId: string, userType: string) {
	"use server";
	await requireAdmin();
	await updateUserByAdmin(userId, {
		userType: userType === "none" ? null : userType,
	});
	revalidatePath(`/admin/users/${userId}`);
}

export default async function UserDetailsPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const user = await getUserById(id);

	if (!user) {
		notFound();
	}

	return (
		<div className="p-8">
			{/* Back Button */}
			<Link href="/admin/users">
				<Button variant="ghost" className="mb-6 gap-2">
					<ArrowLeft className="h-4 w-4" />
					Back to Users
				</Button>
			</Link>

			{/* Header */}
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-neutral-900">
					{user.displayName || "No Name"}
				</h1>
				<p className="text-neutral-500 mt-1">{user.email}</p>
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

				{/* Subscription Info */}
				<div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
					<h2 className="text-lg font-semibold text-neutral-900 mb-4">
						Subscription
					</h2>
					<dl className="space-y-3">
						<div>
							<dt className="text-sm text-neutral-500">Plan</dt>
							<dd className="text-neutral-900">
								<span
									className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
										user.subscriptionType === "trial"
											? "bg-amber-50 text-amber-700"
											: user.subscriptionType === "monthly"
												? "bg-blue-50 text-blue-700"
												: user.subscriptionType === "annual"
													? "bg-purple-50 text-purple-700"
													: user.subscriptionType === "lifetime"
														? "bg-rose-50 text-rose-700"
														: "bg-neutral-100 text-neutral-500"
									}`}
								>
									{formatSubscriptionType(user.subscriptionType)}
								</span>
							</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500">Status</dt>
							<dd className="text-neutral-900">
								<span
									className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
										user.subscriptionStatus === "active"
											? "bg-emerald-50 text-emerald-700"
											: "bg-rose-50 text-rose-700"
									}`}
								>
									{user.subscriptionStatus || "None"}
								</span>
							</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500">Start Date</dt>
							<dd className="text-neutral-900">
								{formatDate(user.subscriptionStartDate)}
							</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500">End Date</dt>
							<dd className="text-neutral-900">
								{formatDate(user.subscriptionEndDate)}
							</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500">Stripe Customer ID</dt>
							<dd className="text-neutral-900 font-mono text-sm">
								{user.stripeCustomerId || "Not connected"}
							</dd>
						</div>
						<div>
							<dt className="text-sm text-neutral-500">
								Stripe Subscription ID
							</dt>
							<dd className="text-neutral-900 font-mono text-sm">
								{user.stripeSubscriptionId || "Not connected"}
							</dd>
						</div>
					</dl>
				</div>

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
