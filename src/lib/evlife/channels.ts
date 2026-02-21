/* ------------------------------------------------------------------ */
/*  Channel data model — detailed per-platform configuration          */
/* ------------------------------------------------------------------ */

export type ChannelType = "WEB_EMBED" | "FACEBOOK" | "LINE";

/* ---------- common settings shared by every channel ---------- */
export interface ChannelCommonSettings {
  welcomeMessage: string;
  autoReply: boolean;
  responseDelaySec: number;
  businessHours: {
    enabled: boolean;
    timezone: string;
    schedule: {
      day: string;
      open: string;   // "HH:mm"
      close: string;  // "HH:mm"
      active: boolean;
    }[];
  };
  offlineMessage: string;
}

/* ---------- per-platform settings ---------- */
export interface WebEmbedSettings {
  channelId: string;
  scriptKey: string;
  demoSitePath: string;
  widgetPosition: "bottom-right" | "bottom-left";
  primaryColor: string;
  bubbleIcon: "chat" | "headset" | "bot";
  autoOpenDelaySec: number;
  showOnMobile: boolean;
  allowedDomains: string[];  // empty = allow all
}

export interface FacebookSettings {
  pageId: string;
  pageUrl: string;
  pageAccessToken: string;   // masked in UI
  verifyToken: string;       // masked in UI
  persistentMenu: boolean;
  iceBreakers: string[];     // quick-start questions
  getStartedPayload: string;
}

export interface LineSettings {
  channelId: string;
  channelSecret: string;     // masked in UI
  accessToken: string;       // masked in UI
  richMenuEnabled: boolean;
  richMenuId: string;
  webhookUrl: string;
  useReplyApi: boolean;
}

/* ---------- unified channel type ---------- */
export interface ChannelInfo {
  type: ChannelType;
  enabled: boolean;
  name: string;
  common: ChannelCommonSettings;
  web?: WebEmbedSettings;
  facebook?: FacebookSettings;
  line?: LineSettings;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                          */
/* ------------------------------------------------------------------ */

// EV Life Thailand: จันทร์–อาทิตย์ 9:30–18:00 น.
const DEFAULT_SCHEDULE = [
  { day: "Monday",    open: "09:30", close: "18:00", active: true },
  { day: "Tuesday",   open: "09:30", close: "18:00", active: true },
  { day: "Wednesday", open: "09:30", close: "18:00", active: true },
  { day: "Thursday",  open: "09:30", close: "18:00", active: true },
  { day: "Friday",    open: "09:30", close: "18:00", active: true },
  { day: "Saturday",  open: "09:30", close: "18:00", active: true },
  { day: "Sunday",    open: "09:30", close: "18:00", active: true },
];

function defaultCommon(): ChannelCommonSettings {
  return {
    welcomeMessage: "สวัสดีครับ! ยินดีต้อนรับสู่ EV Life Thailand\nสอบถามเรื่องแบตเตอรี่ EV หรือมอเตอร์ไซค์ไฟฟ้า EM ได้เลยครับ",
    autoReply: true,
    responseDelaySec: 0,
    businessHours: {
      enabled: true,
      timezone: "Asia/Bangkok",
      schedule: DEFAULT_SCHEDULE.map((s) => ({ ...s })),
    },
    offlineMessage: "ขณะนี้อยู่นอกเวลาทำการครับ (เปิดทุกวัน 9:30–18:00 น.)\n\nทิ้งข้อความไว้ได้เลยครับ ทีมงานจะตอบกลับในเวลาทำการครับ\n\nติดต่อด่วน: LINE @evlifethailand",
  };
}

/* ------------------------------------------------------------------ */
/*  Channel instances                                                 */
/* ------------------------------------------------------------------ */

export const channels: ChannelInfo[] = [
  {
    type: "WEB_EMBED",
    enabled: false,
    name: "Web Channel",
    common: defaultCommon(),
    web: {
      channelId: "evlife-001",
      scriptKey: "script_evlifethailand",
      demoSitePath: "/embed/evlife-001",
      widgetPosition: "bottom-right",
      primaryColor: "#f97316",
      bubbleIcon: "chat",
      autoOpenDelaySec: 3,
      showOnMobile: true,
      allowedDomains: ["evlifethailand.co.th"],
    },
  },
  {
    type: "FACEBOOK",
    enabled: true,
    name: "EV Life Thailand",
    common: defaultCommon(),
    facebook: {
      pageId: "",
      pageUrl: "https://facebook.com/evlifethailand",
      pageAccessToken: "",
      verifyToken: "",
      persistentMenu: true,
      iceBreakers: ["แบตเตอรี่ EV มีรุ่นไหนบ้าง?", "ราคาเปลี่ยนแบต", "มอเตอร์ไซค์ไฟฟ้า EM"],
      getStartedPayload: "GET_STARTED",
    },
  },
  {
    type: "LINE",
    enabled: true,
    name: "EV Life Thailand",
    common: {
      ...defaultCommon(),
      welcomeMessage: "สวัสดีครับ! ยินดีต้อนรับสู่ EV Life Thailand\nสอบถามเรื่องแบตเตอรี่ LiFePO4 หรือมอเตอร์ไซค์ไฟฟ้า EM ได้เลยครับ",
    },
    line: {
      channelId: "",
      channelSecret: "",
      accessToken: "",
      richMenuEnabled: true,
      richMenuId: "",
      webhookUrl: "/api/line/webhook?businessId=evlifethailand",
      useReplyApi: true,
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

export function getChannel(type: ChannelType): ChannelInfo | undefined {
  return channels.find((c) => c.type === type);
}

/* ------------------------------------------------------------------ */
/*  Business Hours Check                                              */
/* ------------------------------------------------------------------ */

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Check if current Bangkok time is within EV Life Thailand business hours.
 * Returns true if open, false if closed / outside hours.
 */
export function isWithinBusinessHours(): boolean {
  const bkk = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const dayName = DAY_NAMES[bkk.getDay()];
  const hhmm = bkk.getHours() * 60 + bkk.getMinutes(); // current minutes-since-midnight

  const schedule = DEFAULT_SCHEDULE.find((s) => s.day === dayName);
  if (!schedule || !schedule.active) return false;

  const [openH, openM] = schedule.open.split(":").map(Number);
  const [closeH, closeM] = schedule.close.split(":").map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  return hhmm >= openMin && hhmm < closeMin;
}

/**
 * Build the off-hours message shown to customers.
 * Includes current Bangkok time + next opening time.
 */
export function buildOffHoursMessage(): string {
  const bkk = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const hh = String(bkk.getHours()).padStart(2, "0");
  const mm = String(bkk.getMinutes()).padStart(2, "0");

  return (
    `ขณะนี้เวลา ${hh}:${mm} น. อยู่นอกเวลาทำการครับ\n\n` +
    `⏰ **เวลาทำการ**: จันทร์–อาทิตย์ 9:30–18:00 น.\n\n` +
    `ทิ้งข้อความไว้ได้เลยครับ ทีมงานจะตอบกลับทันทีเมื่อเปิดทำการ\n` +
    `หรือฝากข้อมูลการติดต่อ ทีมงานจะโทรกลับครับ\n\n` +
    `📱 **LINE**: @evlifethailand\n` +
    `📞 **โทร**: 094-905-6155`
  );
}
