/* ------------------------------------------------------------------ */
/*  Token Tracker — Redis-backed AI token usage logging                 */
/*                                                                      */
/*  Captures every AI call's token usage and stores:                    */
/*    - Daily aggregate per BU per model (90-day TTL)                   */
/*    - Per-call log entries (30-day TTL)                               */
/*    - Running total per BU (all-time)                                 */
/*                                                                      */
/*  Redis schema:                                                        */
/*    token:daily:{businessId}:{YYYY-MM-DD}:{model}  → Hash            */
/*    token:log:{businessId}                          → Sorted set      */
/*    token:entry:{businessId}:{entryId}              → Hash            */
/*    token:total:{businessId}                        → Hash            */
/* ------------------------------------------------------------------ */

import Redis from "ioredis";
import { randomUUID } from "crypto";

// ── Pricing table (USD per 1M tokens) ──

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o":                 { input: 2.50,  output: 10.00 },
  "gpt-4o-mini":            { input: 0.15,  output: 0.60  },
  "claude-sonnet-4-20250514": { input: 3.00, output: 15.00 },
  "claude-opus-4-5":        { input: 15.00, output: 75.00 },
  "claude-haiku-4-5":       { input: 0.80,  output: 4.00  },
  // aliases / fallback
  "claude-sonnet":          { input: 3.00,  output: 15.00 },
  "claude-opus":            { input: 15.00, output: 75.00 },
  "claude-haiku":           { input: 0.80,  output: 4.00  },
};

export type CallSite =
  | "agent"
  | "vision_image"
  | "vision_pdf"
  | "chat_claude"
  | "chat_openai"
  | "line_claude"
  | "line_openai"
  | "line_vision_image"
  | "line_vision_pdf"
  | "fb_claude"
  | "fb_openai"
  | "fb_vision_image"
  | "monitoring_summary"
  | "crm_extract";

// ── Types ──

export interface TokenUsageParams {
  businessId: string;
  model: string;
  callSite: CallSite;
  promptTokens: number;
  completionTokens: number;
  /** Optional conversation/user id for per-conversation drill-down */
  conversationId?: string;
}

export interface TokenEntry {
  id: string;
  businessId: string;
  model: string;
  callSite: CallSite;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number;
  conversationId?: string;
  timestamp: number;
}

export interface TokenDailyStats {
  date: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  calls: number;
  costUSD: number;
}

export interface TokenTotals {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  calls: number;
  costUSD: number;
}

// ── Redis singleton (same pattern as chatStore) ──

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!global.__redis) {
    global.__redis = new Redis(url, { maxRetriesPerRequest: 3 });
  }
  return global.__redis;
}

// ── Cost calculation ──

export function calcCostUSD(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model] ?? { input: 0, output: 0 };
  const cost =
    (promptTokens / 1_000_000) * pricing.input +
    (completionTokens / 1_000_000) * pricing.output;
  return Math.round(cost * 1_000_000) / 1_000_000; // round to 6 decimal places
}

// ── Thai timezone date string ──

