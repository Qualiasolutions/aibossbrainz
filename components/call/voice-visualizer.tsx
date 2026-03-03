"use client";

import { useEffect, useRef } from "react";

interface VoiceVisualizerProps {
	analyserNode: AnalyserNode | null;
	isActive: boolean;
	isSpeaking?: boolean;
	isConnecting?: boolean;
}

const BAR_COUNT = 28;

/**
 * Audio-reactive voice visualizer.
 * When an AnalyserNode is provided and active, reads real mic frequency data.
 * Falls back to a gentle idle animation otherwise.
 */
export function VoiceVisualizer({
	analyserNode,
	isActive,
	isSpeaking,
	isConnecting,
}: VoiceVisualizerProps) {
	const barsRef = useRef<(HTMLDivElement | null)[]>([]);
	const rafRef = useRef(0);

	useEffect(() => {
		const bars = barsRef.current;

		if (!isActive && !isConnecting) {
			// Idle: all bars at minimum height
			for (const bar of bars) {
				if (bar) {
					bar.style.height = "6%";
					bar.style.boxShadow = "none";
				}
			}
			cancelAnimationFrame(rafRef.current);
			return;
		}

		// Animated mode: read from AnalyserNode or animate synthetically
		const hasAnalyser = analyserNode !== null;
		const bufferLength = hasAnalyser ? analyserNode.frequencyBinCount : 0;
		const dataArray = hasAnalyser ? new Uint8Array(bufferLength) : null;

		// Synthetic animation state (for speaking mode, connecting, or no analyser)
		let phase = 0;

		const update = () => {
			rafRef.current = requestAnimationFrame(update);

			if (hasAnalyser && dataArray && !isSpeaking && !isConnecting) {
				// Real mic data
				analyserNode.getByteFrequencyData(dataArray);

				for (let i = 0; i < BAR_COUNT; i++) {
					const bar = bars[i];
					if (!bar) continue;
					const start = Math.floor((i / BAR_COUNT) * bufferLength);
					const end = Math.floor(((i + 1) / BAR_COUNT) * bufferLength);
					let sum = 0;
					for (let j = start; j < end; j++) sum += dataArray[j];
					const level = sum / (end - start) / 255;
					const height = Math.max(6, level * 85);
					bar.style.height = `${height}%`;
					bar.style.boxShadow =
						level > 0.1 ? "0 0 8px rgba(244, 63, 94, 0.3)" : "none";
				}
			} else {
				// Synthetic animation (speaking, connecting, or no analyser)
				phase += isConnecting ? 0.03 : 0.06; // Slower pulse for connecting
				for (let i = 0; i < BAR_COUNT; i++) {
					const bar = bars[i];
					if (!bar) continue;
					const wave =
						Math.sin(phase + i * 0.4) * 0.3 +
						Math.sin(phase * 1.5 + i * 0.25) * 0.2 +
						0.5;
					let level: number;
					if (isConnecting) {
						// Gentle breathing effect for connecting
						level = wave * 0.2 + 0.1;
					} else {
						level = isSpeaking ? wave * 0.7 + 0.1 : wave * 0.15 + 0.08;
					}
					bar.style.height = `${Math.max(6, level * 85)}%`;
					bar.style.boxShadow = isActive
						? "0 0 8px rgba(244, 63, 94, 0.3)"
						: "none";
				}
			}
		};

		update();
		return () => cancelAnimationFrame(rafRef.current);
	}, [analyserNode, isActive, isSpeaking, isConnecting]);

	return (
		<div className="flex items-end justify-center gap-[3px] h-28 px-4">
			{Array.from({ length: BAR_COUNT }).map((_, i) => (
				<div
					key={i}
					ref={(el) => {
						barsRef.current[i] = el;
					}}
					className="w-1.5 rounded-full bg-gradient-to-t from-rose-500 via-rose-400 to-amber-400"
					style={{
						height: "6%",
						transition: "height 60ms ease-out",
						opacity: 0.85,
						boxShadow: "none",
					}}
				/>
			))}
		</div>
	);
}
