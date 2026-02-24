import { NextRequest, NextResponse } from "next/server";
import { chatStore, type LineChannelSettings } from "@/lib/chatStore";
import { getBusinessConfig } from "@/lib/businessUnits";
import { requireAdminSession } from "@/lib/auth";

export const runtime = "nodejs";

/* ------------------------------------------------------------------ */
/*  GET /api/line/settings/[businessId]                               */
/*  Returns current LINE channel settings from Redis.                  */
/*  Falls back to sensible defaults derived from businessConfig if    */
/*  no settings have been saved yet.                                  */
/* ------------------------------------------------------------------ */

type RouteContext = { params: Promise<{ businessId: string }> };

function defaultSettings(businessId: string): LineChannelSettings {
  const biz = getBusinessConfig(businessId);
  return {
    welcomeMessage:
      biz.id === "evlifethailand"
        ? "สวัสดีครับ! ยินดีต้อนรับสู่ EV Life Thailand\nสอบถามเรื่องแบตเตอรี่ LiFePO4 หรือมอเตอร์ไซค์ไฟฟ้า EM ได้เลยครับ"
        : biz.id === "dji13support"
        ? "สวัสดีครับ! ยินดีต้อนรับสู่ Support @ DJI 13 Store\nแจ้งปัญหาโดรน DJI ได้เลยครับ — ซ่อม เคลม Flyaway เปียกน้ำ ทุกเรื่องครับ"
        : `สวัสดีครับ! ยินดีต้อนรับสู่ ${biz.name}\nพิมพ์สอบถามได้เลยครับ`,
    autoReply: true,
    responseDelaySec: 5,
    richMenuEnabled: false,
    richMenuId: "",
    useReplyApi: true,
    businessHours: {
      enabled: false,
      timezone: "Asia/Bangkok",
      schedule: [
        { day: "Monday",    open: "09:00", close: "18:00", active: true },
        { day: "Tuesday",   open: "09:00", close: "18:00", active: true },
        { day: "Wednesday", open: "09:00", close: "18:00", active: true },
        { day: "Thursday",  open: "09:00", close: "18:00", active: true },
        { day: "Friday",    open: "09:00", close: "18:00", active: true },
        { day: "Saturday",  open: "10:00", close: "16:00", active: false },
        { day: "Sunday",    open: "10:00", close: "16:00", active: false },
      ],
    },
  };
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  try {
    const biz = getBusinessConfig(businessId);
    const saved = await chatStore.getLineSettings(businessId);
    const settings = saved ?? defaultSettings(businessId);
    // Include vision status from Redis (falls back to config default)
    const visionEnabled = await chatStore.isVisionEnabled(businessId, biz.features.visionEnabled);
    return NextResponse.json({ businessId, settings, visionEnabled });
  } catch (err) {
    console.error("[line/settings] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PUT /api/line/settings/[businessId]                               */
/*  Saves LINE channel settings to Redis.                             */
/*  Body: Partial<LineChannelSettings> — merged with defaults.        */
/* ------------------------------------------------------------------ */

export async function PUT(req: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  let body: Partial<LineChannelSettings>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    // Merge with existing (or defaults) to avoid partial overwrites
    const existing = (await chatStore.getLineSettings(businessId)) ?? defaultSettings(businessId);
    const merged: LineChannelSettings = {
      ...existing,
      ...body,
      // Nested object — merge businessHours carefully
      businessHours: body.businessHours
        ? { ...existing.businessHours, ...body.businessHours }
        : existing.businessHours,
    };

    await chatStore.setLineSettings(businessId, merged);

    // If autoReply changed, sync with the global bot toggle in Redis
    if (typeof body.autoReply === "boolean") {
      await chatStore.setGlobalBotEnabled(businessId, body.autoReply);
    }

    return NextResponse.json({ ok: true, businessId, settings: merged });
  } catch (err) {
    console.error("[line/settings] PUT error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/line/settings/[businessId]                             */
/*  Toggle vision (image/file AI analysis) on or off at runtime.      */
/*  Body: { visionEnabled: boolean }                                   */
/* ------------------------------------------------------------------ */

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const session = await requireAdminSession(req, businessId);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { visionEnabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.visionEnabled !== "boolean") {
    return NextResponse.json({ error: "visionEnabled (boolean) is required" }, { status: 400 });
  }

  try {
    await chatStore.setVisionEnabled(businessId, body.visionEnabled);
    return NextResponse.json({ ok: true, businessId, visionEnabled: body.visionEnabled });
  } catch (err) {
    console.error("[line/settings] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update vision setting" }, { status: 500 });
  }
}
