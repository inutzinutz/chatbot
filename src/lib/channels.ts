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
  iceBreakers: string[];     // quick‑start questions
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

const DEFAULT_SCHEDULE = [
  { day: "Monday",    open: "09:00", close: "18:00", active: true },
  { day: "Tuesday",   open: "09:00", close: "18:00", active: true },
  { day: "Wednesday", open: "09:00", close: "18:00", active: true },
  { day: "Thursday",  open: "09:00", close: "18:00", active: true },
  { day: "Friday",    open: "09:00", close: "18:00", active: true },
  { day: "Saturday",  open: "10:00", close: "16:00", active: false },
  { day: "Sunday",    open: "10:00", close: "16:00", active: false },
];

function defaultCommon(): ChannelCommonSettings {
  return {
    welcomeMessage: "สวัสดีครับ! ยินดีต้อนรับสู่ DJI 13 STORE 🙏\nสอบถามข้อมูลสินค้าหรือบริการได้เลยครับ",
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
      channelId: "127",
      scriptKey: "script_4x9xsyeyuk8",
      demoSitePath: "/droids/202/demo/chat-head/channels/127",
      widgetPosition: "bottom-right",
      primaryColor: "#2563EB",
      bubbleIcon: "chat",
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
      pageId: "882657075181887",
      pageUrl: "https://facebook.com/882657075181887",
      pageAccessToken: "",
      verifyToken: "",
      persistentMenu: true,
      iceBreakers: ["สินค้ามีอะไรบ้าง?", "โปรโมชั่นตอนนี้", "ติดต่อร้าน"],
      getStartedPayload: "GET_STARTED",
    },
  },
  {
    type: "LINE",
    enabled: true,
    name: "DJIPremiumReseller",
    common: {
      ...defaultCommon(),
      welcomeMessage: "สวัสดีครับ! ยินดีต้อนรับสู่ DJI Premium Reseller 🙏\nพิมพ์สอบถามได้เลยครับ",
    },
    line: {
      channelId: "1653948809",
      channelSecret: "",
      accessToken: "",
      richMenuEnabled: true,
      richMenuId: "",
      webhookUrl: "/api/line/webhook?businessId=dji13store",
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
