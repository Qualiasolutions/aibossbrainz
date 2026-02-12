import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { motion } from "framer-motion";
import { memo } from "react";
import { useMessages } from "@/hooks/use-messages";
import type { BotType } from "@/lib/bot-personalities";
import type { Vote } from "@/lib/supabase/types";
import type { ChatMessage } from "@/lib/types";
import type { UIArtifact } from "./artifact";
import { EnhancedChatMessage } from "./enhanced-chat-message";
import { PreviewMessage } from "./message";

type ArtifactMessagesProps = {
	chatId: string;
	status: UseChatHelpers<ChatMessage>["status"];
	votes: Vote[] | undefined;
	messages: ChatMessage[];
	setMessages: UseChatHelpers<ChatMessage>["setMessages"];
	regenerate: UseChatHelpers<ChatMessage>["regenerate"];
	isReadonly: boolean;
	artifactStatus: UIArtifact["status"];
	selectedBotType: BotType;
};

function PureArtifactMessages({
	chatId,
	status,
	votes,
	messages,
	setMessages,
	regenerate,
	isReadonly,
	selectedBotType,
}: ArtifactMessagesProps) {
	const {
		containerRef: messagesContainerRef,
		endRef: messagesEndRef,
		onViewportEnter,
		onViewportLeave,
		hasSentMessage,
	} = useMessages({
		status,
	});

	return (
		<div
			className="flex flex-1 min-h-0 w-full flex-col items-center gap-4 overflow-y-scroll px-4 pt-20"
			ref={messagesContainerRef}
		>
			{messages.map((message, index) => (
				<PreviewMessage
					chatId={chatId}
					isLoading={status === "streaming" && index === messages.length - 1}
					isReadonly={isReadonly}
					key={message.id}
					message={message}
					regenerate={regenerate}
					requiresScrollPadding={
						hasSentMessage && index === messages.length - 1
					}
					selectedBotType={selectedBotType}
					setMessages={setMessages}
					vote={
						votes
							? votes.find((vote) => vote.messageId === message.id)
							: undefined
					}
				/>
			))}

			{/* Inline loading indicator before assistant message exists */}
			{status === "submitted" &&
				messages.length > 0 &&
				messages[messages.length - 1]?.role === "user" && (
					<div className="w-full">
						{/* biome-ignore lint/a11y/useValidAriaRole: role is a component prop, not an ARIA role */}
						<EnhancedChatMessage
							botType={selectedBotType}
							content=""
							isTyping={true}
							role="assistant"
						/>
					</div>
				)}

			<motion.div
				className="min-h-[24px] min-w-[24px] shrink-0"
				onViewportEnter={onViewportEnter}
				onViewportLeave={onViewportLeave}
				ref={messagesEndRef}
			/>
		</div>
	);
}

function areEqual(
	prevProps: ArtifactMessagesProps,
	nextProps: ArtifactMessagesProps,
) {
	if (
		prevProps.artifactStatus === "streaming" &&
		nextProps.artifactStatus === "streaming"
	) {
		return true;
	}

	if (prevProps.status !== nextProps.status) {
		return false;
	}
	if (prevProps.status && nextProps.status) {
		return false;
	}
	if (prevProps.selectedBotType !== nextProps.selectedBotType) {
		return false;
	}
	if (prevProps.messages.length !== nextProps.messages.length) {
		return false;
	}
	if (!equal(prevProps.votes, nextProps.votes)) {
		return false;
	}

	return true;
}

export const ArtifactMessages = memo(PureArtifactMessages, areEqual);
