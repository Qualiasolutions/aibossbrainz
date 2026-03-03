"use client";

import { useEffect, useRef } from "react";

interface VoiceVisualizerProps {
	analyserNode: AnalyserNode | null;
	isActive: boolean;
	isSpeaking?: boolean;
	isConnecting?: boolean;
}

const BAR_COUNT = 32;

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
					bar.style.height = "8%";
					bar.style.opacity = "0.4";
				}
			}
			cancelAnimationFrame(rafRef.current);
			return;
		}

		// Animated mode
		const hasAnalyser = analyserNode !== null;
		const bufferLength = hasAnalyser ? analyserNode.frequencyBinCount : 0;
		const dataArray = hasAnalyser ? new Uint8Array(bufferLength) : null;

		let phase = 0;

		const update = () => {
			rafRef.current = requestAnimationFrame(update);

			if (isConnecting) {
				// Connecting: slow breathing pulse
				phase += 0.025;
				for (let i = 0; i < BAR_COUNT; i++) {
					const bar = bars[i];
					if (!bar) continue;
					const wave =
						Math.sin(phase + i * 0.2) * 0.15 +
						Math.sin(phase * 0.7 + i * 0.15) * 0.1 +
						0.25;
					bar.style.height = `${Math.max(8, wave * 50)}%`;
					bar.style.opacity = "0.5";
				}
				return;
			}

			if (hasAnalyser && dataArray && !isSpeaking) {
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
					bar.style.height = `${Math.max(8, level * 90)}%`;
					bar.style.opacity = `${Math.max(0.5, 0.4 + level * 0.6)}`;
				}
			} else {
				// Synthetic animation (speaking or no analyser)
				phase += 0.06;
				for (let i = 0; i < BAR_COUNT; i++) {
					const bar = bars[i];
					if (!bar) continue;
					const wave =
						Math.sin(phase + i * 0.4) * 0.3 +
						Math.sin(phase * 1.5 + i * 0.25) * 0.2 +
						0.5;
					const level = isSpeaking ? wave * 0.75 + 0.1 : wave * 0.15 + 0.08;
					bar.style.height = `${Math.max(8, level * 90)}%`;
					bar.style.opacity = isSpeaking ? "0.9" : "0.6";
				}
			}
		};

		update();
		return () => cancelAnimationFrame(rafRef.current);
	}, [analyserNode, isActive, isSpeaking, isConnecting]);

	return (
		<div className="flex items-end justify-center gap-[3px] h-32 px-4">
			{Array.from({ length: BAR_COUNT }).map((_, i) => (
				<div
					key={i}
					ref={(el) => {
						barsRef.current[i] = el;
					}}
					className="w-[5px] rounded-full bg-gradient-to-t from-rose-500 via-rose-400 to-amber-400"
					style={{
						height: "8%",
						transition: "height 80ms ease-out, opacity 150ms ease-out",
						opacity: 0.4,
					}}
				/>
			))}
		</div>
	);
}
