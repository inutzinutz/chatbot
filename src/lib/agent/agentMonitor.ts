/* ------------------------------------------------------------------ */
/*  Agent Monitor — stores agent activity signals for admin UI         */
/*                                                                      */
/*  When the agent flags a conversation (urgency: high/medium),        */
/*  this module writes a lightweight record to Redis so the admin      */
/*  dashboard can show a badge / alert.                                */
/* ------------------------------------------------------------------ */

import Redis from "ioredis";

export interface AgentFlag {
  conversationId: string;
  businessId: string;
  reason: string;
  urgency: "low" | "medium" | "high";
  userMessage: string;
  timestamp: string;
}

const FLAG_KEY_PREFIX = "agent:flags:";
const FLAG_LIST_KEY = "agent:flags:list";
const FLAG_TTL_SECONDS = 60 * 60 * 24 * 3; // 3 days

// ── Redis singleton (reuses chatStore's global instance if available) ──

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const g = globalThis as unknown as { __redis?: Redis };
  if (!g.__redis) {
    g.__redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      connectTimeout: 3000,
      retryStrategy(times) {
        if (times > 2) return null;
        return Math.min(times * 200, 500);
      },
    });
    g.__redis.on("error", (err) => {
      console.error("[agentMonitor] Redis error:", err.message);
    });
  }
  return g.__redis;
}

// ── Write a flag ──

export async function writeAgentFlag(flag: AgentFlag): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;

    const key = `${FLAG_KEY_PREFIX}${flag.businessId}:${flag.conversationId}`;
    await redis.set(key, JSON.stringify(flag), "EX", FLAG_TTL_SECONDS);

    // Maintain a sorted list of recent flags per business
    const listKey = `${FLAG_LIST_KEY}:${flag.businessId}`;
    await redis.lpush(listKey, key);
    await redis.ltrim(listKey, 0, 99); // keep last 100
    await redis.expire(listKey, FLAG_TTL_SECONDS);
  } catch {
    // Non-critical — don't throw if Redis is unavailable
  }
}

// ── Read recent flags for a business ──

export async function getAgentFlags(
  businessId: string,
  limit = 20
): Promise<AgentFlag[]> {
  try {
    const redis = getRedis();
    if (!redis) return [];

    const listKey = `${FLAG_LIST_KEY}:${businessId}`;
    const keys = await redis.lrange(listKey, 0, limit - 1);
    if (!keys || keys.length === 0) return [];

    const pipeline = redis.pipeline();
    for (const key of keys) pipeline.get(key);
    const results = await pipeline.exec();

    return (results || [])
      .map(([, val]) => {
        if (!val || typeof val !== "string") return null;
        try { return JSON.parse(val) as AgentFlag; } catch { return null; }
      })
      .filter((f): f is AgentFlag => f !== null);
  } catch {
    return [];
  }
}

// ── Count unread high-urgency flags ──

export async function countHighUrgencyFlags(businessId: string): Promise<number> {
  const flags = await getAgentFlags(businessId, 50);
  return flags.filter((f) => f.urgency === "high").length;
}
