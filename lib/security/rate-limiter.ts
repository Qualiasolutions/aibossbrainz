import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL;

// Rate limit window in seconds (24 hours)
const RATE_LIMIT_WINDOW = 24 * 60 * 60;

// Auth rate limit window in minutes (shorter window for auth attempts)
const AUTH_RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes

// Retry configuration
const REDIS_RETRY_DELAY_MS = 30_000; // 30 seconds between retry attempts
const REDIS_MAX_RETRIES = 3; // Max retries before longer backoff

// Singleton Redis client
let redisClient: ReturnType<typeof createClient> | null = null;
let redisFailedAt: number | null = null;
let redisRetryCount = 0;

/**
 * Gets or creates Redis client with automatic retry after failures.
 * Uses exponential backoff: 30s, 60s, 120s, then 5 minutes.
 */
async function getRedisClient(): Promise<ReturnType<
	typeof createClient
> | null> {
	// Skip if Redis URL not configured
	if (!REDIS_URL) {
		return null;
	}

	// If we have a working client, return it
	if (redisClient?.isOpen) {
		return redisClient;
	}

	// Check if we should retry after a failure
	if (redisFailedAt) {
		const backoffMs =
			redisRetryCount >= REDIS_MAX_RETRIES
				? 5 * 60 * 1000 // 5 minutes after max retries
				: REDIS_RETRY_DELAY_MS * 2 ** redisRetryCount; // Exponential: 30s, 60s, 120s

		const timeSinceFailure = Date.now() - redisFailedAt;
		if (timeSinceFailure < backoffMs) {
			return null; // Still in backoff period
		}
	}

	try {
		// Clean up old client if exists
		if (redisClient) {
			try {
				await redisClient.quit();
			} catch {
				// Ignore cleanup errors
			}
			redisClient = null;
		}

		redisClient = createClient({ url: REDIS_URL });

		redisClient.on("error", (err) => {
			console.warn("[Redis] Connection error:", err.message);
			redisFailedAt = Date.now();
			redisRetryCount++;
			// Don't null the client here - let the next getRedisClient call handle reconnection
		});

		await redisClient.connect();

		// Reset failure tracking on successful connection
		redisFailedAt = null;
		redisRetryCount = 0;

		return redisClient;
	} catch (err) {
		console.warn(
			"[Redis] Connection failed, will retry after backoff:",
			err instanceof Error ? err.message : "Unknown error",
		);
		redisFailedAt = Date.now();
		redisRetryCount++;
		redisClient = null;
		return null;
	}
}

/**
 * Rate limit key format
 */
function getRateLimitKey(userId: string, namespace?: string): string {
	const today = new Date().toISOString().split("T")[0];
	const prefix = namespace ? `ratelimit:${namespace}` : "ratelimit";
	return `${prefix}:${userId}:${today}`;
}

/**
 * Checks and increments rate limit using Redis
 * Returns { allowed: boolean, remaining: number, reset: Date }
 *
 * SECURITY: When Redis is unavailable, returns source="database" to signal
 * that the caller MUST perform a database-based rate limit check.
 * The `allowed` field is set to `unknown: true` to indicate this is provisional.
 */
export async function checkRateLimit(
	userId: string,
	maxRequests: number,
	namespace?: string,
): Promise<{
	allowed: boolean;
	remaining: number;
	current: number;
	reset: Date;
	source: "redis" | "database";
	requiresDatabaseCheck?: boolean;
}> {
	const redis = await getRedisClient();

	if (!redis) {
		// Fall back to database-based rate limiting
		// SECURITY: Do NOT set allowed=true blindly - caller must verify via database
		return {
			allowed: false, // Default to denied until database check confirms
			remaining: 0,
			current: 0,
			reset: getEndOfDay(),
			source: "database",
			requiresDatabaseCheck: true,
		};
	}

	const key = getRateLimitKey(userId, namespace);

	try {
		// Atomic increment and get
		const current = await redis.incr(key);

		// Set expiry on first request of the day
		if (current === 1) {
			await redis.expire(key, RATE_LIMIT_WINDOW);
		}

		const remaining = Math.max(0, maxRequests - current);
		const allowed = current <= maxRequests;

		return {
			allowed,
			remaining,
			current,
			reset: getEndOfDay(),
			source: "redis",
		};
	} catch {
		// Redis error, fall back to database
		// SECURITY: Do NOT set allowed=true blindly - caller must verify via database
		return {
			allowed: false,
			remaining: 0,
			current: 0,
			reset: getEndOfDay(),
			source: "database",
			requiresDatabaseCheck: true,
		};
	}
}

