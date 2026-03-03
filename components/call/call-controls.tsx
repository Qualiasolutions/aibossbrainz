"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";

interface CallControlsProps {
	onHangup: () => void;
	onToggleMute: () => void;
	isMuted: boolean;
}

export function CallControls({
	onHangup,
	onToggleMute,
	isMuted,
}: CallControlsProps) {
	return (
		<div className="flex items-center justify-center gap-8">
			{/* Mute */}
			<button
				type="button"
				onClick={onToggleMute}
				className={`flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 ${
					isMuted
						? "bg-white/15 text-red-400 ring-1 ring-red-400/40 shadow-lg shadow-red-400/20"
						: "bg-white/10 text-white/80 hover:bg-white/15 hover:shadow-md"
				}`}
				aria-label={isMuted ? "Unmute" : "Mute"}
			>
				{isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
			</button>

			{/* Hang up */}
			<button
				type="button"
				onClick={onHangup}
				className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105 hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/40 active:scale-95"
				aria-label="Hang up"
			>
				<PhoneOff className="h-6 w-6" />
			</button>
		</div>
	);
}
