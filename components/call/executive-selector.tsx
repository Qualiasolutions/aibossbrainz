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
	gradient: string;
	hoverGradient: string;
}

const executives: ExecutiveCard[] = [
	{
		type: "alexandria",
		name: "Alexandria Alecci",
		title: "CMO — Brand Strategy",
		gradient: "from-rose-500/20 to-pink-500/20",
		hoverGradient: "hover:from-rose-500/30 hover:to-pink-500/30",
	},
	{
		type: "kim",
		name: "Kim Mylls",
		title: "CSO — Sales & Revenue",
		gradient: "from-red-500/20 to-orange-500/20",
		hoverGradient: "hover:from-red-500/30 hover:to-orange-500/30",
	},
];

export function ExecutiveSelector({ onSelect }: ExecutiveSelectorProps) {
	return (
		<div className="space-y-6">
			<div className="text-center space-y-2">
				<h2 className="text-2xl font-semibold">Start a Voice Call</h2>
				<p className="text-muted-foreground">
					Choose an executive to speak with
				</p>
			</div>

			<div className="grid gap-4">
				{executives.map((executive) => (
					<button
						key={executive.type}
						type="button"
						onClick={() => onSelect(executive.type)}
						className={`group relative overflow-hidden rounded-lg border bg-gradient-to-br ${executive.gradient} ${executive.hoverGradient} p-6 text-left transition-all hover:shadow-lg hover:scale-[1.02]`}
					>
						<div className="flex items-start gap-4">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/50 backdrop-blur-sm">
								<Phone className="h-6 w-6" />
							</div>
							<div className="flex-1 space-y-1">
								<h3 className="font-semibold text-lg">{executive.name}</h3>
								<p className="text-sm text-muted-foreground">
									{executive.title}
								</p>
							</div>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}
