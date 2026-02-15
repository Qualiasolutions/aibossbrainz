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
 * Uses self-scheduling setTimeout that reads content from refs,
 * so rapid content updates (from AI SDK streaming) don't cancel the timer.
 * Instantly renders history-loaded messages. Gracefully finishes after stream ends.
 */
const TypewriterContent = memo(
	({ content, isStreaming }: { content: string; isStreaming: boolean }) => {
		const [displayedLength, setDisplayedLength] = useState(0);
		const contentRef = useRef(content);
		const isStreamingRef = useRef(isStreaming);
		const mountedWithStreamingRef = useRef(isStreaming);
		const hasStreamedRef = useRef(false);
		const displayedRef = useRef(0);
		const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

		// Keep refs in sync during render
		contentRef.current = content;
		isStreamingRef.current = isStreaming;
		if (isStreaming) hasStreamedRef.current = true;

		// Self-scheduling tick: advances one word, then schedules next
		const tick = useCallback(() => {
			timerRef.current = null;

			const text = contentRef.current;
			const current = displayedRef.current;
			const target = text.length;

			// Caught up with available content
			if (current >= target) {
				// Still streaming — poll for new content
				if (isStreamingRef.current) {
					timerRef.current = setTimeout(tick, 30);
				}
				return;
			}

			const streaming = isStreamingRef.current;
			const gap = target - current;
			const wordsPerTick = !streaming && gap > 300 ? 3 : 1;

			// Advance to next word boundary
			let pos = current;
			for (let w = 0; w < wordsPerTick && pos < target; w++) {
				while (pos < target && /\s/.test(text[pos])) pos++;
				while (pos < target && !/\s/.test(text[pos])) pos++;
			}
			const next = Math.min(pos > current ? pos : current + 1, target);

			displayedRef.current = next;
			setDisplayedLength(next);

			// Schedule next word
			const delay = streaming ? 110 : 35;
			timerRef.current = setTimeout(tick, delay);
		}, []);

		// History mode: show instantly (no animation)
		useEffect(() => {
			if (!hasStreamedRef.current && !mountedWithStreamingRef.current) {
				displayedRef.current = content.length;
				setDisplayedLength(content.length);
			}
		}, [content]);

		// Start tick when new content arrives and timer isn't running
		useEffect(() => {
			if (!hasStreamedRef.current) return;
			if (timerRef.current) return;
			if (content.length <= displayedRef.current) return;
			tick();
		}, [content.length, tick]);

		// Kick catch-up when streaming ends with unrevealed content
		useEffect(() => {
			if (
				!isStreaming &&
				hasStreamedRef.current &&
				!timerRef.current &&
				displayedRef.current < contentRef.current.length
			) {
				tick();
			}
		}, [isStreaming, tick]);

		// Cleanup on unmount only
		useEffect(
			() => () => {
				if (timerRef.current) clearTimeout(timerRef.current);
			},
			[],
		);

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
