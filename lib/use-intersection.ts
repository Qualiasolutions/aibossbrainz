"use client";

import { useEffect, useRef } from "react";

type IntersectionArgs = {
  enabled?: boolean;
  onIntersect: () => void;
  threshold?: number;
  rootMargin?: string;
};

export function useIntersectionObserver({
  enabled = true,
  onIntersect,
  threshold = 0.1,
  rootMargin = "0px",
}: IntersectionArgs) {
  const targetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || !targetRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          onIntersect();
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(targetRef.current);

    return () => {
      observer.disconnect();
    };
  }, [enabled, onIntersect, threshold, rootMargin]);

  return targetRef;
}
