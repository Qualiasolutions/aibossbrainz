import type { UseChatHelpers } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { useScrollToBottom } from "./use-scroll-to-bottom";

export function useMessages({
	status,
}: {
	status: UseChatHelpers<ChatMessage>["status"];
}) {
	const { containerRef, endRef, isAtBottom, scrollToBottom, disableAutoScroll } =
		useScrollToBottom();

	const [hasSentMessage, setHasSentMessage] = useState(false);
	const prevStatusRef = useRef(status);

	useEffect(() => {
		if (status === "submitted") {
			setHasSentMessage(true);
		}

		// When streaming starts, disable auto-scroll so user can read from the beginning
		// This prevents force-scrolling to bottom during AI responses
		if (prevStatusRef.current === "submitted" && status === "streaming") {
			disableAutoScroll();
		}

		prevStatusRef.current = status;
	}, [status, disableAutoScroll]);

	return {
		containerRef,
		endRef,
		isAtBottom,
		scrollToBottom,
		hasSentMessage,
	};
}
