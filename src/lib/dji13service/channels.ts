/* ------------------------------------------------------------------ */
/*  DJI 13 Service Plus — Channel Configuration                       */
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
    welcomeMessage: "สวัสดีครับ! ยินดีต้อนรับสู่ DJI 13 Service Plus\nสอบถามเรื่องซ่อม เคลม DJI Care Refresh หรือปัญหาโดรน DJI ได้เลยครับ",
    autoReply: true,
    responseDelaySec: 0,
    businessHours: {
      enabled: false,
      timezone: "Asia/Bangkok",
      schedule: DEFAULT_SCHEDULE.map((s) => ({ ...s })),
    },
    offlineMessage: "ขณะนี้อยู่นอกเวลาทำการ จะตอบกลับโดยเร็วที่สุดครับ",
  };
}

export const channels: ChannelInfo[] = [
  {
    type: "WEB_EMBED",
    enabled: false,
    name: "Web Channel — DJI 13 Service",
    common: defaultCommon(),
    web: {
      channelId: "dji13service-001",
      scriptKey: "script_dji13service",
      demoSitePath: "/embed/dji13service-001",
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
    name: "DJI 13 Service Plus",
    common: {
      ...defaultCommon(),
      welcomeMessage: "สวัสดีครับ! ยินดีต้อนรับสู่ DJI 13 Service Plus\nแจ้งปัญหาโดรน DJI ได้เลยครับ — ซ่อม เคลม Flyaway เปียกน้ำ ทุกเรื่องครับ",
    },
    line: {
      channelId: "",
      channelSecret: "",
      accessToken: "",
      richMenuEnabled: true,
      richMenuId: "",
      webhookUrl: "/api/line/webhook/dji13service",
      useReplyApi: true,
    },
  },
];

export function getChannel(type: ChannelType): ChannelInfo | undefined {
  return channels.find((c) => c.type === type);
}
