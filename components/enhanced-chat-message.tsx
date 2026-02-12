"use client";

import { AnimatePresence, motion } from "framer-motion";
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
 * Premium streaming cursor with smooth pulse animation
 */
const StreamingCursor = memo(() => (
	<motion.span
		initial={{ opacity: 0, scaleY: 0.8 }}
		animate={{
			opacity: [0.7, 1, 0.7],
			scaleY: [0.9, 1, 0.9],
		}}
		exit={{ opacity: 0, scaleY: 0.8 }}
		className="ml-0.5 inline-block h-[1.1em] w-[2px] rounded-full bg-gradient-to-b from-rose-400 to-rose-600 align-text-bottom shadow-sm shadow-rose-500/30"
		transition={{
			duration: 1,
			repeat: Number.POSITIVE_INFINITY,
			ease: "easeInOut",
		}}
	/>
));
StreamingCursor.displayName = "StreamingCursor";

/**
 * Typewriter animation that reveals text character-by-character.
 * Keeps animating even after streaming ends until all text is revealed.
 */
const TypewriterContent = memo(
	({ content, isStreaming }: { content: string; isStreaming: boolean }) => {
		const [displayedLength, setDisplayedLength] = useState(0);
		const animationRef = useRef<number | null>(null);
		const lastFrameTimeRef = useRef(0);
		const targetLengthRef = useRef(0);
		// Track if this component ever streamed (vs loaded from history)
		const hasStreamedRef = useRef(false);
		const mountedWithStreamingRef = useRef(isStreaming);

		// Mark that we've seen streaming content
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
			const elapsed = now - lastFrameTimeRef.current;

			// ~45fps for smooth feel
			if (elapsed < 22) {
				animationRef.current = requestAnimationFrame(animateTypewriter);
				return;
			}

			lastFrameTimeRef.current = now;

			setDisplayedLength((current) => {
				const target = targetLengthRef.current;

				if (current >= target) {
					// Reached target, stop animating
					return current;
				}

				// Reveal 2-6 characters per frame for a visible typewriter effect
				const charsToAdd = Math.min(
					6,
					Math.max(2, Math.ceil((target - current) * 0.08)),
				);
				const nextLength = Math.min(current + charsToAdd, target);

				// Keep animation going if not done
				if (nextLength < target) {
					animationRef.current = requestAnimationFrame(animateTypewriter);
				}

				return nextLength;
			});
		}, []);

		const startAnimation = useCallback(() => {
			stopAnimation();
			animationRef.current = requestAnimationFrame(animateTypewriter);
		}, [stopAnimation, animateTypewriter]);

		useEffect(() => {
			targetLengthRef.current = content.length;

			// If this message was loaded from history (never streamed), show immediately
			if (!hasStreamedRef.current && !mountedWithStreamingRef.current) {
				setDisplayedLength(content.length);
				return;
			}

			// Content grew — animate to reveal new characters
			startAnimation();

			return stopAnimation;
		}, [content, startAnimation, stopAnimation]);

		// When streaming ends, DON'T jump to end — let animation finish naturally
		// Just ensure the animation is running to catch up to final content
		useEffect(() => {
			if (!isStreaming && hasStreamedRef.current) {
				targetLengthRef.current = content.length;
				startAnimation();
			}
		}, [isStreaming, content.length, startAnimation]);

		// Cleanup on unmount
		useEffect(() => stopAnimation, [stopAnimation]);

		const displayedContent = content.slice(0, displayedLength);
		const isRevealing = displayedLength < content.length;
		const showCursor = isRevealing;

		return (
			<div className="message-text prose prose-stone max-w-none pl-3 text-stone-700 selection:bg-rose-100 selection:text-rose-900">
				<Response
					mode={isRevealing ? "streaming" : "static"}
					parseIncompleteMarkdown={isRevealing}
				>
					{displayedContent}
				</Response>
				<AnimatePresence>{showCursor && <StreamingCursor />}</AnimatePresence>
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

		// For user messages
		if (role !== "assistant") {
			return (
				<div className="ml-auto max-w-[85%] rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-stone-50 px-4 py-1.5 text-sm text-stone-800 shadow-sm transition-all hover:shadow-md sm:max-w-[70%]">
					{safeContent ? <Response>{safeContent}</Response> : null}
				</div>
			);
		}

		// If no content and not typing, don't render (edge case)
		if (!hasContent && !isTyping) {
			return null;
		}

		const personality =
			BOT_PERSONALITIES[botType] ?? BOT_PERSONALITIES.alexandria;

		return (
			<div className="max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]">
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-stone-50/50 shadow-sm transition-all hover:shadow-md"
					initial={{ opacity: 0, y: 4 }}
					transition={{ duration: 0.2, ease: "easeOut" }}
				>
					{/* Subtle executive accent line */}
					<div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b from-rose-400 to-rose-600" />

					<div className="relative flex flex-col gap-2 px-4 py-2">
						{/* Header with avatar and name */}
						<div className="flex items-center gap-3 pl-3">
							{personality.avatar && (
								<div className="relative shrink-0">
									<Image
										alt={`${personality.name} avatar`}
										className="relative size-8 rounded-full border-2 border-rose-100 shadow-sm"
										height={32}
										src={personality.avatar}
										width={32}
									/>
									{/* Status dot: blinking while streaming, green when done */}
									{isTyping ? (
										<motion.span
											animate={{ opacity: [1, 0.4, 1] }}
											className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-rose-500 shadow-sm"
											transition={{
												duration: 0.6,
												repeat: Number.POSITIVE_INFINITY,
												ease: "easeInOut",
											}}
										/>
									) : (
										<span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-green-500" />
									)}
								</div>
							)}
							<div className="flex flex-col">
								<span className="font-semibold text-sm text-stone-800">
									{personality.name}
								</span>
								<span className="text-xs text-stone-500">
									{personality.role}
								</span>
							</div>
						</div>

						{/* Message content with typewriter effect or loading dots */}
						{hasContent ? (
							<TypewriterContent
								content={safeContent}
								isStreaming={isTyping ?? false}
							/>
						) : (
							<div className="flex items-center gap-1.5 pl-3 py-2">
								{[0, 1, 2].map((i) => (
									<motion.div
										key={i}
										className="size-1.5 rounded-full bg-stone-400"
										animate={{ opacity: [0.3, 1, 0.3] }}
										transition={{
											duration: 1.2,
											repeat: Number.POSITIVE_INFINITY,
											ease: "easeInOut",
											delay: i * 0.2,
										}}
									/>
								))}
							</div>
						)}
					</div>
				</motion.div>
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
