/**
 * Request coalescing utility to prevent duplicate concurrent requests.
 * When multiple identical requests are made concurrently, only one request
 * is executed and the result is shared with all callers.
 */

type PendingRequest<T> = {
  promise: Promise<T>;
  timestamp: number;
};

class RequestCoalescer {
  private pending = new Map<string, PendingRequest<any>>();
  private readonly maxAge = 1000; // 1 second max age for pending requests

  /**
   * Coalesces concurrent identical requests.
   * If a request with the same key is already pending, returns that promise.
   * Otherwise, executes the request and caches the promise.
   */
  async coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Clean up stale entries
    this.cleanup();

    const existing = this.pending.get(key);
    if (existing) {
      return existing.promise;
    }

    const promise = fn()
      .then((result) => {
        this.pending.delete(key);
        return result;
      })
      .catch((error) => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, { promise, timestamp: Date.now() });
    return promise;
  }

  /**
   * Removes stale pending requests older than maxAge
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, { timestamp }] of this.pending.entries()) {
      if (now - timestamp > this.maxAge) {
        this.pending.delete(key);
      }
    }
  }

  /**
   * Clears all pending requests (useful for testing)
   */
  clear(): void {
    this.pending.clear();
  }
}

export const requestCoalescer = new RequestCoalescer();
