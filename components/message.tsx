"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { memo, useMemo, useState } from "react";
import { parseSuggestions } from "@/lib/ai/parse-suggestions";
import type { BotType } from "@/lib/bot-personalities";
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
	onFullscreen,
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
	onSuggestionSelect?: (texts: string[]) => void;
	onFullscreen?: (content: string, botType: BotType) => void;
}) => {
	const [mode, setMode] = useState<"view" | "edit">("view");

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

	// Animate entrance: user messages get snappy slide, assistant messages get gentler fade
	const shouldAnimateUser = message.role === "user";
	const shouldAnimateAssistant = message.role === "assistant";

	return (
		<div
			className={cn(
				"group/message w-full",
				shouldAnimateUser && "message-enter",
				shouldAnimateAssistant && "assistant-enter",
			)}
			data-role={message.role}
			data-testid={`message-${message.role}`}
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
						"min-h-16": message.role === "assistant" && requiresScrollPadding,
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

					{/* Loading state for assistant messages */}
					{message.role === "assistant" &&
						isLoading &&
						!message.parts?.some(
							(p) => p.type === "text" && p.text?.trim(),
						) && (
							<div className="w-full">
								{/* biome-ignore lint/a11y/useValidAriaRole: role is a component prop, not an ARIA role */}
								<EnhancedChatMessage
									botType={messageBotType}
									content=""
									isTyping={true}
									role="assistant"
								/>
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
											className="max-w-[85%] break-words rounded-xl border border-stone-200/60 bg-stone-50/80 px-4 py-2 text-sm text-stone-800 sm:max-w-[70%]"
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

						// AI SDK v5: tool parts have type "tool-{toolName}"
						// Collapse multiple strategyCanvas tool calls into a single banner
						if ((type as string) === "tool-strategyCanvas") {
							const { state } = part as any;
							if (state !== "output-available") return null;

							// Only render a banner for the LAST strategyCanvas tool call
							const allCanvasParts = message.parts.filter(
								(p: any) =>
									(p as any).type === "tool-strategyCanvas" &&
									(p as any).state === "output-available",
							);
							const isLast =
								allCanvasParts[allCanvasParts.length - 1] === part;
							if (!isLast) return null;

							// Summarize all sections that were updated
							const sections = allCanvasParts.map(
								(p: any) => (p as any).input?.section,
							);
							const totalItems = allCanvasParts.reduce(
								(sum: number, p: any) =>
									sum + ((p as any).output?.itemsAdded || 0),
								0,
							);

							return (
								<div
									key={`canvas-summary-${(part as any).toolCallId}`}
									className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200 animate-in fade-in slide-in-from-bottom-2"
								>
									<div className="flex items-center gap-2 font-medium">
										<span className="flex items-center justify-center size-5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50">
											✓
										</span>
										Strategy Canvas Updated
									</div>
									<div className="mt-1 ml-7 text-emerald-700/90 dark:text-emerald-300/90">
										Added {totalItems} items across{" "}
										{sections.join(", ")}
									</div>
								</div>
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
								message.role === "assistant" && textFromParts && onFullscreen
									? () => onFullscreen(textFromParts, messageBotType as BotType)
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
		</div>
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
		// Short-circuit: skip deep comparison if references are identical
		if (
			prevProps.message.parts !== nextProps.message.parts &&
			!equal(prevProps.message.parts, nextProps.message.parts)
		) {
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
		if (prevProps.onFullscreen !== nextProps.onFullscreen) {
			return false;
		}

		return true;
	},
);
