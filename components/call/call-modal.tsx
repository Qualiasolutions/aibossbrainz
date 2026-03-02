"use client";

import { useState } from "react";
import type { BotType } from "@/lib/bot-personalities";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExecutiveSelector } from "./executive-selector";
import { VoiceCallInterface } from "./voice-call-interface";

interface CallModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function CallModal({ isOpen, onClose }: CallModalProps) {
	const [selectedExecutive, setSelectedExecutive] = useState<BotType | null>(
		null,
	);
	const [isConnected, setIsConnected] = useState(false);

	// Reset state when modal closes
	const handleOpenChange = (open: boolean) => {
		if (!open && !isConnected) {
			// Allow closing only when not connected
			setSelectedExecutive(null);
			setIsConnected(false);
			onClose();
		}
	};

	// Handle executive selection
	const handleSelectExecutive = (executive: BotType) => {
		setSelectedExecutive(executive);
		setIsConnected(true);
	};

	// Handle hangup
	const handleHangup = () => {
		setSelectedExecutive(null);
		setIsConnected(false);
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent
				className="sm:max-w-lg"
				onEscapeKeyDown={(e) => {
					// Prevent closing with Escape when connected
					if (isConnected) {
						e.preventDefault();
					}
				}}
				onPointerDownOutside={(e) => {
					// Prevent closing by clicking outside when connected
					if (isConnected) {
						e.preventDefault();
					}
				}}
			>
				{!isConnected && !selectedExecutive ? (
					<ExecutiveSelector onSelect={handleSelectExecutive} />
				) : (
					selectedExecutive && (
						<VoiceCallInterface
							executive={selectedExecutive}
							onHangup={handleHangup}
						/>
					)
				)}
			</DialogContent>
		</Dialog>
	);
}
