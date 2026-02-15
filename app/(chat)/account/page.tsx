"use client";

import {
	Building2,
	Download,
	Loader2,
	Mail,
	Save,
	Shield,
	Target,
	Trash2,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	EMPLOYEE_COUNT_RANGES,
	INDUSTRIES,
	REVENUE_RANGES,
	YEARS_IN_BUSINESS_RANGES,
} from "@/lib/constants/business-profile";
import { getCsrfToken, initCsrfToken } from "@/lib/utils";

interface ProfileData {
	id: string;
	email: string;
	displayName: string | null;
	companyName: string | null;
	industry: string | null;
	businessGoals: string | null;
	preferredBotType: string | null;
	onboardedAt: string | null;
	productsServices: string | null;
	websiteUrl: string | null;
	targetMarket: string | null;
	competitors: string | null;
	annualRevenue: string | null;
	yearsInBusiness: string | null;
	employeeCount: string | null;
}

export default function AccountPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirmText, setDeleteConfirmText] = useState("");
	const [profile, setProfile] = useState<ProfileData | null>(null);

	// Form state
	const [displayName, setDisplayName] = useState("");
	const [companyName, setCompanyName] = useState("");
	const [industry, setIndustry] = useState("");
	const [businessGoals, setBusinessGoals] = useState("");
	const [productsServices, setProductsServices] = useState("");
	const [websiteUrl, setWebsiteUrl] = useState("");
	const [targetMarket, setTargetMarket] = useState("");
	const [competitors, setCompetitors] = useState("");
	const [annualRevenue, setAnnualRevenue] = useState("");
	const [yearsInBusiness, setYearsInBusiness] = useState("");
	const [employeeCount, setEmployeeCount] = useState("");

	const loadData = async () => {
		try {
			const res = await fetch("/api/profile");

			if (res.ok) {
				const data = await res.json();
				setProfile(data);
				setDisplayName(data.displayName || "");
				setCompanyName(data.companyName || "");
				setIndustry(data.industry || "");
				setBusinessGoals(data.businessGoals || "");
				setProductsServices(data.productsServices || "");
				setWebsiteUrl(data.websiteUrl || "");
				setTargetMarket(data.targetMarket || "");
				setCompetitors(data.competitors || "");
				setAnnualRevenue(data.annualRevenue || "");
				setYearsInBusiness(data.yearsInBusiness || "");
				setEmployeeCount(data.employeeCount || "");
			}
		} catch (error) {
			console.error("Failed to load account data:", error);
			toast.error("Failed to load account data");
		} finally {
			setLoading(false);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: loadData only uses stable state setters, mount-only effect
	useEffect(() => {
		initCsrfToken().then(() => loadData());
	}, []);

	const handleSave = async () => {
		setSaving(true);
		try {
			const csrfToken = getCsrfToken() || "";
			const res = await fetch("/api/profile", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": csrfToken,
				},
				body: JSON.stringify({
					displayName: displayName || null,
					companyName: companyName || null,
					industry: industry || null,
					businessGoals: businessGoals || null,
					productsServices: productsServices || null,
					websiteUrl: websiteUrl || null,
					targetMarket: targetMarket || null,
					competitors: competitors || null,
					annualRevenue: annualRevenue || null,
					yearsInBusiness: yearsInBusiness || null,
					employeeCount: employeeCount || null,
				}),
			});

			if (res.ok) {
				toast.success("Profile updated successfully");
				loadData();
			} else {
				toast.error("Failed to update profile");
			}
		} catch (error) {
			console.error("Failed to save profile:", error);
			toast.error("Failed to save profile");
		} finally {
			setSaving(false);
		}
	};

	const handleExport = async () => {
		setExporting(true);
		try {
			const res = await fetch("/api/export-user-data");
			if (!res.ok) {
				const data = await res.json().catch(() => null);
				toast.error(data?.error || "Failed to export data");
				return;
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download =
				res.headers
					.get("Content-Disposition")
					?.match(/filename="(.+)"/)?.[1] || "user-data-export.json";
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Data exported successfully");
		} catch (error) {
			console.error("Failed to export data:", error);
			toast.error("Failed to export data");
		} finally {
			setExporting(false);
		}
	};

	const handleDeleteAccount = async () => {
		setDeleting(true);
		try {
			const csrfToken = getCsrfToken() || "";
			const res = await fetch("/api/delete-account", {
				method: "POST",
				headers: { "X-CSRF-Token": csrfToken },
			});
			if (res.ok) {
				toast.success("Account deleted. Redirecting...");
				window.location.href = "/login";
			} else {
				toast.error("Failed to delete account");
			}
		} catch (error) {
			console.error("Failed to delete account:", error);
			toast.error("Failed to delete account");
		} finally {
			setDeleting(false);
			setDeleteConfirmText("");
		}
	};

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Loader2 className="size-8 animate-spin text-rose-500" />
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-4xl px-4 py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-stone-900">Account Settings</h1>
				<p className="mt-1 text-stone-500">
					Manage your profile and business information
				</p>
			</div>

			<div className="space-y-6">
				{/* Profile Section */}
				<div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
					<div className="mb-6 flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-xl bg-blue-100">
							<User className="size-5 text-blue-600" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-stone-900">Profile</h2>
							<p className="text-sm text-stone-500">
								Your personal information
							</p>
						</div>
					</div>

					<div className="space-y-5">
						{/* Email (read-only) */}
						<div>
							<Label className="text-sm font-medium text-stone-700">
								<Mail className="mr-1.5 inline size-4" />
								Email Address
							</Label>
							<Input
								value={profile?.email || ""}
								disabled
								className="mt-1.5 bg-stone-50 text-stone-500"
							/>
							<p className="mt-1 text-xs text-stone-400">
								Contact support to change your email
							</p>
						</div>

						{/* Display Name */}
						<div>
							<Label
								htmlFor="displayName"
								className="text-sm font-medium text-stone-700"
							>
								<User className="mr-1.5 inline size-4" />
								Display Name
							</Label>
							<Input
								id="displayName"
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
								placeholder="Your name"
								className="mt-1.5"
							/>
						</div>

						{/* Company Name */}
						<div>
							<Label
								htmlFor="companyName"
								className="text-sm font-medium text-stone-700"
							>
								<Building2 className="mr-1.5 inline size-4" />
								Company Name
							</Label>
							<Input
								id="companyName"
								value={companyName}
								onChange={(e) => setCompanyName(e.target.value)}
								placeholder="Your company"
								className="mt-1.5"
							/>
						</div>

						{/* Industry */}
						<div>
							<Label
								htmlFor="industry"
								className="text-sm font-medium text-stone-700"
							>
								Industry
							</Label>
							<Select value={industry} onValueChange={setIndustry}>
								<SelectTrigger className="mt-1.5">
									<SelectValue placeholder="Select your industry" />
								</SelectTrigger>
								<SelectContent>
									{INDUSTRIES.map((ind) => (
										<SelectItem key={ind} value={ind}>
											{ind}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* Business Profile Section */}
				<div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
					<div className="mb-6 flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-xl bg-rose-100">
							<Building2 className="size-5 text-rose-600" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-stone-900">
								Business Profile
							</h2>
							<p className="text-sm text-stone-500">
								Help Alexandria and Kim understand your business
							</p>
						</div>
					</div>

					<div className="space-y-5">
						{/* Products/Services */}
						<div>
							<Label
								htmlFor="productsServices"
								className="text-sm font-medium text-stone-700"
							>
								Products / Services
							</Label>
							<Textarea
								id="productsServices"
								value={productsServices}
								onChange={(e) => setProductsServices(e.target.value)}
								placeholder="What does your business offer?"
								className="mt-1.5 min-h-[80px]"
							/>
						</div>

						{/* Website URL */}
						<div>
							<Label
								htmlFor="websiteUrl"
								className="text-sm font-medium text-stone-700"
							>
								Website
							</Label>
							<Input
								id="websiteUrl"
								type="url"
								value={websiteUrl}
								onChange={(e) => setWebsiteUrl(e.target.value)}
								placeholder="https://yourcompany.com"
								className="mt-1.5"
							/>
						</div>

						{/* Target Market */}
						<div>
							<Label
								htmlFor="targetMarket"
								className="text-sm font-medium text-stone-700"
							>
								Target Market
							</Label>
							<Input
								id="targetMarket"
								value={targetMarket}
								onChange={(e) => setTargetMarket(e.target.value)}
								placeholder="Who are your ideal customers?"
								className="mt-1.5"
							/>
						</div>

						{/* Competitors */}
						<div>
							<Label
								htmlFor="competitors"
								className="text-sm font-medium text-stone-700"
							>
								Competitors
							</Label>
							<Input
								id="competitors"
								value={competitors}
								onChange={(e) => setCompetitors(e.target.value)}
								placeholder="Key competitors or alternatives"
								className="mt-1.5"
							/>
						</div>

						{/* Business Goals */}
						<div>
							<Label
								htmlFor="businessGoals"
								className="text-sm font-medium text-stone-700"
							>
								<Target className="mr-1.5 inline size-4" />
								Business Goals
							</Label>
							<Textarea
								id="businessGoals"
								value={businessGoals}
								onChange={(e) => setBusinessGoals(e.target.value)}
								placeholder="What are you trying to achieve?"
								className="mt-1.5 min-h-[100px]"
							/>
						</div>

						{/* Dropdowns row */}
						<div className="grid gap-4 sm:grid-cols-3">
							{/* Annual Revenue */}
							<div>
								<Label className="text-sm font-medium text-stone-700">
									Annual Revenue
								</Label>
								<Select value={annualRevenue} onValueChange={setAnnualRevenue}>
									<SelectTrigger className="mt-1.5">
										<SelectValue placeholder="Select range" />
									</SelectTrigger>
									<SelectContent>
										{REVENUE_RANGES.map((range) => (
											<SelectItem key={range} value={range}>
												{range}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Years in Business */}
							<div>
								<Label className="text-sm font-medium text-stone-700">
									Years in Business
								</Label>
								<Select
									value={yearsInBusiness}
									onValueChange={setYearsInBusiness}
								>
									<SelectTrigger className="mt-1.5">
										<SelectValue placeholder="Select range" />
									</SelectTrigger>
									<SelectContent>
										{YEARS_IN_BUSINESS_RANGES.map((range) => (
											<SelectItem key={range} value={range}>
												{range}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Employee Count */}
							<div>
								<Label className="text-sm font-medium text-stone-700">
									Team Size
								</Label>
								<Select value={employeeCount} onValueChange={setEmployeeCount}>
									<SelectTrigger className="mt-1.5">
										<SelectValue placeholder="Select range" />
									</SelectTrigger>
									<SelectContent>
										{EMPLOYEE_COUNT_RANGES.map((range) => (
											<SelectItem key={range} value={range}>
												{range}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				</div>

				{/* Save Button */}
				<div className="flex justify-end">
					<Button onClick={handleSave} disabled={saving} className="gap-2">
						{saving ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Save className="size-4" />
						)}
						Save Changes
					</Button>
				</div>

				{/* Data & Privacy Section */}
				<div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
					<div className="mb-6 flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100">
							<Shield className="size-5 text-emerald-600" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-stone-900">
								Data & Privacy
							</h2>
							<p className="text-sm text-stone-500">
								Export or delete your data
							</p>
						</div>
					</div>

					<div className="space-y-4">
						{/* Export Data */}
						<div className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50 p-4">
							<div>
								<p className="font-medium text-stone-900">Export Your Data</p>
								<p className="text-sm text-stone-500">
									Download all your data as a JSON file
								</p>
							</div>
							<Button
								variant="outline"
								onClick={handleExport}
								disabled={exporting}
								className="gap-2"
							>
								{exporting ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<Download className="size-4" />
								)}
								Export
							</Button>
						</div>

						{/* Delete Account */}
						<div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 p-4">
							<div>
								<p className="font-medium text-stone-900">
									Delete Your Account
								</p>
								<p className="text-sm text-stone-500">
									Permanently delete your account and all data
								</p>
							</div>
							<AlertDialog
								onOpenChange={(open) => {
									if (!open) setDeleteConfirmText("");
								}}
							>
								<AlertDialogTrigger asChild>
									<Button variant="destructive" className="gap-2">
										<Trash2 className="size-4" />
										Delete
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											Are you absolutely sure?
										</AlertDialogTitle>
										<AlertDialogDescription>
											This action cannot be undone. All your chats, documents,
											and account data will be permanently deleted.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<div className="py-2">
										<Label
											htmlFor="delete-confirm"
											className="text-sm text-stone-600"
										>
											Type <span className="font-bold">DELETE</span> to confirm
										</Label>
										<Input
											id="delete-confirm"
											value={deleteConfirmText}
											onChange={(e) => setDeleteConfirmText(e.target.value)}
											placeholder="DELETE"
											className="mt-1.5"
										/>
									</div>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={handleDeleteAccount}
											disabled={deleteConfirmText !== "DELETE" || deleting}
											className="bg-red-600 hover:bg-red-700"
										>
											{deleting ? (
												<Loader2 className="mr-2 size-4 animate-spin" />
											) : null}
											Delete Account
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
