import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { ArrowDownIcon } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { useMessages } from "@/hooks/use-messages";
import type { BotType } from "@/lib/bot-personalities";
import type { Vote } from "@/lib/supabase/types";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Conversation, ConversationContent } from "./elements/conversation";
import { EnhancedChatMessage } from "./enhanced-chat-message";
import { Greeting } from "./greeting";
import { PreviewMessage } from "./message";
import { MessageFullscreen } from "./message-fullscreen";

type MessagesProps = {
	chatId: string;
	status: UseChatHelpers<ChatMessage>["status"];
	votes: Vote[] | undefined;
	messages: ChatMessage[];
	setMessages: UseChatHelpers<ChatMessage>["setMessages"];
	regenerate: UseChatHelpers<ChatMessage>["regenerate"];
	isReadonly: boolean;
	isArtifactVisible: boolean;
	selectedModelId: string;
	selectedBotType: BotType;
	className?: string;
	onSuggestionSelect?: (text: string) => void;
};

function PureMessages({
	chatId,
	status,
	votes,
	messages,
	setMessages,
	regenerate,
	isReadonly,
	selectedModelId: _selectedModelId,
	selectedBotType,
	className,
	onSuggestionSelect,
}: MessagesProps) {
	const [fullscreenMessage, setFullscreenMessage] = useState<{
		content: string;
		botType: BotType;
	} | null>(null);

	const handleFullscreen = useCallback((content: string, botType: BotType) => {
		setFullscreenMessage({ content, botType });
	}, []);

	const {
		containerRef: messagesContainerRef,
		endRef: messagesEndRef,
		isAtBottom,
		scrollToBottom,
		hasSentMessage,
	} = useMessages({
		status,
	});

	const voteMap = useMemo(() => {
		const map = new Map<string, Vote>();
		for (const vote of votes ?? []) {
			map.set(vote.messageId, vote);
		}
		return map;
	}, [votes]);

	return (
		<div
			className={cn(
				"overscroll-behavior-contain -webkit-overflow-scrolling-touch flex-1 touch-pan-y overflow-y-scroll",
				className,
			)}
			ref={messagesContainerRef}
			style={{ overflowAnchor: "none" }}
		>
			<Conversation className="flex h-full w-full min-w-0 flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
				<ConversationContent className="flex flex-col gap-5 px-1 py-2 md:gap-7">
					{messages.length === 0 && <Greeting botType={selectedBotType} />}

					{messages.map((message, index) => (
						<PreviewMessage
							chatId={chatId}
							isLoading={
								status === "streaming" && messages.length - 1 === index
							}
							isReadonly={isReadonly}
							key={message.id}
							message={message}
							onFullscreen={handleFullscreen}
							onSuggestionSelect={onSuggestionSelect}
							regenerate={regenerate}
							requiresScrollPadding={
								hasSentMessage && index === messages.length - 1
							}
							selectedBotType={selectedBotType}
							setMessages={setMessages}
							vote={voteMap.get(message.id)}
						/>
					))}

					{/* Inline loading indicator before assistant message exists */}
					{status === "submitted" &&
						messages.length > 0 &&
						messages[messages.length - 1]?.role === "user" && (
							<div className="w-full assistant-enter">
								{/* biome-ignore lint/a11y/useValidAriaRole: role is a component prop, not an ARIA role */}
								<EnhancedChatMessage
									botType={selectedBotType}
									content=""
									isTyping={true}
									role="assistant"
								/>
							</div>
						)}

					<div
						className="min-h-[24px] min-w-[24px] shrink-0"
						ref={messagesEndRef}
					/>
				</ConversationContent>
			</Conversation>

			{!isAtBottom && (
				<div className="pointer-events-none absolute right-0 bottom-36 left-0 z-10 flex justify-center">
					<button
						aria-label="Scroll to bottom"
						className="hover:-translate-y-0.5 pointer-events-auto inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white/95 px-4 py-2 font-medium text-stone-700 text-xs shadow-md backdrop-blur-sm transition-all hover:bg-white hover:shadow-lg"
						onClick={() => scrollToBottom("smooth")}
						type="button"
					>
						<ArrowDownIcon className="size-4" />
						New messages
					</button>
				</div>
			)}

			{/* Single fullscreen dialog for all messages */}
			<MessageFullscreen
				botType={fullscreenMessage?.botType ?? "alexandria"}
				content={fullscreenMessage?.content ?? ""}
				onOpenChange={(open) => {
					if (!open) setFullscreenMessage(null);
				}}
				open={fullscreenMessage !== null}
			/>
		</div>
	);
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
	// Skip re-render if artifact is visible (messages hidden)
	if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) {
		return true;
	}

	// Re-render if any of these important props changed
	if (prevProps.status !== nextProps.status) {
		return false;
	}
	if (prevProps.selectedModelId !== nextProps.selectedModelId) {
		return false;
	}
	if (prevProps.selectedBotType !== nextProps.selectedBotType) {
		return false;
	}
	if (prevProps.messages.length !== nextProps.messages.length) {
		return false;
	}
	if (!equal(prevProps.messages, nextProps.messages)) {
		return false;
	}
	if (!equal(prevProps.votes, nextProps.votes)) {
		return false;
	}
	if (prevProps.onSuggestionSelect !== nextProps.onSuggestionSelect) {
		return false;
	}

	// All checks passed - prevent unnecessary re-render
	return true;
});
