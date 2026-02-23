import type { AnalyticsData } from "@/lib/analytics";

export const analyticsData: AnalyticsData = {
  package: {
    type: "professional",
    currentUsage: 48,
    monthlyLimit: 500,
    remaining: 452,
  },
  conversation: {
    avgMessages: 4.1,
    maxMessages: 18,
  },
  hourlyContacts: [
    { hour: "09:00", count: 4 },
    { hour: "10:00", count: 8 },
    { hour: "11:00", count: 11 },
    { hour: "12:00", count: 5 },
    { hour: "13:00", count: 6 },
    { hour: "14:00", count: 9 },
    { hour: "15:00", count: 7 },
    { hour: "16:00", count: 4 },
  ],
  intents: [
    { intent: "ขึ้นทะเบียน กสทช.", count: 21 },
    { intent: "ขออนุญาต CAAT / RPL", count: 12 },
    { intent: "ถามเอกสาร", count: 9 },
    { intent: "กฎหมายการบิน", count: 7 },
    { intent: "ต่ออายุ", count: 5 },
    { intent: "ค่าธรรมเนียม", count: 4 },
  ],
  platforms: [
    { platform: "LINE", count: 38 },
    { platform: "Facebook", count: 8 },
    { platform: "Web", count: 2 },
  ],
  languages: [
    { language: "ไทย", count: 46 },
    { language: "English", count: 2 },
  ],
  topKeywords: [
    { keyword: "กสทช.", count: 21 },
    { keyword: "ขึ้นทะเบียน", count: 19 },
    { keyword: "caat", count: 12 },
    { keyword: "rpl", count: 9 },
    { keyword: "เอกสาร", count: 8 },
    { keyword: "ค่าธรรมเนียม", count: 4 },
  ],
};
