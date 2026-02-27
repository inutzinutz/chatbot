/* ------------------------------------------------------------------ */
/*  POST /api/learn/backfill                                            */
/*                                                                      */
/*  One-shot backfill: reads ALL existing chat history for a business   */
/*  from Redis (msgs:{biz}:{userId}), pairs each customer message with  */
/*  the bot reply that immediately follows it, then creates QALogEntry  */
/*  records so admins can review historical conversations.              */
/*                                                                      */
/*  Already-backfilled entries are skipped (idempotent via a Redis flag)*/
/*                                                                      */
/*  Auth: internal-secret header OR valid admin session cookie          */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import { learnedStore } from "@/lib/learnedStore";
import { requireAdminSession, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? "chatbot-internal";

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const g = globalThis as unknown as { __redis?: Redis | null };
  if (!("__redis" in g)) {
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
    });
    client.on("error", (e) => console.error("[backfill] Redis:", e.message));
    g.__redis = client;
  }
  return g.__redis ?? null;
}

interface StoredMessage {
  id: string;
  role: "customer" | "bot" | "admin";
  content: string;
  timestamp: number;
  pipelineLayer?: number;
  pipelineLayerName?: string;
}

export async function POST(req: NextRequest) {
  // Auth: either internal secret or admin session
  const secret = req.headers.get("x-internal-secret");
  if (secret !== INTERNAL_SECRET) {
    const session = await requireAdminSession(req, "");
    if (!session) return unauthorizedResponse();
  }

  let body: { businessId: string; dryRun?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { businessId, dryRun = false } = body;
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ error: "Redis not available" }, { status: 503 });
  }

  // Idempotency flag — skip if already backfilled (unless forced)
  const backfillFlag = `qabackfill:${businessId}`;
  const alreadyDone = await redis.get(backfillFlag);
  if (alreadyDone && !dryRun) {
    const count = parseInt(alreadyDone);
    return NextResponse.json({
      skipped: true,
      reason: "Already backfilled",
      previousCount: count,
      tip: "Send { dryRun: true } to preview without writing, or delete the flag key to re-run.",
    });
  }

  // Step 1: Get all userIds for this business
  const userIds = await redis.zrange(`convs:${businessId}`, 0, -1);
  if (!userIds.length) {
    return NextResponse.json({ backfilled: 0, users: 0, message: "No conversations found" });
  }

  let totalPairs = 0;
  let totalSkipped = 0;
  const userResults: { userId: string; pairs: number }[] = [];

  // Step 2: For each user, fetch messages and pair customer→bot
  for (const userId of userIds) {
    const rawMsgs = await redis.lrange(`msgs:${businessId}:${userId}`, 0, -1);
    if (!rawMsgs.length) continue;

    // lrange returns newest-first (lpush), so reverse to get chronological order
    const messages: StoredMessage[] = rawMsgs
      .map((r) => { try { return JSON.parse(r) as StoredMessage; } catch { return null; } })
      .filter((m): m is StoredMessage => m !== null)
      .reverse(); // oldest first

    let pairs = 0;

    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      const next = messages[i + 1];

      // Look for customer message followed immediately by bot reply
      if (msg.role !== "customer") continue;
      if (next.role !== "bot") continue;

      // Skip very short bot replies (system messages, escalation notices)
      if (next.content.length < 10) continue;
      // Skip system-tagged admin messages accidentally stored as bot
      if (next.content.startsWith("[ระบบ]")) continue;

      const layer = next.pipelineLayer !== undefined
        ? `L${next.pipelineLayer} ${next.pipelineLayerName ?? ""}`.trim()
        : "historical";

      if (!dryRun) {
        await learnedStore.logQA({
          businessId,
          userId,
          userQuestion: msg.content.slice(0, 300),
          botAnswer: next.content.slice(0, 1000),
          layer,
          timestamp: msg.timestamp,
        });
      }

      pairs++;
      totalPairs++;
    }

    if (pairs > 0) {
      userResults.push({ userId, pairs });
    } else {
      totalSkipped++;
    }
  }

  // Step 3: Set idempotency flag (30 days TTL)
  if (!dryRun && totalPairs > 0) {
    await redis.set(backfillFlag, String(totalPairs), "EX", 30 * 24 * 60 * 60);
  }

  console.log(
    `[backfill] ${businessId} dryRun=${dryRun} users=${userIds.length} pairs=${totalPairs} skippedUsers=${totalSkipped}`,
  );

  return NextResponse.json({
    dryRun,
    businessId,
    usersTotal: userIds.length,
    usersWithPairs: userResults.length,
    usersSkipped: totalSkipped,
    backfilled: totalPairs,
    sample: userResults.slice(0, 10),
    message: dryRun
      ? `Dry run: would backfill ${totalPairs} Q&A pairs from ${userResults.length} users`
      : `Backfilled ${totalPairs} Q&A pairs from ${userResults.length} users`,
  });
}

// GET: check backfill status
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== INTERNAL_SECRET) {
    const session = await requireAdminSession(req, "");
    if (!session) return unauthorizedResponse();
  }

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });

  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Redis not available" }, { status: 503 });

  const flag = await redis.get(`qabackfill:${businessId}`);
  const qaCount = await redis.zcard(`qalog:${businessId}`);

  return NextResponse.json({
    businessId,
    backfillDone: !!flag,
    backfilledCount: flag ? parseInt(flag) : 0,
    currentQALogSize: qaCount,
  });
}
