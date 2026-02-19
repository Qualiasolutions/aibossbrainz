import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";

export function useScrollToBottom() {
	const containerRef = useRef<HTMLDivElement>(null);
	const endRef = useRef<HTMLDivElement>(null);
	const [isAtBottom, setIsAtBottom] = useState(true);

	// We use a ref for isAtBottom to access it in event listeners without re-binding
	const isAtBottomRef = useRef(true);

	// Track if auto-scroll is enabled
	// Disabled by default - only enabled when user explicitly scrolls to bottom or clicks button
	const autoScrollEnabledRef = useRef(false);

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

		// Enable auto-scroll only when user manually scrolls to bottom
		// This means they WANT to follow along with streaming content
		if (atBottom) {
			autoScrollEnabledRef.current = true;
		} else {
			// User scrolled away from bottom - disable auto-scroll
			autoScrollEnabledRef.current = false;
		}
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

	// Auto-scroll when content changes - ONLY if user has opted in by scrolling to bottom
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const resizeObserver = new ResizeObserver(() => {
			// Only auto-scroll if user has explicitly enabled it by scrolling to bottom
			if (autoScrollEnabledRef.current && isAtBottomRef.current) {
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
			// Only auto-scroll if user has explicitly enabled it
			if (autoScrollEnabledRef.current && isAtBottomRef.current) {
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
			autoScrollEnabledRef.current = true; // Enable auto-scroll after explicit action
			setShouldScrollToBottom(false);
		}
	}, [shouldScrollToBottom, setShouldScrollToBottom]);

	const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
		if (containerRef.current) {
			containerRef.current.scrollTo({
				top: containerRef.current.scrollHeight,
				behavior,
			});
			// Force sticky state and enable auto-scroll
			setIsAtBottom(true);
			isAtBottomRef.current = true;
			autoScrollEnabledRef.current = true;
		}
	}, []);

	// Disable auto-scroll (call when streaming starts to let user read from top)
	const disableAutoScroll = useCallback(() => {
		autoScrollEnabledRef.current = false;
	}, []);

	return {
		containerRef,
		endRef,
		isAtBottom,
		scrollToBottom,
		disableAutoScroll,
	};
}
