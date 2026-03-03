"use client";

import { Phone } from "lucide-react";
import type { BotType } from "@/lib/bot-personalities";

interface ExecutiveSelectorProps {
	onSelect: (executive: BotType) => void;
}

interface ExecutiveCard {
	type: BotType;
	name: string;
	title: string;
	initials: string;
	accentFrom: string;
	accentTo: string;
	ringColor: string;
}

const executives: ExecutiveCard[] = [
	{
		type: "alexandria",
		name: "Alexandria Alecci",
		title: "CMO — Brand Strategy",
		initials: "AA",
		accentFrom: "from-rose-500",
		accentTo: "to-pink-500",
		ringColor: "ring-rose-200 hover:ring-rose-300",
	},
	{
		type: "kim",
		name: "Kim Mylls",
		title: "CSO — Sales & Revenue",
		initials: "KM",
		accentFrom: "from-red-500",
		accentTo: "to-orange-500",
		ringColor: "ring-red-200 hover:ring-red-300",
	},
];

export function ExecutiveSelector({ onSelect }: ExecutiveSelectorProps) {
	return (
		<div className="space-y-8 py-2">
			{/* Header */}
			<div className="text-center space-y-2">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-amber-100">
					<Phone className="h-5 w-5 text-rose-600" />
				</div>
				<h2 className="text-xl font-bold tracking-tight text-neutral-800">
					Start a Voice Call
				</h2>
				<p className="text-sm text-neutral-400">
					Choose an executive to speak with
				</p>
			</div>

			{/* Executive cards */}
			<div className="grid gap-3 px-1">
				{executives.map((exec) => (
					<button
						key={exec.type}
						type="button"
						onClick={() => onSelect(exec.type)}
						className={`group relative flex items-center gap-4 rounded-xl p-4 text-left ring-1 ${exec.ringColor} bg-white transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]`}
					>
						{/* Avatar with gradient */}
						<div
							className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${exec.accentFrom} ${exec.accentTo} text-white text-sm font-bold shadow-sm`}
						>
							{exec.initials}
						</div>

						{/* Info */}
						<div className="flex-1 min-w-0">
							<h3 className="font-semibold text-neutral-800 text-[15px]">
								{exec.name}
							</h3>
							<p className="text-xs text-neutral-400 mt-0.5">{exec.title}</p>
						</div>

						{/* Call icon */}
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
							<Phone className="h-4 w-4" />
						</div>
					</button>
				))}
			</div>
		</div>
	);
}
