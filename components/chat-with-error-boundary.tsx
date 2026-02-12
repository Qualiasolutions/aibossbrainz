"use client";

import { Chat, type ChatProps } from "./chat";
import { ChatErrorBoundary } from "./chat-error-boundary";

export function ChatWithErrorBoundary(props: ChatProps) {
	return (
		<ChatErrorBoundary>
			<Chat {...props} />
		</ChatErrorBoundary>
	);
}
