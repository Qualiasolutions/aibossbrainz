"use client";

import { motion } from "framer-motion";

interface VoiceVisualizerProps {
	isActive: boolean;
}

export function VoiceVisualizer({ isActive }: VoiceVisualizerProps) {
	return (
		<div className="flex items-center justify-center gap-2 h-24">
			{Array.from({ length: 5 }).map((_, i) => (
				<motion.div
					key={i}
					className="w-2 bg-gradient-to-t from-rose-500 to-amber-500 rounded-full"
					animate={{
						height: isActive ? ["20%", "80%", "40%", "60%", "20%"] : "20%",
					}}
					transition={{
						duration: 1.2,
						repeat: Number.POSITIVE_INFINITY,
						delay: i * 0.15,
						ease: "easeInOut",
					}}
				/>
			))}
		</div>
	);
}
