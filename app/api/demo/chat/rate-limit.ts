// In-memory rate limiting for demo (simple approach)
// In production, this would use Redis or a database

const DEMO_RATE_LIMIT = 5; // 5 messages per hour
const DEMO_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// In-memory store (resets on server restart, but that's fine for demo)
const rateLimitStore = new Map<
  string,
  { count: number; windowStart: number }
>();

// Clean up old entries periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now - value.windowStart > DEMO_WINDOW_MS) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000,
); // Clean every 5 minutes

export async function checkDemoRateLimit(ip: string): Promise<{
  allowed: boolean;
  remaining: number;
  reset: Date;
}> {
  const now = Date.now();
  const key = `demo:${ip}`;

  let entry = rateLimitStore.get(key);

  // Check if window has expired
  if (!entry || now - entry.windowStart > DEMO_WINDOW_MS) {
    entry = { count: 0, windowStart: now };
  }

  // Calculate reset time
  const resetTime = new Date(entry.windowStart + DEMO_WINDOW_MS);

  // Check if limit exceeded
  if (entry.count >= DEMO_RATE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      reset: resetTime,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: DEMO_RATE_LIMIT - entry.count,
    reset: resetTime,
  };
}