/**
 * Gets current rate limit count without incrementing
 */
export async function getRateLimitCount(
	userId: string,
): Promise<number | null> {
	const redis = await getRedisClient();

	if (!redis) {
		return null;
	}

	const key = getRateLimitKey(userId);

	try {
		const count = await redis.get(key);
		return count ? Number.parseInt(count, 10) : 0;
	} catch {
		return null;
	}
}

/**
 * Resets rate limit for a user (admin use)
 */
export async function resetRateLimit(userId: string): Promise<boolean> {
	const redis = await getRedisClient();

	if (!redis) {
		return false;
	}

	const key = getRateLimitKey(userId);

	try {
		await redis.del(key);
		return true;
	} catch {
		return false;
	}
}

/**
 * Gets end of current day (UTC)
 */
function getEndOfDay(): Date {
	const now = new Date();
	return new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
	);
}

/**
 * Returns rate limit headers for response
 */
export function getRateLimitHeaders(
	remaining: number,
	limit: number,
	reset: Date,
): Record<string, string> {
	return {
		"X-RateLimit-Limit": String(limit),
		"X-RateLimit-Remaining": String(remaining),
		"X-RateLimit-Reset": String(Math.floor(reset.getTime() / 1000)),
	};
}

/**
 * IP-based rate limit key format for auth endpoints
 */
function getAuthRateLimitKey(
	ip: string,
	action: "login" | "signup" | "reset",
): string {
	const windowStart = Math.floor(Date.now() / (AUTH_RATE_LIMIT_WINDOW * 1000));
	return `authratelimit:${action}:${ip}:${windowStart}`;
}

/**
 * Checks IP-based rate limit for auth endpoints (login, signup, password reset).
 * Uses a shorter window (15 minutes) to prevent brute force attacks.
 *
 * @param ip - Client IP address
 * @param action - Type of auth action
 * @param maxAttempts - Maximum allowed attempts per window (default: 5 for login, 3 for signup)
 * @returns Object with allowed status and remaining attempts
 */
export async function checkAuthRateLimit(
	ip: string,
	action: "login" | "signup" | "reset",
	maxAttempts: number = 5,
): Promise<{
	allowed: boolean;
	remaining: number;
	current: number;
	reset: Date;
}> {
	const redis = await getRedisClient();

	// Default to allowing if Redis unavailable (fail-open for auth to prevent DoS)
	if (!redis) {
		return {
			allowed: true,
			remaining: maxAttempts,
			current: 0,
			reset: new Date(Date.now() + AUTH_RATE_LIMIT_WINDOW * 1000),
		};
	}

	const key = getAuthRateLimitKey(ip, action);

	try {
		// Atomic increment and get
		const current = await redis.incr(key);

		// Set expiry on first request of window
		if (current === 1) {
			await redis.expire(key, AUTH_RATE_LIMIT_WINDOW);
		}

		const remaining = Math.max(0, maxAttempts - current);
		const allowed = current <= maxAttempts;

		return {
			allowed,
			remaining,
			current,
			reset: new Date(Date.now() + AUTH_RATE_LIMIT_WINDOW * 1000),
		};
	} catch {
		// Redis error, fail-open to prevent auth DoS
		return {
			allowed: true,
			remaining: maxAttempts,
			current: 0,
			reset: new Date(Date.now() + AUTH_RATE_LIMIT_WINDOW * 1000),
		};
	}
}

/**
 * Resets auth rate limit for an IP (admin use)
 */
export async function resetAuthRateLimit(
	ip: string,
	action: "login" | "signup" | "reset",
): Promise<boolean> {
	const redis = await getRedisClient();

	if (!redis) {
		return false;
	}

	const key = getAuthRateLimitKey(ip, action);

	try {
		await redis.del(key);
		return true;
	} catch {
		return false;
	}
}
