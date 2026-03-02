"use client";

import { BOT_PERSONALITIES, type BotType } from "@/lib/bot-personalities";

type GreetingProps = {
	botType: BotType;
};

export const Greeting = ({ botType }: GreetingProps) => {
	const personality = BOT_PERSONALITIES[botType];

	return (
		<div
			className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
			key="overview"
		>
			<div
				className="flex items-center gap-3 font-semibold text-xl md:text-2xl animate-fade-in-up"
				style={{ animationDelay: "0.3s" }}
			>
				<span>Hello there!</span>
			</div>
			<div
				className="text-xl text-zinc-500 md:text-2xl animate-fade-in-up"
				style={{ animationDelay: "0.45s" }}
			>
				I'm {personality.name}. How can I help you today?
			</div>
		</div>
	);
};
