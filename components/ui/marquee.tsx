"use client";

import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
	pauseOnHover?: boolean;
	repeat?: number;
	vertical?: boolean;
	reverse?: boolean;
}

export function Marquee({
	className,
	children,
	pauseOnHover = false,
	repeat = 4,
	vertical = false,
	reverse = false,
	...props
}: MarqueeProps) {
	return (
		<div
			className={cn(
				"group flex overflow-hidden [--gap:1rem] gap-[var(--gap)]",
				vertical ? "flex-col" : "flex-row",
				className,
			)}
			{...props}
		>
			{Array.from({ length: repeat }).map((_, i) => (
				<div
					key={`marquee-${i}`}
					className={cn(
						"flex shrink-0 justify-around gap-[var(--gap)]",
						vertical
							? "animate-marquee-vertical flex-col"
							: "animate-marquee flex-row",
						pauseOnHover && "group-hover:[animation-play-state:paused]",
						reverse && "[animation-direction:reverse]",
					)}
				>
					{children}
				</div>
			))}
		</div>
	);
}
