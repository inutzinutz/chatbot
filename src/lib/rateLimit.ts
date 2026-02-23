/* ------------------------------------------------------------------ */
/*  Redis-based Rate Limiter — sliding window per userId              */
/*  Used in LINE/Facebook webhooks to prevent message flooding         */
/*                                                                     */
/*  Strategy: fixed-window counter in Redis with INCR + EXPIRE        */
/*  Key: rl:{businessId}:{userId}:{windowMinute}                      */
/*  TTL: 2 * window size (auto-cleanup)                               */
/* ------------------------------------------------------------------ */

import Redis from "ioredis";

const g = globalThis as unknown as { __redis_rl?: Redis };
if (!g.__redis_rl && process.env.REDIS_URL) {
  g.__redis_rl = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    connectTimeout: 3000,
    retryStrategy: (t) => (t > 2 ? null : Math.min(t * 100, 500)),
  });
  g.__redis_rl.on("error", () => {}); // suppress logs
}

/**
 * Check if userId is rate-limited.
 * @param businessId  — business namespace
 * @param userId      — LINE/FB/web userId
 * @param maxMessages — max messages per window (default: 20)
 * @param windowSec   — window size in seconds (default: 60)
 * @returns true if rate-limited (should reject), false if ok
 */
export async function isUserRateLimited(
  businessId: string,
  userId: string,
  maxMessages = 20,
  windowSec = 60
): Promise<boolean> {
  const redis = g.__redis_rl;
  if (!redis) return false; // fail open: no redis → allow

  try {
    const window = Math.floor(Date.now() / (windowSec * 1000));
    const key = `rl:${businessId}:${userId}:${window}`;

    const count = await redis.incr(key);
    if (count === 1) {
      // First message in this window: set TTL
      await redis.expire(key, windowSec * 2);
    }
    return count > maxMessages;
  } catch {
    return false; // fail open on Redis error
  }
}

/**
 * Get current message count for a userId in the current window.
 * Useful for returning rate limit headers.
 */
export async function getUserRateCount(
  businessId: string,
  userId: string,
  windowSec = 60
): Promise<number> {
  const redis = g.__redis_rl;
  if (!redis) return 0;
  try {
    const window = Math.floor(Date.now() / (windowSec * 1000));
    const key = `rl:${businessId}:${userId}:${window}`;
    const val = await redis.get(key);
    return val ? parseInt(val) : 0;
  } catch {
    return 0;
  }
}
