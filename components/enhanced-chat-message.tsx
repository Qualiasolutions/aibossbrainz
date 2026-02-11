"use client";

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

const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            className="size-1.5 animate-bounce rounded-full bg-gradient-to-br from-rose-500 to-rose-600 shadow-sm"
            key={i}
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: "1s",
            }}
          />
        ))}
      </div>
      <span className="animate-pulse text-sm text-stone-500">
        Crafting response...
      </span>
    </div>
  );
};

export const EnhancedChatMessage = memo(
  ({ role, content, botType, isTyping }: EnhancedChatMessageProps) => {
    const safeContent = content?.trim() ? content : "";

    if (role !== "assistant") {
      return (
        <div className="ml-auto max-w-[85%] rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-stone-50 px-4 py-1.5 text-sm text-stone-800 shadow-sm transition-all hover:shadow-md sm:max-w-[70%]">
          {safeContent ? <Response>{safeContent}</Response> : null}
          {!safeContent && isTyping ? <TypingIndicator /> : null}
        </div>
      );
    }

    const personality =
      BOT_PERSONALITIES[botType] ?? BOT_PERSONALITIES.alexandria;

    return (
      <div className="max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]">
        <div className="relative flex flex-col gap-2 rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-stone-50/50 px-4 py-2 shadow-sm transition-all hover:shadow-md">
          {/* Subtle executive accent line */}
          <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gradient-to-b from-rose-400 to-rose-600" />

          {/* Header with avatar and name */}
          <div className="flex items-center gap-3 pl-3">
            {personality.avatar && (
              <div className="relative">
                <Image
                  alt={`${personality.name} avatar`}
                  className="size-8 rounded-full border-2 border-rose-100 shadow-sm"
                  height={32}
                  src={personality.avatar}
                  width={32}
                />
                {/* Active indicator dot */}
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-green-500" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-stone-800">
                {personality.name}
              </span>
              <span className="text-xs text-stone-500">{personality.role}</span>
            </div>
          </div>

          {/* Message content with enhanced typography */}
          <div className="message-text prose prose-stone max-w-none pl-3 text-stone-700 selection:bg-rose-100 selection:text-rose-900">
            {safeContent ? (
              <Response
                mode={isTyping ? "streaming" : "static"}
                parseIncompleteMarkdown={isTyping}
              >
                {safeContent}
              </Response>
            ) : null}
            {!safeContent && isTyping ? <TypingIndicator /> : null}
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
