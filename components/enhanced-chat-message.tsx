"use client";

import Image from "next/image";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { BotType } from "@/lib/bot-personalities";
import { BOT_PERSONALITIES } from "@/lib/bot-personalities";
import { Response } from "./elements/response";

type EnhancedChatMessageProps = {
	role: string;
	content?: string | null;
	botType: BotType;
	isTyping?: boolean;
};

/**
 * Word-by-word typewriter with natural pacing and scroll-stickiness awareness.
 */
const TypewriterContent = memo(
	({ content, isStreaming }: { content: string; isStreaming: boolean }) => {
		const [displayedContent, setDisplayedContent] = useState("");
		const [isStarted, setIsStarted] = useState(false);

		const contentRef = useRef(content);
		const isStreamingRef = useRef(isStreaming);
		const displayedLengthRef = useRef(0);
		const animationFrameRef = useRef<number | null>(null);
		const lastUpdateTimeRef = useRef(0);

		// Keep refs in sync
		contentRef.current = content;
		isStreamingRef.current = isStreaming;

		useEffect(() => {
			// If not streaming and never started animation, show full content immediately
			// This handles history loading or pre-streaming state
			if (!isStreaming && !isStarted) {
				setDisplayedContent(content);
				displayedLengthRef.current = content.length;
				return;
			}

			// If streaming started, enable animation mode
			if (isStreaming && !isStarted) {
				setIsStarted(true);
			}

			// If we are animating (isStarted), run the loop
			if (isStarted) {
				const animate = (timestamp: number) => {
					// Throttle updates to ~60fps (16ms)
					if (timestamp - lastUpdateTimeRef.current < 16) {
						animationFrameRef.current = requestAnimationFrame(animate);
						return;
					}

					const currentLength = displayedLengthRef.current;
					const targetLength = contentRef.current.length;

					if (currentLength < targetLength) {
						// Logic to advance cursor
						const remaining = targetLength - currentLength;

						// Adaptive speed: faster if further behind
						// Jump more characters if we are lagging significantly
						const chunk = remaining > 50 ? 5 : remaining > 20 ? 3 : 1;

						const nextLength = Math.min(currentLength + chunk, targetLength);
						const nextContent = contentRef.current.slice(0, nextLength);

						setDisplayedContent(nextContent);
						displayedLengthRef.current = nextLength;
						lastUpdateTimeRef.current = timestamp;
					}

					// Continue loop if streaming or not yet caught up
					if (
						isStreamingRef.current ||
						displayedLengthRef.current < contentRef.current.length
					) {
						animationFrameRef.current = requestAnimationFrame(animate);
					} else {
						animationFrameRef.current = null;
					}
				};

				if (!animationFrameRef.current) {
					animationFrameRef.current = requestAnimationFrame(animate);
				}
			}

			return () => {
				if (animationFrameRef.current) {
					cancelAnimationFrame(animationFrameRef.current);
					animationFrameRef.current = null;
				}
			};
		}, [isStreaming, isStarted, content]); // Re-run if these change to ensure loop is active/checked

		const isRevealing = displayedContent.length < content.length;

		return (
			<div className="message-text prose prose-stone max-w-none text-stone-700 selection:bg-rose-100 selection:text-rose-900">
				<Response
					mode={isRevealing ? "streaming" : "static"}
					parseIncompleteMarkdown={isRevealing}
				>
					{displayedContent}
				</Response>
				{isRevealing && (
					<span className="inline-block h-[1em] w-[0.5em] animate-pulse bg-stone-400 align-middle ml-1" />
				)}
			</div>
		);
	},
	(prev, next) =>
		prev.content === next.content && prev.isStreaming === next.isStreaming,
);
TypewriterContent.displayName = "TypewriterContent";

export const EnhancedChatMessage = memo(
	({ role, content, botType, isTyping }: EnhancedChatMessageProps) => {
		const safeContent = content?.trim() ? content : "";
		const hasContent = !!safeContent;

		if (role !== "assistant") {
			return (
				<div className="ml-auto max-w-[85%] rounded-xl border border-stone-200/60 bg-stone-50/80 px-4 py-2 text-sm text-stone-800 sm:max-w-[70%]">
					{safeContent ? <Response>{safeContent}</Response> : null}
				</div>
			);
		}

		if (!hasContent && !isTyping) return null;

		const personality =
			BOT_PERSONALITIES[botType] ?? BOT_PERSONALITIES.alexandria;

		return (
			<div className="assistant-enter max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]">
				<div className="relative overflow-hidden rounded-xl border border-stone-200/60 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
					{/* Accent line */}
					<div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-[var(--alecci-red)]" />

					<div className="relative flex flex-col gap-1.5 px-4 py-2.5">
						{/* Header */}
						<div className="flex items-center gap-2.5 pl-2.5">
							{personality.avatar && (
								<Image
									alt={personality.name}
									className="size-7 rounded-full border border-stone-200/80"
									height={28}
									src={personality.avatar}
									width={28}
								/>
							)}
							<div className="flex items-baseline gap-2">
								<span className="text-sm font-medium text-stone-900">
									{personality.name}
								</span>
								<span className="text-[11px] text-stone-400">
									{personality.role}
								</span>
							</div>
						</div>

						{/* Content */}
						<div className="pl-2.5">
							{hasContent ? (
								<TypewriterContent
									content={safeContent}
									isStreaming={isTyping ?? false}
								/>
							) : (
								<div className="thinking-dots" aria-label="Thinking...">
									<span />
									<span />
									<span />
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	},
	(previous, next) =>
		previous.role === next.role &&
		previous.content === next.content &&
		previous.botType === next.botType &&
		previous.isTyping === next.isTyping,
);

EnhancedChatMessage.displayName = "EnhancedChatMessage";
