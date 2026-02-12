"use client";

import { Building2, Users } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserTypeSelectorProps {
	userId: string;
	currentType: string | null;
	updateAction: (userId: string, userType: string) => Promise<void>;
}

const USER_TYPE_OPTIONS = [
	{
		value: "client",
		label: "Client",
		description: "External customer",
		icon: Building2,
		bgColor: "bg-blue-50",
		textColor: "text-blue-700",
		borderColor: "border-blue-200",
		ringColor: "ring-blue-500",
	},
	{
		value: "team",
		label: "Team",
		description: "Internal member",
		icon: Users,
		bgColor: "bg-amber-50",
		textColor: "text-amber-700",
		borderColor: "border-amber-200",
		ringColor: "ring-amber-500",
	},
] as const;

export function UserTypeSelector({
	userId,
	currentType,
	updateAction,
}: UserTypeSelectorProps) {
	const [isPending, startTransition] = useTransition();

	const handleChange = (newType: string) => {
		if (newType === currentType || isPending) return;

		startTransition(async () => {
			try {
				await updateAction(userId, newType);
				toast.success(
					`User type updated to ${newType === "team" ? "Team" : "Client"}`,
				);
			} catch {
				toast.error("Failed to update user type");
			}
		});
	};

	return (
		<div className="space-y-2">
			<div className="flex gap-2">
				{USER_TYPE_OPTIONS.map((option) => {
					const Icon = option.icon;
					const isActive = (currentType || "client") === option.value;

					return (
						<button
							key={option.value}
							type="button"
							disabled={isPending}
							onClick={() => handleChange(option.value)}
							className={cn(
								"flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
								isActive
									? `${option.bgColor} ${option.textColor} ${option.borderColor} ring-2 ${option.ringColor}`
									: "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300",
								isPending && "opacity-50 cursor-not-allowed",
							)}
						>
							<Icon className="h-4 w-4" />
							<div className="text-left">
								<div>{option.label}</div>
								<div className="text-xs font-normal opacity-70">
									{option.description}
								</div>
							</div>
						</button>
					);
				})}
			</div>
			{isPending && (
				<p className="text-xs text-neutral-400 animate-pulse">Updating...</p>
			)}
		</div>
	);
}
