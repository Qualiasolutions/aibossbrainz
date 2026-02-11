"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { motion } from "framer-motion";
import Image from "next/image";
import { memo, useMemo, useState } from "react";
import { parseSuggestions } from "@/lib/ai/parse-suggestions";
import { BOT_PERSONALITIES, type BotType } from "@/lib/bot-personalities";
import type { Vote } from "@/lib/supabase/types";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { MessageContent } from "./elements/message";
import { Response } from "./elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "./elements/tool";
import { EnhancedChatMessage } from "./enhanced-chat-message";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageFullscreen } from "./message-fullscreen";
import { MessageReasoning } from "./message-reasoning";
import { MessageSuggestions } from "./message-suggestions";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding,
  selectedBotType,
  onSuggestionSelect,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  selectedBotType: BotType;
  onSuggestionSelect?: (text: string) => void;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  // Memoize expensive computations to prevent re-renders
  const attachmentsFromMessage = useMemo(
    () => message.parts.filter((part) => part.type === "file"),
    [message.parts],
  );

  // Get bot type from message metadata if available, otherwise use the selected bot
  // This ensures correct executive displays during streaming and after page refresh
  const messageBotType = message.metadata?.botType ?? selectedBotType;

  // Get text content for fullscreen view - memoized
  const textFromParts = useMemo(
    () =>
      message.parts
        ?.filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n")
        .trim(),
    [message.parts],
  );

  // Parse suggestions from message content - memoized
  const parsedContent = useMemo(
    () =>
      message.role === "assistant" && textFromParts
        ? parseSuggestions(textFromParts)
        : { content: textFromParts || "", suggestions: [] },
    [message.role, textFromParts],
  );

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="group/message w-full"
      data-role={message.role}
      data-testid={`message-${message.role}`}
      initial={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className={cn("flex w-full items-start gap-2 md:gap-3", {
          "justify-end": message.role === "user" && mode !== "edit",
          "justify-start": message.role === "assistant",
        })}
      >
        <div
          className={cn("flex w-full flex-col", {
            "gap-2 md:gap-4": message.parts?.some(
              (p) => p.type === "text" && p.text?.trim(),
            ),
            "min-h-96": message.role === "assistant" && requiresScrollPadding,
          })}
        >
          {attachmentsFromMessage.length > 0 && (
            <div
              className="flex flex-row justify-end gap-2"
              data-testid={"message-attachments"}
            >
              {attachmentsFromMessage.map((attachment) => (
                <PreviewAttachment
                  attachment={{
                    name: attachment.filename ?? "file",
                    contentType: attachment.mediaType,
                    url: attachment.url,
                  }}
                  key={attachment.url}
                />
              ))}
            </div>
          )}

          {message.parts?.map((part, index) => {
            const { type } = part;
            const key = `message-${message.id}-part-${index}`;

            if (type === "reasoning" && part.text?.trim().length > 0) {
              return (
                <MessageReasoning
                  isLoading={isLoading}
                  key={key}
                  reasoning={part.text}
                />
              );
            }

            if (type === "text") {
              if (mode === "view") {
                if (message.role === "assistant") {
                  return (
                    <div className="w-full" key={key}>
                      <EnhancedChatMessage
                        botType={messageBotType}
                        content={sanitizeText(part.text)}
                        isTyping={isLoading}
                        role={message.role}
                      />
                    </div>
                  );
                }

                return (
                  <div className="flex w-full justify-end" key={key}>
                    <MessageContent
                      className="max-w-[85%] break-words rounded-2xl border border-stone-200 bg-white px-4 py-1.5 text-sm text-stone-800 shadow-sm sm:max-w-[70%] sm:px-5 sm:py-2"
                      data-testid="message-content"
                    >
                      <Response>{sanitizeText(part.text)}</Response>
                    </MessageContent>
                  </div>
                );
              }

              if (mode === "edit") {
                return (
                  <div
                    className="flex w-full flex-row items-start gap-3"
                    key={key}
                  >
                    <div className="size-8" />
                    <div className="min-w-0 flex-1">
                      <MessageEditor
                        key={message.id}
                        message={message}
                        regenerate={regenerate}
                        setMessages={setMessages}
                        setMode={setMode}
                      />
                    </div>
                  </div>
                );
              }
            }

            if (type === "tool-getWeather") {
              const { toolCallId, state } = part;

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-getWeather" />
                  <ToolContent>
                    {state === "input-available" && (
                      <ToolInput input={part.input} />
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={<Weather weatherAtLocation={part.output} />}
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            if (type === "tool-createDocument") {
              const { toolCallId } = part;

              if (part.output && "error" in part.output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error creating document: {String(part.output.error)}
                  </div>
                );
              }

              return (
                <DocumentPreview
                  isReadonly={isReadonly}
                  key={toolCallId}
                  result={part.output}
                />
              );
            }

            if (type === "tool-updateDocument") {
              const { toolCallId } = part;

              if (part.output && "error" in part.output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error updating document: {String(part.output.error)}
                  </div>
                );
              }

              return (
                <div className="relative" key={toolCallId}>
                  <DocumentPreview
                    args={{ ...part.output, isUpdate: true }}
                    isReadonly={isReadonly}
                    result={part.output}
                  />
                </div>
              );
            }

            if (type === "tool-requestSuggestions") {
              const { toolCallId, state } = part;

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-requestSuggestions" />
                  <ToolContent>
                    {state === "input-available" && (
                      <ToolInput input={part.input} />
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={
                          "error" in part.output ? (
                            <div className="rounded border p-2 text-red-500">
                              Error: {String(part.output.error)}
                            </div>
                          ) : (
                            <DocumentToolResult
                              isReadonly={isReadonly}
                              result={part.output as any}
                              type="request-suggestions"
                            />
                          )
                        }
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            return null;
          })}

          {!isReadonly && (
            <MessageActions
              botType={messageBotType as BotType}
              chatId={chatId}
              isLoading={isLoading}
              key={`action-${message.id}`}
              message={message}
              onExpand={
                message.role === "assistant" && textFromParts
                  ? () => setIsFullscreenOpen(true)
                  : undefined
              }
              setMode={setMode}
              vote={vote}
            />
          )}

          {message.role === "assistant" && !isLoading && (
            <MessageSuggestions
              botType={messageBotType as BotType}
              isVisible={!isReadonly && parsedContent.suggestions.length > 0}
              onSelect={onSuggestionSelect ?? (() => {})}
              suggestions={parsedContent.suggestions}
            />
          )}
        </div>
      </div>

      {/* Fullscreen message dialog */}
      {message.role === "assistant" && textFromParts && (
        <MessageFullscreen
          botType={messageBotType as BotType}
          content={textFromParts}
          onOpenChange={setIsFullscreenOpen}
          open={isFullscreenOpen}
        />
      )}
    </motion.div>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    if (prevProps.message.id !== nextProps.message.id) {
      return false;
    }
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding) {
      return false;
    }
    if (!equal(prevProps.message.parts, nextProps.message.parts)) {
      return false;
    }
    if (!equal(prevProps.vote, nextProps.vote)) {
      return false;
    }
    // Only re-render for selectedBotType change if message doesn't have its own botType stored
    // This prevents old messages from changing their executive display when user switches
    if (
      !prevProps.message.metadata?.botType &&
      prevProps.selectedBotType !== nextProps.selectedBotType
    ) {
      return false;
    }
    if (prevProps.onSuggestionSelect !== nextProps.onSuggestionSelect) {
      return false;
    }

    return true;
  },
);

export const ThinkingMessage = ({
  botType = "collaborative",
}: {
  botType?: BotType;
}) => {
  const role = "assistant";
  const personality =
    BOT_PERSONALITIES[botType] ?? BOT_PERSONALITIES.alexandria;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="group/message w-full"
      data-role={role}
      data-testid="message-assistant-loading"
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
      initial={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.15 }}
    >
      <div className="max-w-[85%] sm:max-w-[75%] lg:max-w-[65%]">
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-stone-50/50 shadow-sm">
          {/* Subtle accent line */}
          <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b from-rose-400 to-rose-600" />

          {/* Animated shimmer effect */}
          <motion.div
            animate={{
              x: ["-100%", "100%"],
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-100/20 to-transparent"
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />

          <div className="relative flex items-center gap-3 px-4 py-3 pl-5">
            {/* Avatar with pulse ring */}
            {personality.avatar && (
              <div className="relative shrink-0">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.1, 0.4] }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-400 to-rose-500"
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                />
                <Image
                  alt={`${personality.name} avatar`}
                  className="relative size-8 rounded-full border-2 border-white shadow-sm"
                  src={personality.avatar}
                  width={32}
                  height={32}
                />
                {/* Active pulse dot */}
                <motion.span
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-rose-500 shadow-sm"
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                />
              </div>
            )}

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-stone-800">
                  {personality.name}
                </span>
                <div className="flex items-center gap-2">
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
                  <span className="text-xs text-stone-500">
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
