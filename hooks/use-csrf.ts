"use client";

import { useCallback, useEffect, useState } from "react";

const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Hook to manage CSRF tokens for secure form submissions
 */
export function useCsrf() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/csrf", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch CSRF token");
      }

      const data = await response.json();
      setToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  /**
   * Returns headers object with CSRF token included
   */
  const getCsrfHeaders = useCallback((): Record<string, string> => {
    if (!token) {
      return {};
    }
    return { [CSRF_HEADER_NAME]: token };
  }, [token]);

  /**
   * Enhanced fetch that automatically includes CSRF token
   */
  const csrfFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers);

      if (token) {
        headers.set(CSRF_HEADER_NAME, token);
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
