"use client";

import { PhoneOff } from "lucide-react";

interface CallControlsProps {
	onHangup: () => void;
}

export function CallControls({ onHangup }: CallControlsProps) {
	return (
		<div className="flex items-center justify-center">
			<button
				type="button"
				onClick={onHangup}
				className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all hover:bg-red-600 hover:shadow-xl active:scale-95"
				aria-label="Hang up"
			>
				<PhoneOff className="h-6 w-6" />
			</button>
		</div>
	);
}
