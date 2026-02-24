/* ------------------------------------------------------------------ */
/*  Redis-based Rate Limiter — sliding window per userId              */
/*  Used in LINE/Facebook webhooks to prevent message flooding         */
/*                                                                     */
/*  Strategy: fixed-window counter in Redis with INCR + EXPIRE        */
/*  Key: rl:{businessId}:{userId}:{windowMinute}                      */
/*  TTL: 2 * window size (auto-cleanup)                               */
/* ------------------------------------------------------------------ */

// Reuse the shared Redis singleton from chatStore instead of creating
// a second connection pool. Both modules write to the same REDIS_URL
// so sharing one client saves connection slots on Vercel.
function getRedis() {
  const g = globalThis as unknown as { __redis?: import("ioredis").default | null };
  return g.__redis ?? null;
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
  const redis = getRedis();
  if (!redis) return false; // fail open: no redis → allow

  try {
    const window = Math.floor(Date.now() / (windowSec * 1000));
    const key = `rl:${businessId}:${userId}:${window}`;

    // Atomic INCR + EXPIRE via Lua to prevent permanent lockout if process
    // crashes between the two commands (race condition fix)
    const LUA_INCR_EXPIRE = `
      local count = redis.call('INCR', KEYS[1])
      if count == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1])) end
      return count
    `;
    const count = await redis.eval(LUA_INCR_EXPIRE, 1, key, String(windowSec * 2)) as number;
    return count > maxMessages;
  } catch (err) {
    console.error("[rateLimit] isUserRateLimited Redis error:", err);
    return false; // fail open on Redis error
  }
}

/**
 * Idempotency guard for LINE replyTokens.
 * LINE may retry webhooks — this prevents processing the same event twice.
 * Returns true if the token was ALREADY processed (skip it).
 * Returns false if this is the FIRST time we see this token (process it).
 *
 * Key is namespaced by businessId so auditing/cleanup is scoped per BU.
 * TTL = 5 minutes (LINE replyToken expires in 1 minute, so 5 min is safe)
 */
export async function isReplyTokenProcessed(businessId: string, replyToken: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false; // fail open: no redis → allow processing
  try {
    // SET key 1 NX EX 300 — returns "OK" if set (first time), null if already exists
    const result = await redis.set(`rtok:${businessId}:${replyToken}`, "1", "EX", 300, "NX");
    return result === null; // null = key already existed = already processed
  } catch (err) {
    console.error("[rateLimit] isReplyTokenProcessed Redis error:", err);
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
  const redis = getRedis();
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
