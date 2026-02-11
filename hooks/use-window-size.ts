import { useEffect, useState } from "react";

interface WindowSize {
  width: number;
  height: number;
}

/**
 * SSR-safe window size hook.
 * Returns { width: 0, height: 0 } on server and initial client render,
 * then updates to actual values after hydration.
 */
export function useWindowSize(): WindowSize {
  // Initialize with 0 for consistent SSR
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Set actual values on mount
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}
