"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Loader2 } from "lucide-react";
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
import { INDUSTRIES } from "@/lib/constants/business-profile";
import { useOnboarding } from "../onboarding-context";

interface ProfileStepProps {
	onSubmit: () => void;
}

export function ProfileStep({ onSubmit }: ProfileStepProps) {
	const { goBack, formData, setFormData, isSaving } = useOnboarding();

	return (
		<motion.div
			className="flex flex-col px-8 pt-6 pb-8"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			transition={{ duration: 0.25 }}
		>
			<div className="mb-5 text-center">
				<div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-stone-700 to-stone-900 shadow-lg">
					<Building2 className="size-6 text-white" />
				</div>
				<h2 className="mb-1 font-bold text-xl tracking-tight text-stone-900">
					Quick Setup
				</h2>
				<p className="text-sm text-stone-500">
					Personalize your experience (optional)
				</p>
			</div>

			<div className="space-y-4">
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="space-y-1.5"
				>
					<Label
						htmlFor="displayName"
						className="font-medium text-sm text-stone-700"
					>
						Your Name
					</Label>
					<Input
						id="displayName"
						placeholder="How should we address you?"
						value={formData.displayName}
						onChange={(e) =>
							setFormData({ displayName: e.target.value })
						}
						className="h-11 border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:ring-stone-400/20"
						autoFocus
					/>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.15 }}
					className="space-y-1.5"
				>
					<Label
						htmlFor="companyName"
						className="font-medium text-sm text-stone-700"
					>
						Company{" "}
						<span className="font-normal text-stone-400 text-xs">
							(optional)
						</span>
					</Label>
					<Input
						id="companyName"
						placeholder="Your company or business name"
						value={formData.companyName}
						onChange={(e) =>
							setFormData({ companyName: e.target.value })
						}
						className="h-11 border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:ring-stone-400/20"
					/>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="space-y-1.5"
				>
					<Label
						htmlFor="industry"
						className="font-medium text-sm text-stone-700"
					>
						Industry{" "}
						<span className="font-normal text-stone-400 text-xs">
							(optional)
						</span>
					</Label>
					<Select
						value={formData.industry}
						onValueChange={(value) => setFormData({ industry: value })}
					>
						<SelectTrigger
							id="industry"
							className="h-11 border-stone-200 bg-white text-stone-900 focus:border-stone-400 focus:ring-stone-400/20"
						>
							<SelectValue placeholder="Select your industry" />
						</SelectTrigger>
						<SelectContent className="border-stone-200 bg-white">
							{INDUSTRIES.map((ind) => (
								<SelectItem
									key={ind}
									value={ind}
									className="text-stone-700 focus:bg-stone-50 focus:text-stone-900"
								>
									{ind}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</motion.div>
			</div>

			<div className="mt-6 flex items-center gap-3">
				<Button
					variant="ghost"
					onClick={goBack}
					className="h-11 px-4 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
				>
					<ArrowLeft className="mr-1.5 size-4" />
					Back
				</Button>
				<Button
					onClick={onSubmit}
					disabled={isSaving}
					className="group h-11 flex-1 bg-stone-900 font-semibold text-white transition-all hover:bg-stone-800 disabled:opacity-50"
				>
					{isSaving ? (
						<>
							<Loader2 className="mr-2 size-4 animate-spin" />
							Setting up...
						</>
					) : (
						<>
							Finish Setup
							<ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
						</>
					)}
				</Button>
			</div>
		</motion.div>
	);
}