function toThaiDate(ts: number): string {
  return new Date(ts + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// ── Main logging function ──

export async function logTokenUsage(params: TokenUsageParams): Promise<void> {
  const redis = getRedis();
  if (!redis) return; // silently skip if Redis not configured

  const {
    businessId,
    model,
    callSite,
    promptTokens,
    completionTokens,
    conversationId,
  } = params;

  if (!businessId || !model || promptTokens + completionTokens === 0) return;

  const totalTokens = promptTokens + completionTokens;
  const costUSD = calcCostUSD(model, promptTokens, completionTokens);
  const now = Date.now();
  const date = toThaiDate(now);
  const entryId = randomUUID();

  try {
    const pipeline = redis.pipeline();

    // 1. Daily aggregate — per BU per model
    const dailyKey = `token:daily:${businessId}:${date}:${model}`;
    pipeline.hincrby(dailyKey, "promptTokens", promptTokens);
    pipeline.hincrby(dailyKey, "completionTokens", completionTokens);
    pipeline.hincrby(dailyKey, "totalTokens", totalTokens);
    pipeline.hincrby(dailyKey, "calls", 1);
    // costUSD stored as micro-dollars (integer) to avoid float precision issues
    pipeline.hincrby(dailyKey, "costUSDMicro", Math.round(costUSD * 1_000_000));
    pipeline.expire(dailyKey, 90 * 24 * 60 * 60); // 90 days TTL

    // 2. All-time running total per BU
    const totalKey = `token:total:${businessId}`;
    pipeline.hincrby(totalKey, "promptTokens", promptTokens);
    pipeline.hincrby(totalKey, "completionTokens", completionTokens);
    pipeline.hincrby(totalKey, "totalTokens", totalTokens);
    pipeline.hincrby(totalKey, "calls", 1);
    pipeline.hincrby(totalKey, "costUSDMicro", Math.round(costUSD * 1_000_000));

    // 3. Per-call log entry
    const entryKey = `token:entry:${businessId}:${entryId}`;
    const entryData: Record<string, string | number> = {
      id: entryId,
      businessId,
      model,
      callSite,
      promptTokens,
      completionTokens,
      totalTokens,
      costUSDMicro: Math.round(costUSD * 1_000_000),
      timestamp: now,
    };
    if (conversationId) entryData.conversationId = conversationId;
    pipeline.hset(entryKey, entryData);
    pipeline.expire(entryKey, 30 * 24 * 60 * 60); // 30 days TTL

    // 4. Log index — sorted set (score = timestamp for time-range queries)
    const logKey = `token:log:${businessId}`;
    pipeline.zadd(logKey, now, entryId);
    // Trim log to last 10,000 entries
    pipeline.zremrangebyrank(logKey, 0, -10001);

    await pipeline.exec();
  } catch (err) {
    // Non-fatal — never crash the main request
    console.error("[tokenTracker] logTokenUsage error:", err);
  }
}

// ── Query functions ──

/**
 * Get daily stats for a businessId within a date range.
 * Returns array of { date, model, ... } sorted by date desc.
 */
export async function getTokenDailyStats(
  businessId: string,
  days = 30
): Promise<TokenDailyStats[]> {
  const redis = getRedis();
  if (!redis) return [];

  const results: TokenDailyStats[] = [];
  const now = Date.now();

  // Scan for all matching daily keys
  const pattern = `token:daily:${businessId}:*`;
  let cursor = "0";
  const keys: string[] = [];
  do {
    const [nextCursor, found] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      200
    );
    cursor = nextCursor;
    keys.push(...found);
  } while (cursor !== "0");

  // Filter to requested date range
  const cutoffDate = toThaiDate(now - days * 24 * 60 * 60 * 1000);

  await Promise.all(
    keys.map(async (key) => {
      // key format: token:daily:{businessId}:{date}:{model}
      const parts = key.split(":");
      if (parts.length < 5) return;
      const date = parts[3];
      const model = parts.slice(4).join(":"); // model names may contain colons

      if (date < cutoffDate) return; // outside range

      const raw = await redis.hgetall(key);
      if (!raw || !raw.calls) return;

      results.push({
        date,
        model,
        promptTokens: parseInt(raw.promptTokens || "0"),
        completionTokens: parseInt(raw.completionTokens || "0"),
        totalTokens: parseInt(raw.totalTokens || "0"),
        calls: parseInt(raw.calls || "0"),
        costUSD: parseInt(raw.costUSDMicro || "0") / 1_000_000,
      });
    })
  );

  return results.sort((a, b) => b.date.localeCompare(a.date) || a.model.localeCompare(b.model));
}

/**
 * Get all-time totals per businessId.
 */
export async function getTokenTotals(businessId: string): Promise<TokenTotals> {
  const redis = getRedis();
  if (!redis) return { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0, costUSD: 0 };

  const raw = await redis.hgetall(`token:total:${businessId}`);
  if (!raw) return { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0, costUSD: 0 };

  return {
    promptTokens: parseInt(raw.promptTokens || "0"),
    completionTokens: parseInt(raw.completionTokens || "0"),
    totalTokens: parseInt(raw.totalTokens || "0"),
    calls: parseInt(raw.calls || "0"),
    costUSD: parseInt(raw.costUSDMicro || "0") / 1_000_000,
  };
}

/**
 * Get recent per-call log entries for a businessId.
 */
export async function getTokenLog(
  businessId: string,
  limit = 100
): Promise<TokenEntry[]> {
  const redis = getRedis();
  if (!redis) return [];

  // Get most recent entryIds from sorted set
  const logKey = `token:log:${businessId}`;
  const entryIds = await redis.zrevrange(logKey, 0, limit - 1);
  if (!entryIds.length) return [];

  const entries = await Promise.all(
    entryIds.map(async (id) => {
      const raw = await redis.hgetall(`token:entry:${businessId}:${id}`);
      if (!raw || !raw.model) return null;
      return {
        id: raw.id,
        businessId: raw.businessId,
        model: raw.model,
        callSite: raw.callSite as CallSite,
        promptTokens: parseInt(raw.promptTokens || "0"),
        completionTokens: parseInt(raw.completionTokens || "0"),
        totalTokens: parseInt(raw.totalTokens || "0"),
        costUSD: parseInt(raw.costUSDMicro || "0") / 1_000_000,
        conversationId: raw.conversationId,
        timestamp: parseInt(raw.timestamp || "0"),
      } as TokenEntry;
    })
  );

  return entries.filter((e): e is TokenEntry => e !== null);
}

/**
 * Aggregate daily stats by model (for the last N days).
 * Returns per-model totals sorted by costUSD desc.
 */
export async function getTokenStatsByModel(
  businessId: string,
  days = 30
): Promise<Array<{ model: string; promptTokens: number; completionTokens: number; totalTokens: number; calls: number; costUSD: number }>> {
  const daily = await getTokenDailyStats(businessId, days);
  const byModel: Record<string, { promptTokens: number; completionTokens: number; totalTokens: number; calls: number; costUSD: number }> = {};

  for (const row of daily) {
    if (!byModel[row.model]) {
      byModel[row.model] = { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0, costUSD: 0 };
    }
    byModel[row.model].promptTokens += row.promptTokens;
    byModel[row.model].completionTokens += row.completionTokens;
    byModel[row.model].totalTokens += row.totalTokens;
    byModel[row.model].calls += row.calls;
    byModel[row.model].costUSD += row.costUSD;
  }

  return Object.entries(byModel)
    .map(([model, stats]) => ({ model, ...stats }))
    .sort((a, b) => b.costUSD - a.costUSD);
}
