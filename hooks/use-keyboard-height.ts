"use client";

import { useEffect, useState } from "react";

/**
 * Detects virtual keyboard height using the visualViewport API.
 * Returns the keyboard height in pixels (0 when keyboard is hidden).
 * Falls back gracefully to 0 on browsers without visualViewport support.
 */
export function useKeyboardHeight() {
	const [keyboardHeight, setKeyboardHeight] = useState(0);

	useEffect(() => {
		const viewport = window.visualViewport;
		if (!viewport) return;

		const handleResize = () => {
			// The keyboard height is the difference between window inner height
			// and the visual viewport height (viewport shrinks when keyboard opens)
			const height = window.innerHeight - viewport.height;
			// Only treat as keyboard if the difference is significant (>100px)
			// to avoid false positives from browser chrome changes
			setKeyboardHeight(height > 100 ? height : 0);
		};

		viewport.addEventListener("resize", handleResize);
		viewport.addEventListener("scroll", handleResize);

		return () => {
			viewport.removeEventListener("resize", handleResize);
			viewport.removeEventListener("scroll", handleResize);
		};
	}, []);

	return keyboardHeight;
}
