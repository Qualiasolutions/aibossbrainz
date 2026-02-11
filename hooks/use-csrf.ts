"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfToken, initCsrfToken } from "@/lib/utils";

const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Hook to manage CSRF tokens for secure form submissions.
 * Uses the singleton token from lib/utils.ts to avoid duplicate fetches.
 */
export function useCsrf() {
  const [token, setToken] = useState<string | null>(() => getCsrfToken());
  const [isLoading, setIsLoading] = useState(!getCsrfToken());
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    // If we already have a token from the singleton, use it
    const existing = getCsrfToken();
    if (existing) {
      setToken(existing);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const newToken = await initCsrfToken();
      setToken(newToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const getCsrfHeaders = useCallback((): Record<string, string> => {
    const t = token || getCsrfToken();
    if (!t) return {};
    return { [CSRF_HEADER_NAME]: t };
  }, [token]);

  const csrfFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers);
      const t = token || getCsrfToken();
      if (t) {
        headers.set(CSRF_HEADER_NAME, t);
      }

      return fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    },
    [token],
  );

  return {
    token,
    isLoading,
    error,
    getCsrfHeaders,
    csrfFetch,
    refreshToken: fetchToken,
  };
}
