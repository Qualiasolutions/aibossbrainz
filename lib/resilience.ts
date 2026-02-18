/**
 * Resilience patterns for external API calls
 * - Circuit breaker: Prevents cascading failures
 * - Retry with exponential backoff: Handles transient failures
 */

import { logger } from "@/lib/logger";

type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerOptions {
	failureThreshold: number; // Number of failures before opening
	successThreshold: number; // Number of successes to close from half-open
	timeout: number; // Time in ms before moving from open to half-open
	name?: string; // For logging
}

interface CircuitBreakerState {
	state: CircuitState;
	failures: number;
	successes: number;
	lastFailure: number;
	nextAttempt: number;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

// Maximum number of circuit breakers to track (prevents unbounded memory growth)
const MAX_CIRCUIT_BREAKERS = 100;
// Time after which an idle circuit breaker can be cleaned up (1 hour)
const CIRCUIT_CLEANUP_AGE = 60 * 60 * 1000;

const DEFAULT_CIRCUIT_OPTIONS: CircuitBreakerOptions = {
	failureThreshold: 5,
	successThreshold: 2,
	timeout: 30000, // 30 seconds
};

/**
 * Clean up old circuit breaker entries to prevent memory leaks
 * Called periodically when getting circuit state
 */
function cleanupOldCircuits(): void {
	if (circuitBreakers.size <= MAX_CIRCUIT_BREAKERS) {
		return;
	}

	const now = Date.now();
	const entriesToDelete: string[] = [];

	for (const [name, state] of circuitBreakers) {
		// Remove circuits that have been idle for too long and are in closed state
		if (
			state.state === "closed" &&
			state.lastFailure > 0 &&
			now - state.lastFailure > CIRCUIT_CLEANUP_AGE
		) {
			entriesToDelete.push(name);
		}
	}

	// Also remove oldest entries if still over limit
	if (circuitBreakers.size - entriesToDelete.length > MAX_CIRCUIT_BREAKERS) {
		const sortedEntries = Array.from(circuitBreakers.entries())
			.filter(([name]) => !entriesToDelete.includes(name))
			.sort((a, b) => a[1].lastFailure - b[1].lastFailure);

		const toRemove = sortedEntries.slice(
			0,
			sortedEntries.length - MAX_CIRCUIT_BREAKERS,
		);
		for (const [name] of toRemove) {
			entriesToDelete.push(name);
		}
	}

	for (const name of entriesToDelete) {
		circuitBreakers.delete(name);
	}
}

/**
 * Get or create circuit breaker state for a service
 */
function getCircuitState(name: string): CircuitBreakerState {
	// Periodically clean up old entries to prevent memory leaks
	cleanupOldCircuits();

	if (!circuitBreakers.has(name)) {
		circuitBreakers.set(name, {
			state: "closed",
			failures: 0,
			successes: 0,
			lastFailure: 0,
			nextAttempt: 0,
		});
	}
	return circuitBreakers.get(name) as CircuitBreakerState;
}

/**
 * Circuit breaker wrapper for API calls
 * Prevents cascading failures by stopping requests to failing services
 */
async function withCircuitBreaker<T>(
	name: string,
	fn: () => Promise<T>,
	options: Partial<CircuitBreakerOptions> = {},
): Promise<T> {
	const opts = { ...DEFAULT_CIRCUIT_OPTIONS, ...options, name };
	const circuit = getCircuitState(name);
	const now = Date.now();

	// Check circuit state
	if (circuit.state === "open") {
		if (now < circuit.nextAttempt) {
			throw new CircuitBreakerError(
				`Circuit breaker is open for ${name}. Try again in ${Math.ceil((circuit.nextAttempt - now) / 1000)}s`,
			);
		}
		// Move to half-open state
		circuit.state = "half-open";
		circuit.successes = 0;
	}

	try {
		const result = await fn();

		// Success handling
		if (circuit.state === "half-open") {
			circuit.successes++;
			if (circuit.successes >= opts.successThreshold) {
				// Close the circuit
				circuit.state = "closed";
				circuit.failures = 0;
				circuit.successes = 0;
			}
		} else if (circuit.state === "closed") {
			// Reset failures on success
			circuit.failures = 0;
		}

		return result;
	} catch (error) {
		// Failure handling
		circuit.failures++;
		circuit.lastFailure = now;

		if (circuit.state === "half-open") {
			// Reopen circuit on any failure in half-open state
			circuit.state = "open";
			circuit.nextAttempt = now + opts.timeout;
		} else if (circuit.failures >= opts.failureThreshold) {
			// Open circuit after threshold failures
			circuit.state = "open";
			circuit.nextAttempt = now + opts.timeout;
			logger.error(
				{ service: name, failures: circuit.failures },
				"Circuit breaker opened",
			);
		}

		throw error;
	}
}

export class CircuitBreakerError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CircuitBreakerError";
	}
}

