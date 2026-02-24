/* ------------------------------------------------------------------ */
/*  Support @ DJI 13 Store — Channel Configuration                    */
/* ------------------------------------------------------------------ */

import type { ChannelInfo, ChannelType, ChannelCommonSettings } from "@/lib/channels";

export type { ChannelType };

const DEFAULT_SCHEDULE = [
  { day: "Monday",    open: "09:00", close: "18:00", active: true },
  { day: "Tuesday",   open: "09:00", close: "18:00", active: true },
  { day: "Wednesday", open: "09:00", close: "18:00", active: true },
  { day: "Thursday",  open: "09:00", close: "18:00", active: true },
  { day: "Friday",    open: "09:00", close: "18:00", active: true },
  { day: "Saturday",  open: "09:00", close: "16:00", active: true },
  { day: "Sunday",    open: "10:00", close: "16:00", active: false },
];

function defaultCommon(): ChannelCommonSettings {
  return {
    welcomeMessage: "สวัสดีครับ! ยินดีต้อนรับสู่ Support @ DJI 13 Store\nสอบถามเรื่องซ่อม เคลม DJI Care Refresh หรือปัญหาโดรน DJI ได้เลยครับ",
    autoReply: true,
    responseDelaySec: 0,
    businessHours: {
      enabled: false,
      timezone: "Asia/Bangkok",
      schedule: DEFAULT_SCHEDULE.map((s) => ({ ...s })),
    },
  };
}

export const channels: ChannelInfo[] = [
  {
    type: "WEB_EMBED",
    enabled: false,
    name: "Web Channel — DJI 13 Service",
    common: defaultCommon(),
    web: {
      channelId: "dji13support-001",
      scriptKey: "script_dji13support",
      demoSitePath: "/embed/dji13support-001",
      widgetPosition: "bottom-right",
      primaryColor: "#ef4444",
      bubbleIcon: "headset",
      autoOpenDelaySec: 3,
      showOnMobile: true,
      allowedDomains: [],
    },
  },
  {
    type: "FACEBOOK",
    enabled: true,
    name: "DJI 13 Store",
    common: defaultCommon(),
    facebook: {
      pageId: "",
      pageUrl: "https://facebook.com/dji13store",
      pageAccessToken: "",
      verifyToken: "",
      persistentMenu: true,
      iceBreakers: ["ส่งซ่อมโดรน DJI", "เคลม DJI Care Refresh", "ราคาซ่อม / อะไหล่"],
      getStartedPayload: "GET_STARTED",
    },
  },
  {
    type: "LINE",
    enabled: true,
    name: "Support @ DJI 13 Store",
    common: {
      ...defaultCommon(),
      welcomeMessage: "สวัสดีครับ! ยินดีต้อนรับสู่ Support @ DJI 13 Store\nแจ้งปัญหาโดรน DJI ได้เลยครับ — ซ่อม เคลม Flyaway เปียกน้ำ ทุกเรื่องครับ",
    },
    line: {
      channelId: "",
      channelSecret: "",
      accessToken: "",
      richMenuEnabled: true,
      richMenuId: "",
      webhookUrl: "/api/line/webhook?businessId=dji13support",
      useReplyApi: true,
    },
  },
];

export function getChannel(type: ChannelType): ChannelInfo | undefined {
  return channels.find((c) => c.type === type);
}

/* ------------------------------------------------------------------ */
/*  Business Hours Check                                              */
/* ------------------------------------------------------------------ */

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Check if current Bangkok time is within Support @ DJI 13 Store business hours.
 * Mon–Fri 09:00–18:00, Sat 09:00–16:00, Sun closed.
 */
export function isWithinBusinessHours(): boolean {
  const bkk = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const dayName = DAY_NAMES[bkk.getDay()];
  const hhmm = bkk.getHours() * 60 + bkk.getMinutes();

  const schedule = DEFAULT_SCHEDULE.find((s) => s.day === dayName);
  if (!schedule || !schedule.active) return false;

  const [openH, openM] = schedule.open.split(":").map(Number);
  const [closeH, closeM] = schedule.close.split(":").map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  return hhmm >= openMin && hhmm < closeMin;
}

/**
 * Build the off-hours message shown to customers of Support @ DJI 13 Store.
 */
export function buildOffHoursMessage(): string {
  const bkk = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const hh = String(bkk.getHours()).padStart(2, "0");
  const mm = String(bkk.getMinutes()).padStart(2, "0");

  return (
    `ขณะนี้เวลา ${hh}:${mm} น. อยู่นอกเวลาทำการครับ\n\n` +
    `⏰ **เวลาทำการ**: จันทร์–ศุกร์ 09:00–18:00 น. | เสาร์ 09:00–16:00 น. | อาทิตย์ปิดครับ\n\n` +
    `ทิ้งข้อความไว้ได้เลยครับ ทีมงานจะตอบกลับทันทีเมื่อเปิดทำการ\n\n` +
    `📱 **LINE**: @dji13support\n` +
    `📞 **โทร**: 065-694-6155`
  );
}
