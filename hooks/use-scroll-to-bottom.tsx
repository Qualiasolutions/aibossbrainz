import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";

export function useScrollToBottom() {
	const containerRef = useRef<HTMLDivElement>(null);
	const endRef = useRef<HTMLDivElement>(null);
	const [isAtBottom, setIsAtBottom] = useState(true);

	// We use a ref for isAtBottom to access it in event listeners without re-binding
	const isAtBottomRef = useRef(true);

	const { data: shouldScrollToBottom, mutate: setShouldScrollToBottom } =
		useSWR<boolean>("messages:should-scroll", null, { fallbackData: false });

	const handleScroll = useCallback(() => {
		if (!containerRef.current) return;

		const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
		const distanceToBottom = scrollHeight - scrollTop - clientHeight;

		// Consider "at bottom" if within 100px threshold
		const atBottom = distanceToBottom < 100;

		setIsAtBottom(atBottom);
		isAtBottomRef.current = atBottom;
	}, []);

	// Initial scroll check
	useEffect(() => {
		if (containerRef.current) {
			handleScroll();
		}
	}, [handleScroll]);

	// Listen for scroll events to update sticker state
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		container.addEventListener("scroll", handleScroll, { passive: true });
		return () => container.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

	// Auto-scroll when content changes IF we are sticky
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const resizeObserver = new ResizeObserver(() => {
			if (isAtBottomRef.current) {
				// Use 'auto' for instant updates during streaming to prevent lag
				container.scrollTo({
					top: container.scrollHeight,
					behavior: "auto",
				});
			}
		});

		// Observe distinct layout changes
		resizeObserver.observe(container);

		// Also watch for DOM mutations (new messages added)
		const mutationObserver = new MutationObserver(() => {
			if (isAtBottomRef.current) {
				container.scrollTo({
					top: container.scrollHeight,
					behavior: "auto",
				});
			}
		});

		mutationObserver.observe(container, {
			childList: true,
			subtree: true,
			characterData: true, // Watch text changes
		});

		return () => {
			resizeObserver.disconnect();
			mutationObserver.disconnect();
		};
	}, []);

	// Handle explicit "Scroll to Bottom" button click or new user message
	useEffect(() => {
		if (shouldScrollToBottom && containerRef.current) {
			containerRef.current.scrollTo({
				top: containerRef.current.scrollHeight,
				behavior: "smooth",
			});
			setIsAtBottom(true);
			isAtBottomRef.current = true;
			setShouldScrollToBottom(false);
		}
	}, [shouldScrollToBottom, setShouldScrollToBottom]);

	const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
		if (containerRef.current) {
			containerRef.current.scrollTo({
				top: containerRef.current.scrollHeight,
				behavior,
			});
			// Force sticky state
			setIsAtBottom(true);
			isAtBottomRef.current = true;
		}
	}, []);

	return {
		containerRef,
		endRef,
		isAtBottom,
		scrollToBottom,
	};
}
