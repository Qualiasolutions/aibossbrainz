import type { UseChatHelpers } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { useScrollToBottom } from "./use-scroll-to-bottom";

export function useMessages({
	status,
}: {
	status: UseChatHelpers<ChatMessage>["status"];
}) {
	const { containerRef, endRef, isAtBottom, scrollToBottom, lockAutoScroll } =
		useScrollToBottom();

	const [hasSentMessage, setHasSentMessage] = useState(false);
	const prevStatusRef = useRef(status);

	useEffect(() => {
		if (status === "submitted") {
			setHasSentMessage(true);
		}

		// When streaming starts, lock auto-scroll so user can read from the beginning.
		// The lock can only be released by explicit user action (clicking "scroll to bottom").
		if (prevStatusRef.current === "submitted" && status === "streaming") {
			lockAutoScroll();
		}

		prevStatusRef.current = status;
	}, [status, lockAutoScroll]);

	return {
		containerRef,
		endRef,
		isAtBottom,
		scrollToBottom,
		hasSentMessage,
	};
}
