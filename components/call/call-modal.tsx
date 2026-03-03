"use client";

import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { BotType } from "@/lib/bot-personalities";
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

	// Reset state when modal closes
	const handleClose = () => {
		setSelectedExecutive(null);
		onClose();
	};

	// Handle executive selection — start the call
	const handleSelectExecutive = (executive: BotType) => {
		setSelectedExecutive(executive);
	};

	// Handle hangup
	const handleHangup = () => {
		setSelectedExecutive(null);
		onClose();
	};

	const inCall = selectedExecutive !== null;

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent
				className="sm:max-w-lg"
				onEscapeKeyDown={(e) => {
					if (inCall) e.preventDefault();
				}}
				onPointerDownOutside={(e) => {
					if (inCall) e.preventDefault();
				}}
				aria-describedby={undefined}
			>
				<VisuallyHidden>
					<DialogTitle>Voice Call</DialogTitle>
				</VisuallyHidden>
				{!inCall ? (
					<ExecutiveSelector onSelect={handleSelectExecutive} />
				) : (
					<VoiceCallInterface
						executive={selectedExecutive}
						onHangup={handleHangup}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
