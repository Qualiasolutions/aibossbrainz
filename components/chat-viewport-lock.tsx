"use client";

import { useEffect } from "react";

/**
 * Locks body scrolling when mounted (chat pages only).
 * Prevents mobile browsers from scrolling the page body
 * while keeping internal chat message scrolling working.
 */
export function ChatViewportLock() {
	useEffect(() => {
		document.documentElement.style.overflow = "hidden";
		document.documentElement.style.overscrollBehavior = "none";
		document.body.style.overflow = "hidden";
		document.body.style.overscrollBehavior = "none";

		return () => {
			document.documentElement.style.overflow = "";
			document.documentElement.style.overscrollBehavior = "";
			document.body.style.overflow = "";
			document.body.style.overscrollBehavior = "";
		};
	}, []);

	return null;
}
