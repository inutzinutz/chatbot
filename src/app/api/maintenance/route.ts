import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, unauthorizedResponse } from "@/lib/auth";
import Redis from "ioredis";

export const runtime = "nodejs";
export const maxDuration = 60;

/* ------------------------------------------------------------------ */
/*  Maintenance API — Redis memory management                          */
/*  POST /api/maintenance  { action, businessId }                     */
/*                                                                     */
/*  Actions:                                                           */
/*    "ttl-convs"   — expire conv keys inactive > 90 days            */
/*    "trim-logs"   — trim adminlog to last 2000 entries              */
/*    "stats"       — return Redis memory info                        */
/* ------------------------------------------------------------------ */

const g = globalThis as unknown as { __redis_maint?: Redis };
if (!g.__redis_maint) {
  const url = process.env.REDIS_URL;
  if (url) {
    g.__redis_maint = new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      retryStrategy: (t) => (t > 3 ? null : Math.min(t * 200, 1000)),
    });
  }
}
const redis = g.__redis_maint!;

/** 90-day TTL for inactive conversations (in seconds) */
const CONV_TTL_SEC = 90 * 24 * 60 * 60;
/** Keep last 2000 admin log entries */
const ADMINLOG_MAX = 2000;
/** 500 messages per conversation (already enforced by LTRIM in addMessage) */

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const businessId = body.businessId as string;
  const action = body.action as string;

  if (!businessId || !action) {
    return NextResponse.json({ error: "Missing businessId or action" }, { status: 400 });
  }

  const session = await requireAdminSession(req, businessId);
  if (!session) return unauthorizedResponse();

  if (action === "stats") {
    // Return Redis memory info
    const info = await redis.info("memory");
    const lines = info.split("\r\n");
    const stats: Record<string, string> = {};
    for (const line of lines) {
      if (line.startsWith("#") || !line.includes(":")) continue;
      const [k, v] = line.split(":");
      stats[k.trim()] = v.trim();
    }
    return NextResponse.json({
      usedMemoryHuman: stats["used_memory_human"],
      maxMemoryHuman: stats["maxmemory_human"],
      usedMemoryPeakHuman: stats["used_memory_peak_human"],
      memFragmentationRatio: stats["mem_fragmentation_ratio"],
    });
  }

  if (action === "ttl-convs") {
    // Set EXPIRE on all inactive conv keys (> 90 days since last message)
    const convsKey = `convs:${businessId}`;
    const cutoffTs = Date.now() - 90 * 24 * 60 * 60 * 1000;

    // Get all userIds with score (timestamp) below cutoff
    const oldUserIds = await redis.zrangebyscore(convsKey, 0, cutoffTs);
    let expired = 0;

    const pipeline = redis.pipeline();
    for (const uid of oldUserIds) {
      pipeline.expire(`conv:${businessId}:${uid}`, CONV_TTL_SEC);
      pipeline.expire(`msgs:${businessId}:${uid}`, CONV_TTL_SEC);
      expired++;
    }

    // Also set TTL on very recent keys that don't have one yet (idempotent)
    // The EXPIRE refreshes: active convs will be re-set before they expire
    await pipeline.exec();

    // Trim admin log
    await redis.zremrangebyrank(`adminlog:${businessId}`, 0, -(ADMINLOG_MAX + 1));

    return NextResponse.json({
      success: true,
      expiredConvKeys: expired,
      adminLogTrimmed: true,
      message: `Expired ${expired} inactive conv key pairs (>90d). Admin log trimmed to ${ADMINLOG_MAX}.`,
    });
  }

  if (action === "trim-logs") {
    const before = await redis.zcard(`adminlog:${businessId}`);
    await redis.zremrangebyrank(`adminlog:${businessId}`, 0, -(ADMINLOG_MAX + 1));
    const after = await redis.zcard(`adminlog:${businessId}`);
    return NextResponse.json({
      success: true,
      before,
      after,
      removed: before - after,
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  const session = await requireAdminSession(req, businessId);
  if (!session) return unauthorizedResponse();

  // Return quick stats
  const convsKey = `convs:${businessId}`;
  const totalConvs = await redis.zcard(convsKey);
  const adminLogCount = await redis.zcard(`adminlog:${businessId}`);
  const info = await redis.info("memory").catch(() => "");
  const memMatch = info.match(/used_memory_human:(\S+)/);
  return NextResponse.json({
    totalConversations: totalConvs,
    adminLogEntries: adminLogCount,
    redisMemory: memMatch?.[1] ?? "unknown",
  });
}
