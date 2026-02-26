"use client";

import { Loader2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCsrfToken, initCsrfToken } from "@/lib/utils";
import type { ProfileData } from "./components/profile-section";

const ProfileSection = dynamic(() => import("./components/profile-section"));
const BusinessProfileSection = dynamic(
	() => import("./components/business-profile-section"),
);
const DataPrivacySection = dynamic(
	() => import("./components/data-privacy-section"),
);

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
				res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
				"user-data-export.json";
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
				<ProfileSection
					profile={profile}
					displayName={displayName}
					setDisplayName={setDisplayName}
					companyName={companyName}
					setCompanyName={setCompanyName}
					industry={industry}
					setIndustry={setIndustry}
				/>

				<BusinessProfileSection
					productsServices={productsServices}
					setProductsServices={setProductsServices}
					websiteUrl={websiteUrl}
					setWebsiteUrl={setWebsiteUrl}
					targetMarket={targetMarket}
					setTargetMarket={setTargetMarket}
					competitors={competitors}
					setCompetitors={setCompetitors}
					businessGoals={businessGoals}
					setBusinessGoals={setBusinessGoals}
					annualRevenue={annualRevenue}
					setAnnualRevenue={setAnnualRevenue}
					yearsInBusiness={yearsInBusiness}
					setYearsInBusiness={setYearsInBusiness}
					employeeCount={employeeCount}
					setEmployeeCount={setEmployeeCount}
				/>

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

				<DataPrivacySection
					exporting={exporting}
					deleting={deleting}
					deleteConfirmText={deleteConfirmText}
					setDeleteConfirmText={setDeleteConfirmText}
					handleExport={handleExport}
					handleDeleteAccount={handleDeleteAccount}
				/>
			</div>
		</div>
	);
}
