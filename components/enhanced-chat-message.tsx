"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { memo } from "react";
import type { BotType } from "@/lib/bot-personalities";
import { BOT_PERSONALITIES } from "@/lib/bot-personalities";
import { Response } from "./elements/response";

type EnhancedChatMessageProps = {
  role: string;
  content?: string | null;
  botType: BotType;
  isTyping?: boolean;
};

const ThinkingState = () => {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            animate={{
              y: [0, -4, 0],
              opacity: [0.5, 1, 0.5],
            }}
            className="size-1.5 rounded-full bg-gradient-to-br from-rose-500 to-rose-600"
            key={i}
            transition={{
              duration: 1.2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
      <span className="text-xs text-stone-500">Thinking...</span>
    </div>
  );
};

export const EnhancedChatMessage = memo(
  ({ role, content, botType, isTyping }: EnhancedChatMessageProps) => {
    const safeContent = content?.trim() ? content : "";
    const isThinking = !safeContent && isTyping;

    if (role !== "assistant") {
      return (
        <div className="ml-auto max-w-[85%] rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-stone-50 px-4 py-1.5 text-sm text-stone-800 shadow-sm transition-all hover:shadow-md sm:max-w-[70%]">
          {safeContent ? <Response>{safeContent}</Response> : null}
          {isThinking ? <ThinkingState /> : null}
        </div>
      );
    }

    const personality =
      BOT_PERSONALITIES[botType] ?? BOT_PERSONALITIES.alexandria;

    return (
      <div className="max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]">
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-stone-50/50 shadow-sm transition-all hover:shadow-md">
          {/* Subtle executive accent line */}
          <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b from-rose-400 to-rose-600" />

          {/* Shimmer effect while thinking */}
          {isThinking && (
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-100/20 to-transparent"
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
          )}

          <div className="relative flex flex-col gap-2 px-4 py-2">
            {/* Header with avatar and name */}
            <div className="flex items-center gap-3 pl-3">
              {personality.avatar && (
                <div className="relative shrink-0">
                  {isThinking && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.1, 0.4] }}
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-400 to-rose-500"
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                  <Image
                    alt={`${personality.name} avatar`}
                    className="relative size-8 rounded-full border-2 border-rose-100 shadow-sm"
                    height={32}
                    src={personality.avatar}
                    width={32}
                  />
                  {/* Status dot: pulse while thinking, green when active */}
                  {isThinking ? (
                    <motion.span
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                      className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-rose-500 shadow-sm"
                      transition={{
                        duration: 1.5,
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
                {isThinking ? (
                  <ThinkingState />
                ) : (
                  <span className="text-xs text-stone-500">
                    {personality.role}
                  </span>
                )}
              </div>
            </div>

            {/* Message content */}
            {safeContent && (
              <div className="message-text prose prose-stone max-w-none pl-3 text-stone-700 selection:bg-rose-100 selection:text-rose-900">
                <Response
                  mode={isTyping ? "streaming" : "static"}
                  parseIncompleteMarkdown={isTyping}
                >
                  {safeContent}
                </Response>
              </div>
            )}
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
