"use client";

import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useGreetingSpeech } from "@/hooks/use-greeting-speech";
import { BOT_PERSONALITIES, type BotType } from "@/lib/bot-personalities";

type GreetingProps = {
	botType: BotType;
};

export const Greeting = ({ botType }: GreetingProps) => {
	const { isPlaying, isLoading, stop } = useGreetingSpeech({
		botType,
		enabled: true,
	});

	const personality = BOT_PERSONALITIES[botType];

	return (
		<div
			className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
			key="overview"
		>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="flex items-center gap-3 font-semibold text-xl md:text-2xl"
				exit={{ opacity: 0, y: 10 }}
				initial={{ opacity: 0, y: 10 }}
				transition={{ delay: 0.5 }}
			>
				<span>Hello there!</span>
				{(isPlaying || isLoading) && (
					<button
						aria-label="Stop greeting audio"
						className="inline-flex items-center justify-center rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
						onClick={stop}
						onKeyUp={(e) => e.key === "Enter" && stop()}
						type="button"
					>
						{isLoading ? (
							<Volume2 className="size-5 animate-pulse" />
						) : (
							<VolumeX className="size-5" />
						)}
					</button>
				)}
			</motion.div>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="text-xl text-zinc-500 md:text-2xl"
				exit={{ opacity: 0, y: 10 }}
				initial={{ opacity: 0, y: 10 }}
				transition={{ delay: 0.6 }}
			>
				I'm {personality.name}. How can I help you today?
			</motion.div>
		</div>
	);
};
