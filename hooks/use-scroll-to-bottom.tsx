import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";

export function useScrollToBottom() {
	const containerRef = useRef<HTMLDivElement>(null);
	const endRef = useRef<HTMLDivElement>(null);
	const [isAtBottom, setIsAtBottom] = useState(true);

	// We use a ref for isAtBottom to access it in event listeners without re-binding
	const isAtBottomRef = useRef(true);

	// When true, prevents all auto-scrolling. Only explicit user action (clicking
	// the "scroll to bottom" button) can release the lock. This prevents the
	// feedback loop where programmatic scrolls trigger scroll events that
	// re-enable auto-scroll.
	const scrollLockRef = useRef(false);

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

	// Auto-scroll when content changes - ONLY if scroll lock is not active
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const onContentChange = () => {
			// Always update isAtBottom when content changes (even without scroll events)
			const distToBottom =
				container.scrollHeight - container.scrollTop - container.clientHeight;
			const atBottom = distToBottom < 100;
			if (isAtBottomRef.current !== atBottom) {
				isAtBottomRef.current = atBottom;
				setIsAtBottom(atBottom);
			}

			// Never auto-scroll when lock is active (during streaming)
			if (scrollLockRef.current) return;

			if (isAtBottomRef.current) {
				container.scrollTo({
					top: container.scrollHeight,
					behavior: "auto",
				});
			}
		};

		const resizeObserver = new ResizeObserver(onContentChange);
		resizeObserver.observe(container);

		const mutationObserver = new MutationObserver(onContentChange);
		mutationObserver.observe(container, {
			childList: true,
			subtree: true,
			characterData: true,
		});

		return () => {
			resizeObserver.disconnect();
			mutationObserver.disconnect();
		};
	}, []);

	// Handle explicit "Scroll to Bottom" button click or new user message
	useEffect(() => {
		if (shouldScrollToBottom && containerRef.current) {
			// Explicit scroll request — release the lock
			scrollLockRef.current = false;
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
			// Explicit user action — release the lock
			scrollLockRef.current = false;
			containerRef.current.scrollTo({
				top: containerRef.current.scrollHeight,
				behavior,
			});
			setIsAtBottom(true);
			isAtBottomRef.current = true;
		}
	}, []);

	// Lock auto-scroll (call when streaming starts so user can read from the top)
	const lockAutoScroll = useCallback(() => {
		scrollLockRef.current = true;
	}, []);

	return {
		containerRef,
		endRef,
		isAtBottom,
		scrollToBottom,
		lockAutoScroll,
	};
}
