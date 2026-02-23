import type { AnalyticsData } from "@/lib/analytics";

export const analyticsData: AnalyticsData = {
  package: {
    type: "professional",
    currentUsage: 243,
    monthlyLimit: 1000,
    remaining: 757,
  },
  conversation: {
    avgMessages: 5.2,
    maxMessages: 34,
  },
  hourlyContacts: [
    { hour: "08:00", count: 2 },
    { hour: "09:00", count: 8 },
    { hour: "10:00", count: 15 },
    { hour: "11:00", count: 12 },
    { hour: "12:00", count: 7 },
    { hour: "13:00", count: 9 },
    { hour: "14:00", count: 18 },
    { hour: "15:00", count: 21 },
    { hour: "16:00", count: 14 },
    { hour: "17:00", count: 10 },
    { hour: "18:00", count: 5 },
  ],
  intents: [
    { intent: "ซ่อมโดรน", count: 87 },
    { intent: "DJI Care Refresh", count: 54 },
    { intent: "Gimbal Problem", count: 38 },
    { intent: "ตกน้ำ/น้ำเข้า", count: 29 },
    { intent: "สอบถามราคาซ่อม", count: 25 },
    { intent: "Flyaway", count: 18 },
    { intent: "Error Code", count: 15 },
    { intent: "อะไหล่", count: 12 },
    { intent: "Firmware Update", count: 9 },
    { intent: "Flight Log", count: 7 },
  ],
  platforms: [
    { platform: "LINE", count: 178 },
    { platform: "Facebook", count: 52 },
    { platform: "Web", count: 13 },
  ],
  languages: [
    { language: "ไทย", count: 221 },
    { language: "English", count: 22 },
  ],
  topKeywords: [
    { keyword: "ซ่อม", count: 87 },
    { keyword: "gimbal", count: 54 },
    { keyword: "เคลม", count: 48 },
    { keyword: "ตกน้ำ", count: 29 },
    { keyword: "error", count: 28 },
    { keyword: "care refresh", count: 25 },
    { keyword: "flyaway", count: 18 },
    { keyword: "มอเตอร์", count: 15 },
  ],
};
