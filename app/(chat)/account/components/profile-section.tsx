"use client";

import { Building2, Mail, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { INDUSTRIES } from "@/lib/constants/business-profile";

export interface ProfileData {
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

export default function ProfileSection({
	profile,
	displayName,
	setDisplayName,
	companyName,
	setCompanyName,
	industry,
	setIndustry,
}: {
	profile: ProfileData | null;
	displayName: string;
	setDisplayName: (v: string) => void;
	companyName: string;
	setCompanyName: (v: string) => void;
	industry: string;
	setIndustry: (v: string) => void;
}) {
	return (
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
	);
}
