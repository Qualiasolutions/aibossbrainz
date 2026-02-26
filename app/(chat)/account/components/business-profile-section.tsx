"use client";

import { Building2, Target } from "lucide-react";
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
	REVENUE_RANGES,
	YEARS_IN_BUSINESS_RANGES,
} from "@/lib/constants/business-profile";

export default function BusinessProfileSection({
	productsServices,
	setProductsServices,
	websiteUrl,
	setWebsiteUrl,
	targetMarket,
	setTargetMarket,
	competitors,
	setCompetitors,
	businessGoals,
	setBusinessGoals,
	annualRevenue,
	setAnnualRevenue,
	yearsInBusiness,
	setYearsInBusiness,
	employeeCount,
	setEmployeeCount,
}: {
	productsServices: string;
	setProductsServices: (v: string) => void;
	websiteUrl: string;
	setWebsiteUrl: (v: string) => void;
	targetMarket: string;
	setTargetMarket: (v: string) => void;
	competitors: string;
	setCompetitors: (v: string) => void;
	businessGoals: string;
	setBusinessGoals: (v: string) => void;
	annualRevenue: string;
	setAnnualRevenue: (v: string) => void;
	yearsInBusiness: string;
	setYearsInBusiness: (v: string) => void;
	employeeCount: string;
	setEmployeeCount: (v: string) => void;
}) {
	return (
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
	);
}
