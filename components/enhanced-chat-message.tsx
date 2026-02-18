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
		const contentRef = useRef(content);
		const isStreamingRef = useRef(isStreaming);
		const mountedWithStreamingRef = useRef(isStreaming);
		const hasStreamedRef = useRef(false);

		// Keep refs in sync
		contentRef.current = content;
		isStreamingRef.current = isStreaming;
		if (isStreaming) hasStreamedRef.current = true;

		// Effect to handle the typewriter animation
		useEffect(() => {
			// If we're staring from history (not streaming), show immediately
			if (!hasStreamedRef.current && !mountedWithStreamingRef.current) {
				setDisplayedContent(content);
				return;
			}

			let animationFrameId: number;
			let lastUpdateTime = 0;
			const UPDATE_INTERVAL = 16; // ~60fps target

			const update = (timestamp: number) => {
				if (timestamp - lastUpdateTime < UPDATE_INTERVAL) {
					animationFrameId = requestAnimationFrame(update);
					return;
				}

				setDisplayedContent((current) => {
					// Logic to advance the cursor:
					// If we are far behind, jump 3-5 chars per frame
					// If we are close, do 1 char per frame
					if (current === contentRef.current) return current;

					const remaining = contentRef.current.length - current.length;
					if (remaining <= 0) return contentRef.current;

					// Adaptive speed: faster if further behind
					const chunk = remaining > 50 ? 5 : remaining > 20 ? 3 : 1;
					const nextContent = contentRef.current.slice(
						0,
						current.length + chunk,
					);

					// Force scroll update (handled by ResizeObserver in hook, but this triggers layout)
					lastUpdateTime = timestamp;
					return nextContent;
				});

				if (
					isStreamingRef.current ||
					displayedContent.length < contentRef.current.length
				) {
					animationFrameId = requestAnimationFrame(update);
				}
			};

			animationFrameId = requestAnimationFrame(update);

			return () => {
				cancelAnimationFrame(animationFrameId);
			};
		}, []); // Empty dependency array - the loop handles updates via refs

		// Catch-up effect when content changes
		useEffect(() => {
			// This just ensures the loop above has fresh data via refs
			// We don't restart the loop here to avoid jank
		}, [content]);

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
