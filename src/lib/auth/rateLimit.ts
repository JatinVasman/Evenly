/**
 * In-memory sliding-window rate limiter for sensitive authentication endpoints.
 * Protects against brute-force password guessing and registration spam.
 */

interface RateLimitRecord {
  attempts: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale rate limit records every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.attempts = record.attempts.filter((timestamp) => now - timestamp < 30 * 60 * 1000);
      if (record.attempts.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Checks and records an attempt for the specified key within a sliding time window.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 5 * 60 * 1000 // default 5 minutes
): RateLimitResult {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { attempts: [] };
    rateLimitStore.set(key, record);
  }

  // Filter out attempts older than the window
  record.attempts = record.attempts.filter((timestamp) => now - timestamp < windowMs);

  if (record.attempts.length >= maxAttempts) {
    const oldestInWindow = record.attempts[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(Math.max(1, retryAfterMs / 1000)),
    };
  }

  record.attempts.push(now);

  return {
    allowed: true,
    remaining: maxAttempts - record.attempts.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Resets the rate limit counter for a key upon successful action (e.g. valid login).
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}
