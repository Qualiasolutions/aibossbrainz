"use client";

import { Loader2, Save } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCsrfToken, initCsrfToken } from "@/lib/utils";
import { logClientError } from "@/lib/client-logger";
import type { ProfileData } from "./components/profile-section";

const ProfileSection = dynamic(() => import("./components/profile-section"));
const BusinessProfileSection = dynamic(
	() => import("./components/business-profile-section"),
);
const DataPrivacySection = dynamic(
	() => import("./components/data-privacy-section"),
);

interface AccountClientProps {
	initialProfile: ProfileData;
}

export function AccountClient({ initialProfile }: AccountClientProps) {
	const [saving, setSaving] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirmText, setDeleteConfirmText] = useState("");
	const [profile, setProfile] = useState<ProfileData>(initialProfile);

	// Form state — initialized from server-fetched data
	const [displayName, setDisplayName] = useState(
		initialProfile.displayName || "",
	);
	const [companyName, setCompanyName] = useState(
		initialProfile.companyName || "",
	);
	const [industry, setIndustry] = useState(initialProfile.industry || "");
	const [businessGoals, setBusinessGoals] = useState(
		initialProfile.businessGoals || "",
	);
	const [productsServices, setProductsServices] = useState(
		initialProfile.productsServices || "",
	);
	const [websiteUrl, setWebsiteUrl] = useState(initialProfile.websiteUrl || "");
	const [targetMarket, setTargetMarket] = useState(
		initialProfile.targetMarket || "",
	);
	const [competitors, setCompetitors] = useState(
		initialProfile.competitors || "",
	);
	const [annualRevenue, setAnnualRevenue] = useState(
		initialProfile.annualRevenue || "",
	);
	const [yearsInBusiness, setYearsInBusiness] = useState(
		initialProfile.yearsInBusiness || "",
	);
	const [employeeCount, setEmployeeCount] = useState(
		initialProfile.employeeCount || "",
	);

	const handleSave = async () => {
		setSaving(true);
		try {
			await initCsrfToken();
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
				const data = await res.json();
				setProfile(data);
				toast.success("Profile updated successfully");
			} else {
				toast.error("Failed to update profile");
			}
		} catch (error) {
			logClientError(error, {
				component: "AccountClient",
				action: "save_profile",
			});
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
			logClientError(error, {
				component: "AccountClient",
				action: "export_data",
			});
			toast.error("Failed to export data");
		} finally {
			setExporting(false);
		}
	};

	const handleDeleteAccount = async () => {
		setDeleting(true);
		try {
			await initCsrfToken();
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
			logClientError(error, {
				component: "AccountClient",
				action: "delete_account",
			});
			toast.error("Failed to delete account");
		} finally{
			setDeleting(false);
			setDeleteConfirmText("");
		}
	};

	return (
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
	);
}
