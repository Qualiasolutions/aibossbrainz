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
				className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${
					isMuted
						? "bg-red-100 text-red-500 ring-1 ring-red-300 shadow-md shadow-red-200/50"
						: "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-200 hover:shadow-md"
				}`}
				aria-label={isMuted ? "Unmute" : "Mute"}
			>
				{isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
			</button>

			{/* Hang up */}
			<button
				type="button"
				onClick={onHangup}
				className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-300/40 transition-all duration-200 hover:scale-105 hover:bg-red-600 hover:shadow-xl hover:shadow-red-400/40 active:scale-95"
				aria-label="Hang up"
			>
				<PhoneOff className="h-6 w-6" />
			</button>
		</div>
	);
}
