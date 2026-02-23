/* ------------------------------------------------------------------ */
/*  Facebook Settings API — Node.js runtime                            */
/*  GET  /api/facebook/settings/[businessId]  → return current config  */
/*  PUT  /api/facebook/settings/[businessId]  → save config to Redis   */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ businessId: string }> };

export interface FacebookChannelSettings {
  pageId: string;
  pageUrl: string;
  pageAccessToken: string;
  verifyToken: string;
  persistentMenu: boolean;
  iceBreakers: string[];
  getStartedPayload: string;
  autoReply: boolean;
  welcomeMessage: string;
}

function defaultSettings(businessId: string): FacebookChannelSettings {
  const welcomes: Record<string, string> = {
    evlifethailand: "สวัสดีครับ! ยินดีต้อนรับสู่ EV Life Thailand\nสอบถามเรื่องแบตเตอรี่ LiFePO4 หรือมอเตอร์ไซค์ไฟฟ้า EM ได้เลยครับ",
    dji13support: "สวัสดีครับ! ยินดีต้อนรับสู่ Support @ DJI 13 Store\nแจ้งปัญหาโดรน DJI ได้เลยครับ",
    dji13store: "สวัสดีครับ! ยินดีต้อนรับสู่ DJI 13 STORE\nสอบถามเรื่องโดรน DJI ได้เลยครับ",
  };
  return {
    pageId: "",
    pageUrl: "",
    pageAccessToken: "",
    verifyToken: "",
    persistentMenu: true,
    iceBreakers: [],
    getStartedPayload: "GET_STARTED",
    autoReply: true,
    welcomeMessage: welcomes[businessId] ?? "สวัสดีครับ! พิมพ์สอบถามได้เลยครับ",
  };
}

const redisKey = (businessId: string) => `fbsettings:${businessId}`;

async function getRedis() {
  const g = globalThis as unknown as { __redis?: import("ioredis").default };
  if (g.__redis) return g.__redis;

  const url = process.env.REDIS_URL || process.env.KV_URL || "";
  if (!url) return null;

  try {
    const Redis = (await import("ioredis")).default;
    const client = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 2, connectTimeout: 5000 });
    client.on("error", () => {});
    g.__redis = client;
    return client;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  GET                                                                */
/* ------------------------------------------------------------------ */

export async function GET(_req: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;
  const redis = await getRedis();
  if (!redis) return NextResponse.json(defaultSettings(businessId));

  try {
    const raw = await redis.get(redisKey(businessId));
    const settings: FacebookChannelSettings = raw
      ? { ...defaultSettings(businessId), ...JSON.parse(raw) }
      : defaultSettings(businessId);
    // Never expose tokens in response — mask them
    return NextResponse.json({
      ...settings,
      pageAccessToken: settings.pageAccessToken ? "••••••••" : "",
      verifyToken: settings.verifyToken ? "••••••••" : "",
      _hasPageAccessToken: !!settings.pageAccessToken,
      _hasVerifyToken: !!settings.verifyToken,
    });
  } catch {
    return NextResponse.json(defaultSettings(businessId));
  }
}

/* ------------------------------------------------------------------ */
/*  PUT                                                                */
/* ------------------------------------------------------------------ */

export async function PUT(req: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;
  const redis = await getRedis();
  if (!redis) {
    return NextResponse.json({ error: "Redis not available" }, { status: 503 });
  }

  let body: Partial<FacebookChannelSettings>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const raw = await redis.get(redisKey(businessId));
    const existing: FacebookChannelSettings = raw
      ? { ...defaultSettings(businessId), ...JSON.parse(raw) }
      : defaultSettings(businessId);

    // If masked values sent back, keep existing real values
    const merged: FacebookChannelSettings = {
      ...existing,
      ...body,
      pageAccessToken:
        body.pageAccessToken && body.pageAccessToken !== "••••••••"
          ? body.pageAccessToken
          : existing.pageAccessToken,
      verifyToken:
        body.verifyToken && body.verifyToken !== "••••••••"
          ? body.verifyToken
          : existing.verifyToken,
    };

    await redis.set(redisKey(businessId), JSON.stringify(merged));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[fb/settings] PUT error:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