/**
 * Check if a circuit is currently open (for UI feedback)
 */
export function isCircuitOpen(name: string): boolean {
	const circuit = circuitBreakers.get(name);
	if (!circuit) return false;

	if (circuit.state === "open" && Date.now() < circuit.nextAttempt) {
		return true;
	}
	return false;
}

/**
 * Record a success for a named circuit breaker.
 * Use this for streaming APIs where withCircuitBreaker can't wrap the full lifecycle.
 */
export function recordCircuitSuccess(
	name: string,
	options: Partial<CircuitBreakerOptions> = {},
): void {
	const opts = { ...DEFAULT_CIRCUIT_OPTIONS, ...options };
	const circuit = getCircuitState(name);

	if (circuit.state === "half-open") {
		circuit.successes++;
		if (circuit.successes >= opts.successThreshold) {
			circuit.state = "closed";
			circuit.failures = 0;
			circuit.successes = 0;
		}
	} else if (circuit.state === "closed") {
		circuit.failures = 0;
	}
}

/**
 * Record a failure for a named circuit breaker.
 * Use this for streaming APIs where withCircuitBreaker can't wrap the full lifecycle.
 */
export function recordCircuitFailure(
	name: string,
	options: Partial<CircuitBreakerOptions> = {},
): void {
	const opts = { ...DEFAULT_CIRCUIT_OPTIONS, ...options };
	const circuit = getCircuitState(name);
	const now = Date.now();

	circuit.failures++;
	circuit.lastFailure = now;

	if (circuit.state === "half-open") {
		circuit.state = "open";
		circuit.nextAttempt = now + opts.timeout;
	} else if (circuit.failures >= opts.failureThreshold) {
		circuit.state = "open";
		circuit.nextAttempt = now + opts.timeout;
		logger.error(
			{ service: name, failures: circuit.failures },
			"Circuit breaker opened",
		);
	}
}

/**
 * Determine if an error is transient (should trip the circuit breaker).
 * Returns true for 429, 5xx, and network errors.
 * Returns false for client errors (400, 401, 403, 404) that indicate bad requests, not service issues.
 */
export function isTransientError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;

	const message = error.message.toLowerCase();

	// Check for HTTP status codes on the error object (AI SDK pattern)
	const status =
		(error as unknown as Record<string, unknown>).status ??
		(error as unknown as Record<string, unknown>).statusCode;

	if (typeof status === "number") {
		// Client errors should NOT trip the circuit
		if (status >= 400 && status < 500 && status !== 429) return false;
		// 429 (rate limit) and 5xx are transient
		if (status === 429 || status >= 500) return true;
	}

	// Network-level transient errors
	const transientPatterns = [
		"network",
		"timeout",
		"econnreset",
		"econnrefused",
		"fetch failed",
		"abort",
	];
	if (transientPatterns.some((p) => message.includes(p))) return true;

	// Status codes embedded in error messages
	const transientCodes = ["429", "500", "502", "503", "504"];
	if (transientCodes.some((code) => message.includes(code))) {
		// But not if a non-transient code is also present (e.g., "400")
		const clientCodes = ["400", "401", "403", "404"];
		if (clientCodes.some((code) => message.includes(code))) return false;
		return true;
	}

	return false;
}

/**
 * Extract retry-after timing from an error response.
 * Checks for Retry-After and x-ratelimit-reset headers from AI SDK error responses.
 * Returns milliseconds to wait, or null if no retry timing found.
 * Capped at 120000ms (2 minutes) to prevent absurd waits.
 */
