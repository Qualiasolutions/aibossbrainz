"use client";

import {
	Building2,
	Calendar,
	CircleOff,
	Clock,
	CreditCard,
	Eye,
	MoreHorizontal,
	Search,
	Shield,
	ShieldOff,
	Trash2,
	UserPlus,
	Users,
} from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AdminUser } from "@/lib/admin/queries";
import type { SubscriptionType } from "@/lib/supabase/types";

interface UsersTableProps {
	users: AdminUser[];
	onDeleteUser: (userId: string) => Promise<void>;
	onToggleAdmin: (userId: string, isAdmin: boolean) => Promise<void>;
	onCreateUser: (data: {
		email: string;
		displayName?: string;
		companyName?: string;
		subscriptionType?: SubscriptionType;
	}) => Promise<{ success: boolean; error?: string }>;
	onChangeSubscription: (
		userId: string,
		subscriptionType: SubscriptionType,
	) => Promise<void>;
}

// Helper to format subscription display
function formatSubscriptionType(
	type: SubscriptionType | null | undefined,
): string {
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

function formatDate(dateString: string | null | undefined): string {
	if (!dateString) return "N/A";
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function getDaysRemaining(endDate: string | null | undefined): number | null {
	if (!endDate) return null;
	const end = new Date(endDate);
	const now = new Date();
	const diff = Math.ceil(
		(end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
	);
	return diff;
}

export function UsersTable({
	users,
	onDeleteUser,
	onToggleAdmin,
	onCreateUser,
	onChangeSubscription,
}: UsersTableProps) {
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState<"all" | "team" | "client" | "subscriber">("all");
	const [isPending, startTransition] = useTransition();
	const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);
	const [subscriptionUserId, setSubscriptionUserId] = useState<string | null>(
		null,
	);
	const [selectedSubscription, setSelectedSubscription] =
		useState<SubscriptionType>("trial");
	const [newUser, setNewUser] = useState({
		email: "",
		displayName: "",
		companyName: "",
		subscriptionType: "trial" as SubscriptionType,
	});

	const filteredUsers = users.filter((user) => {
		const matchesSearch =
			user.email.toLowerCase().includes(search.toLowerCase()) ||
			user.displayName?.toLowerCase().includes(search.toLowerCase()) ||
			user.companyName?.toLowerCase().includes(search.toLowerCase());

		if (!matchesSearch) return false;

		if (typeFilter === "all") return true;
		if (typeFilter === "team") return user.userType === "team";
		if (typeFilter === "client") return user.userType === "client";
		if (typeFilter === "subscriber") return !user.userType;
		return true;
	});

	const handleDelete = () => {
		if (!deleteUserId) return;
		startTransition(async () => {
			await onDeleteUser(deleteUserId);
			setDeleteUserId(null);
		});
	};

	const handleToggleAdmin = (userId: string, currentIsAdmin: boolean) => {
		startTransition(async () => {
			await onToggleAdmin(userId, !currentIsAdmin);
		});
	};

	const handleCreateUser = () => {
		if (!newUser.email) return;
		setCreateError(null);
		startTransition(async () => {
			const result = await onCreateUser(newUser);
			if (result.success) {
				setShowCreateDialog(false);
				setNewUser({
					email: "",
					displayName: "",
					companyName: "",
					subscriptionType: "trial",
				});
			} else {
				setCreateError(result.error || "Failed to create user");
			}
		});
	};

	const handleChangeSubscription = () => {
		if (!subscriptionUserId) return;
		startTransition(async () => {
			await onChangeSubscription(subscriptionUserId, selectedSubscription);
			setSubscriptionUserId(null);
		});
	};

	const typeFilterOptions = [
		{ value: "all" as const, label: "All", icon: Users, count: users.length },
		{ value: "team" as const, label: "Team", icon: Users, count: users.filter((u) => u.userType === "team").length },
		{ value: "client" as const, label: "Client", icon: Building2, count: users.filter((u) => u.userType === "client").length },
		{ value: "subscriber" as const, label: "Subscriber", icon: CircleOff, count: users.filter((u) => !u.userType).length },
	];

	return (
		<div className="space-y-4">
			{/* Type Filter Tabs */}
			<div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1 w-fit">
				{typeFilterOptions.map((option) => {
					const Icon = option.icon;
					const isActive = typeFilter === option.value;
					return (
						<button
							key={option.value}
							type="button"
							onClick={() => setTypeFilter(option.value)}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
								isActive
									? "bg-white text-neutral-900 shadow-sm"
									: "text-neutral-500 hover:text-neutral-700"
							}`}
						>
							<Icon className="h-3.5 w-3.5" />
							{option.label}
							<span className={`ml-0.5 text-[10px] ${isActive ? "text-neutral-500" : "text-neutral-400"}`}>
								{option.count}
							</span>
						</button>
					);
				})}
			</div>

			{/* Search and Actions */}
			<div className="flex items-center justify-between gap-4">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
					<Input
						placeholder="Search users..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Button
					onClick={() => setShowCreateDialog(true)}
					className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"
				>
					<UserPlus className="h-4 w-4 mr-2" />
					Add User
				</Button>
			</div>

			{/* Table */}
			<div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
				<table className="w-full">
					<thead>
						<tr className="border-b border-neutral-100 bg-neutral-50">
							<th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
								User
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
								Company
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
								Subscription
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
								Activity
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
								Status
							</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-neutral-100">
						{filteredUsers.length === 0 ? (
							<tr>
								<td
									colSpan={6}
									className="px-6 py-8 text-center text-neutral-500"
								>
									No users found
								</td>
							</tr>
						) : (
							filteredUsers.map((user) => (
								<tr
									key={user.id}
									className="hover:bg-neutral-50 transition-colors"
								>
									<td className="px-6 py-4">
										<div>
											<p className="text-sm font-medium text-neutral-900">
												{user.displayName || "No name"}
											</p>
											<p className="text-sm text-neutral-500">{user.email}</p>
										</div>
									</td>
									<td className="px-6 py-4">
										<p className="text-sm text-neutral-700">
											{user.companyName || "-"}
										</p>
										<p className="text-xs text-neutral-500">
											{user.industry || "No industry"}
										</p>
									</td>
									<td className="px-6 py-4">
										{(() => {
											const daysLeft = getDaysRemaining(
												user.subscriptionEndDate,
											);
											const isExpired =
												user.subscriptionStatus === "expired" ||
												(daysLeft !== null && daysLeft <= 0);
											return (
												<div className="space-y-1">
													<div className="flex items-center gap-1">
														<span
															className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
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
															{user.subscriptionType === "trial" && (
																<Clock className="h-3 w-3" />
															)}
															{(user.subscriptionType === "monthly" ||
																user.subscriptionType === "annual" ||
																user.subscriptionType === "lifetime") && (
																<CreditCard className="h-3 w-3" />
															)}
															{formatSubscriptionType(
																user.subscriptionType as SubscriptionType | null,
															)}
														</span>
													</div>
													{isExpired ? (
														<p className="text-xs text-rose-600 font-medium">
															Expired
														</p>
													) : daysLeft !== null ? (
														<p className="text-xs text-neutral-500 flex items-center gap-1">
															<Calendar className="h-3 w-3" />
															{daysLeft} days left
														</p>
													) : null}
													<p className="text-xs text-neutral-400">
														{formatDate(user.subscriptionEndDate)}
													</p>
												</div>
											);
										})()}
									</td>
									<td className="px-6 py-4">
										<div className="space-y-1">
											<p className="text-sm text-neutral-700">
												{user.chatCount} chats
											</p>
											<p className="text-xs text-neutral-500">
												{user.messageCount} messages
											</p>
										</div>
									</td>
									<td className="px-6 py-4">
										<div className="flex flex-col gap-1">
											{user.userType === "team" ? (
												<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-600">
													Team
												</span>
											) : user.userType === "client" ? (
												<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-sky-50 text-sky-600">
													Client
												</span>
											) : null}
											{user.isAdmin && (
												<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-rose-50 text-rose-600">
													<Shield className="h-3 w-3" />
													Admin
												</span>
											)}
											{user.onboardedAt ? (
												<span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-600">
													Onboarded
												</span>
											) : (
												<span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-100 text-neutral-500">
													Pending
												</span>
											)}
										</div>
									</td>
									<td className="px-6 py-4 text-right">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0 text-neutral-500 hover:text-neutral-900"
												>
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() =>
														window.open(`/admin/users/${user.id}`, "_self")
													}
													className="cursor-pointer"
												>
													<Eye className="h-4 w-4 mr-2" />
													View Details
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() =>
														handleToggleAdmin(user.id, user.isAdmin || false)
													}
													className="cursor-pointer"
												>
													{user.isAdmin ? (
														<>
															<ShieldOff className="h-4 w-4 mr-2" />
															Remove Admin
														</>
													) : (
														<>
															<Shield className="h-4 w-4 mr-2" />
															Make Admin
														</>
													)}
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => {
														setSubscriptionUserId(user.id);
														setSelectedSubscription(
															(user.subscriptionType as SubscriptionType) ||
																"trial",
														);
													}}
													className="cursor-pointer"
												>
													<CreditCard className="h-4 w-4 mr-2" />
													Change Subscription
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => setDeleteUserId(user.id)}
													className="text-rose-600 focus:text-rose-600 cursor-pointer"
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Delete User
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Delete Confirmation Dialog */}
			<Dialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete User</DialogTitle>
						<DialogDescription>
							This will permanently delete the user and all their data including
							chats, messages, and documents. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setDeleteUserId(null)}>
							Cancel
						</Button>
						<Button
							onClick={handleDelete}
							disabled={isPending}
							className="bg-rose-600 hover:bg-rose-700"
						>
							{isPending ? "Deleting..." : "Delete User"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Create User Dialog */}
			<Dialog
				open={showCreateDialog}
				onOpenChange={(open) => {
					setShowCreateDialog(open);
					if (!open) setCreateError(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add New User</DialogTitle>
						<DialogDescription>
							Create a new user account. They will receive an invite email to
							set their password and login.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email *</Label>
							<Input
								id="email"
								type="email"
								placeholder="user@example.com"
								value={newUser.email}
								onChange={(e) =>
									setNewUser({ ...newUser, email: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="displayName">Display Name</Label>
							<Input
								id="displayName"
								placeholder="John Doe"
								value={newUser.displayName}
								onChange={(e) =>
									setNewUser({ ...newUser, displayName: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="companyName">Company Name</Label>
							<Input
								id="companyName"
								placeholder="Acme Inc"
								value={newUser.companyName}
								onChange={(e) =>
									setNewUser({ ...newUser, companyName: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="subscriptionType">Subscription Type</Label>
							<Select
								value={newUser.subscriptionType}
								onValueChange={(value: SubscriptionType) =>
									setNewUser({ ...newUser, subscriptionType: value })
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select subscription type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="trial">Trial (14 days)</SelectItem>
									<SelectItem value="monthly">Monthly</SelectItem>
									<SelectItem value="annual">Annual</SelectItem>
									<SelectItem value="lifetime">Lifetime</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					{createError && (
						<div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
							{createError}
						</div>
					)}
					<DialogFooter>
						<Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleCreateUser}
							disabled={isPending || !newUser.email}
							className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"
						>
							{isPending ? "Creating..." : "Create User"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Change Subscription Dialog */}
			<Dialog
				open={!!subscriptionUserId}
				onOpenChange={() => setSubscriptionUserId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change Subscription</DialogTitle>
						<DialogDescription>
							Select a new subscription type. The subscription period will reset
							from today.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>Subscription Type</Label>
							<Select
								value={selectedSubscription}
								onValueChange={(value: SubscriptionType) =>
									setSelectedSubscription(value)
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select subscription type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="trial">Trial (14 days)</SelectItem>
									<SelectItem value="monthly">Monthly</SelectItem>
									<SelectItem value="annual">Annual</SelectItem>
									<SelectItem value="lifetime">Lifetime</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="text-sm text-neutral-500 bg-neutral-50 p-3 rounded-lg">
							<p className="font-medium mb-1">What happens:</p>
							<ul className="list-disc list-inside space-y-1">
								<li>Subscription starts from today</li>
								<li>Previous subscription period is replaced</li>
								<li>User will have immediate access</li>
							</ul>
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setSubscriptionUserId(null)}>
							Cancel
						</Button>
						<Button
							onClick={handleChangeSubscription}
							disabled={isPending}
							className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"
						>
							{isPending ? "Updating..." : "Update Subscription"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
