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
 * Word-by-word typewriter with natural pacing.
 * Instantly renders history-loaded messages. Gracefully finishes after stream ends.
 */
const TypewriterContent = memo(
	({ content, isStreaming }: { content: string; isStreaming: boolean }) => {
		const [displayedLength, setDisplayedLength] = useState(0);
		const animationRef = useRef<number | null>(null);
		const lastFrameTimeRef = useRef(0);
		const targetLengthRef = useRef(0);
		const hasStreamedRef = useRef(false);
		const mountedWithStreamingRef = useRef(isStreaming);
		const contentRef = useRef(content);
		const isStreamingRef = useRef(isStreaming);

		contentRef.current = content;
		isStreamingRef.current = isStreaming;

		if (isStreaming) {
			hasStreamedRef.current = true;
		}

		const stopAnimation = useCallback(() => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
				animationRef.current = null;
			}
		}, []);

		const animateTypewriter = useCallback(() => {
			const now = performance.now();
			// Word-by-word pacing: ~110ms while streaming, ~35ms for catch-up
			const interval = isStreamingRef.current ? 110 : 35;
			if (now - lastFrameTimeRef.current < interval) {
				animationRef.current = requestAnimationFrame(animateTypewriter);
				return;
			}
			lastFrameTimeRef.current = now;

			const text = contentRef.current;
			const target = targetLengthRef.current;

			setDisplayedLength((current) => {
				if (current >= target) return current;

				const gap = target - current;

				// Find next word boundary: skip to end of next word(s)
				let pos = current;
				const wordsPerTick = !isStreamingRef.current && gap > 300 ? 3 : 1;

				for (let w = 0; w < wordsPerTick && pos < target; w++) {
					// Skip whitespace
					while (pos < target && /\s/.test(text[pos])) pos++;
					// Skip word characters
					while (pos < target && !/\s/.test(text[pos])) pos++;
				}

				// Fallback: always advance at least 1 char
				const next = Math.min(pos > current ? pos : current + 1, target);

				if (next < target) {
					animationRef.current = requestAnimationFrame(animateTypewriter);
				}
				return next;
			});
		}, []);

		const startAnimation = useCallback(() => {
			stopAnimation();
			animationRef.current = requestAnimationFrame(animateTypewriter);
		}, [stopAnimation, animateTypewriter]);

		useEffect(() => {
			targetLengthRef.current = content.length;
			if (!hasStreamedRef.current && !mountedWithStreamingRef.current) {
				setDisplayedLength(content.length);
				return;
			}
			startAnimation();
			return stopAnimation;
		}, [content, startAnimation, stopAnimation]);

		useEffect(() => {
			if (!isStreaming && hasStreamedRef.current) {
				targetLengthRef.current = content.length;
				startAnimation();
			}
		}, [isStreaming, content.length, startAnimation]);

		useEffect(() => stopAnimation, [stopAnimation]);

		const displayedContent = content.slice(0, displayedLength);
		const isRevealing = displayedLength < content.length;

		return (
			<div className="message-text prose prose-stone max-w-none text-stone-700 selection:bg-rose-100 selection:text-rose-900">
				<Response
					mode={isRevealing ? "streaming" : "static"}
					parseIncompleteMarkdown={isRevealing}
				>
					{displayedContent}
				</Response>
				{isRevealing && <span className="streaming-cursor" />}
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