export function getRetryAfterMs(error: unknown): number | null {
	const MAX_RETRY_AFTER = 120_000; // 2 minutes cap

	if (!error || typeof error !== "object") return null;

	// AI SDK attaches responseHeaders to errors
	const headers: unknown = (error as Record<string, unknown>).responseHeaders;
	if (!headers || typeof headers !== "object") return null;

	// Support both Headers instance and plain object
	const getHeader = (name: string): string | null => {
		if (headers instanceof Headers) return headers.get(name);
		if (typeof (headers as Record<string, unknown>)[name] === "string") {
			return (headers as Record<string, string>)[name];
		}
		return null;
	};

	// Try Retry-After header first
	const retryAfter = getHeader("retry-after");
	if (retryAfter) {
		const seconds = Number(retryAfter);
		if (!Number.isNaN(seconds) && seconds > 0) {
			return Math.min(seconds * 1000, MAX_RETRY_AFTER);
		}
		// Try parsing as HTTP date
		const date = new Date(retryAfter);
		if (!Number.isNaN(date.getTime())) {
			const ms = date.getTime() - Date.now();
			if (ms > 0) return Math.min(ms, MAX_RETRY_AFTER);
		}
	}

	// Fallback: x-ratelimit-reset (epoch seconds or ms)
	const resetHeader = getHeader("x-ratelimit-reset");
	if (resetHeader) {
		const resetValue = Number(resetHeader);
		if (!Number.isNaN(resetValue) && resetValue > 0) {
			// If value looks like epoch seconds (< 2e10), convert to ms
			const resetMs = resetValue < 2e10 ? resetValue * 1000 : resetValue;
			const ms = resetMs - Date.now();
			if (ms > 0) return Math.min(ms, MAX_RETRY_AFTER);
		}
	}

	return null;
}

// Retry with exponential backoff

interface RetryOptions {
	maxRetries: number;
	initialDelay: number; // Initial delay in ms
	maxDelay: number; // Maximum delay between retries
	backoffMultiplier: number;
	respectRetryAfter?: boolean; // Use Retry-After header timing when available (default: true)
	retryableErrors?: (error: unknown) => boolean;
	onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
	maxRetries: 3,
	initialDelay: 1000,
	maxDelay: 30000,
	backoffMultiplier: 2,
	retryableErrors: (error) => {
		// Retry on network errors, 5xx errors, and 429 (rate limit)
		if (error instanceof Error) {
			const message = error.message.toLowerCase();
			return (
				message.includes("network") ||
				message.includes("timeout") ||
				message.includes("econnreset") ||
				message.includes("econnrefused") ||
				message.includes("429") ||
				message.includes("502") ||
				message.includes("503") ||
				message.includes("504")
			);
		}
		return false;
	},
};

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options: Partial<RetryOptions> = {},
): Promise<T> {
	const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
	let lastError: unknown;

	for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Check if this is the last attempt
			if (attempt >= opts.maxRetries) {
				throw error;
			}

			// Check if error is retryable
			if (opts.retryableErrors && !opts.retryableErrors(error)) {
				throw error;
			}

			// Respect Retry-After header when available and enabled
			const respectRetryAfter = opts.respectRetryAfter !== false; // default true
			const retryAfterDelay = respectRetryAfter ? getRetryAfterMs(error) : null;

			// Calculate delay: use Retry-After if available, otherwise exponential backoff
			let delay: number;
			if (retryAfterDelay !== null) {
				delay = Math.min(retryAfterDelay, opts.maxDelay);
			} else {
				const baseDelay = opts.initialDelay * opts.backoffMultiplier ** attempt;
				const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
				delay = Math.min(baseDelay + jitter, opts.maxDelay);
			}

			// Notify about retry
			if (opts.onRetry) {
				opts.onRetry(attempt + 1, error, delay);
			}

			// Wait before retry
			await sleep(delay);
		}
	}

	throw lastError;
}

/**
 * Combined circuit breaker and retry wrapper
 * Best practice: retry inside circuit breaker
 */
async function withResilience<T>(
	serviceName: string,
	fn: () => Promise<T>,
	options: {
		circuit?: Partial<CircuitBreakerOptions>;
		retry?: Partial<RetryOptions>;
	} = {},
): Promise<T> {
	return withCircuitBreaker(serviceName, () => withRetry(fn, options.retry), {
		...options.circuit,
		name: serviceName,
	});
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Pre-configured resilience wrappers for common services

/**
 * ElevenLabs TTS API resilience wrapper
 */
export async function withElevenLabsResilience<T>(
	fn: () => Promise<T>,
): Promise<T> {
	return withResilience("elevenlabs", fn, {
		circuit: {
			failureThreshold: 3,
			timeout: 60000, // 1 minute
		},
		retry: {
			maxRetries: 2,
			initialDelay: 500,
		},
	});
}

/**
 * AI Gateway resilience wrapper
 */
export async function withAIGatewayResilience<T>(
	fn: () => Promise<T>,
): Promise<T> {
	return withResilience("ai-gateway", fn, {
		circuit: {
			failureThreshold: 5,
			timeout: 30000, // 30 seconds
		},
		retry: {
			maxRetries: 2,
			initialDelay: 1000,
		},
	});
}
