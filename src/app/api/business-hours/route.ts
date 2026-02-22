/* ------------------------------------------------------------------ */
/*  Business Hours API — Node.js runtime                               */
/*  GET  /api/business-hours?businessId=xxx  → return current config  */
/*  PUT  /api/business-hours                 → save config to Redis    */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";
import { requireAdminSession, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BusinessHoursSchedule {
  day: string;
  open: string;   // "HH:MM"
  close: string;  // "HH:MM"
  active: boolean;
}

export interface BusinessHoursConfig {
  enabled: boolean;
  timezone: string;
  offHoursMessage: string;  // message injected into system prompt when outside hours
  schedule: BusinessHoursSchedule[];
}

/* ------------------------------------------------------------------ */
/*  Default config (09:00–18:00 every day)                            */
/* ------------------------------------------------------------------ */

export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  enabled: true,
  timezone: "Asia/Bangkok",
  offHoursMessage:
    "ขณะนี้อยู่นอกเวลาทำการ (09:00–18:00 น.) หากลูกค้าต้องการติดต่อทีมงานโดยตรง ให้แจ้งว่าทีมงานจะติดต่อกลับในวันทำการถัดไป แต่คุณยังสามารถช่วยตอบคำถามทั่วไปได้ตามปกติครับ",
  schedule: [
    { day: "Sunday", open: "09:00", close: "18:00", active: true },
    { day: "Monday", open: "09:00", close: "18:00", active: true },
    { day: "Tuesday", open: "09:00", close: "18:00", active: true },
    { day: "Wednesday", open: "09:00", close: "18:00", active: true },
    { day: "Thursday", open: "09:00", close: "18:00", active: true },
    { day: "Friday", open: "09:00", close: "18:00", active: true },
    { day: "Saturday", open: "09:00", close: "18:00", active: true },
  ],
};

/* ------------------------------------------------------------------ */
/*  Redis helpers via chatStore's underlying redis (re-export pattern) */
/* ------------------------------------------------------------------ */

const REDIS_KEY = (businessId: string) => `bizhours:${businessId}`;

/**
 * Get business hours config from Redis, falling back to defaults.
 * Exported for use in pipeline.ts and other server-side code.
 */
export async function getBusinessHours(
  businessId: string
): Promise<BusinessHoursConfig> {
  try {
    // Access Redis via chatStore's private redis client using the same global singleton
    const g = globalThis as unknown as { __redis?: import("ioredis").default };
    if (!g.__redis) return DEFAULT_BUSINESS_HOURS;
    const raw = await g.__redis.get(REDIS_KEY(businessId));
    if (!raw) return DEFAULT_BUSINESS_HOURS;
    return JSON.parse(raw) as BusinessHoursConfig;
  } catch {
    return DEFAULT_BUSINESS_HOURS;
  }
}

/**
 * Check if current time is within business hours.
 * Returns { isOpen: boolean, dayName: string, currentTime: string }
 */
export function checkBusinessHours(config: BusinessHoursConfig): {
  isOpen: boolean;
  dayName: string;
  currentTime: string;
  openTime: string;
  closeTime: string;
} {
  if (!config.enabled) {
    return { isOpen: true, dayName: "", currentTime: "", openTime: "09:00", closeTime: "18:00" };
  }

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const dayName = parts.find((p) => p.type === "weekday")?.value || "";
  const hour = parts.find((p) => p.type === "hour")?.value || "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  const currentTime = `${hour}:${minute}`;

  const todaySchedule = config.schedule.find(
    (s) => s.day.toLowerCase() === dayName.toLowerCase()
  );

  if (!todaySchedule || !todaySchedule.active) {
    return {
      isOpen: false,
      dayName,
      currentTime,
      openTime: "09:00",
      closeTime: "18:00",
    };
  }

  const isOpen = currentTime >= todaySchedule.open && currentTime < todaySchedule.close;

  return {
    isOpen,
    dayName,
    currentTime,
    openTime: todaySchedule.open,
    closeTime: todaySchedule.close,
  };
}

/* ------------------------------------------------------------------ */
/*  GET handler                                                        */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId") || "dji13store";

  // Auth guard
  const session = await requireAdminSession(req, businessId);
  if (!session) return unauthorizedResponse();

  try {
    const config = await getBusinessHours(businessId);
    const status = checkBusinessHours(config);

    return NextResponse.json({
      config,
      status,
    });
  } catch (err) {
    console.error("[business-hours] GET error:", err);
    return NextResponse.json(
      { error: "Failed to load business hours" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  PUT handler                                                        */
/* ------------------------------------------------------------------ */

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as {
      businessId: string;
      config: BusinessHoursConfig;
    };

    const { businessId, config } = body;
    if (!businessId || !config) {
      return NextResponse.json({ error: "Missing businessId or config" }, { status: 400 });
    }

    // Auth guard
    const session = await requireAdminSession(req, businessId);
    if (!session) return unauthorizedResponse();

    const g = globalThis as unknown as { __redis?: import("ioredis").default };
    if (!g.__redis) {
      return NextResponse.json({ error: "Redis not available" }, { status: 503 });
    }

    await g.__redis.set(REDIS_KEY(businessId), JSON.stringify(config));

    const status = checkBusinessHours(config);
    return NextResponse.json({ ok: true, config, status });
  } catch (err) {
    console.error("[business-hours] PUT error:", err);
    return NextResponse.json(
      { error: "Failed to save business hours" },
      { status: 500 }
    );
  }
}
