export interface HourlyContact {
  hour: string;
  count: number;
}

export interface IntentStat {
  intent: string;
  count: number;
}

export interface PlatformStat {
  platform: string;
  count: number;
}

export interface LanguageStat {
  language: string;
  count: number;
}

export interface KeywordStat {
  keyword: string;
  count: number;
}

export interface PackageInfo {
  type: string;
  currentUsage: number;
  monthlyLimit: number;
  remaining: number;
}

export interface ConversationStats {
  avgMessages: number;
  maxMessages: number;
}

export interface AnalyticsData {
  package: PackageInfo;
  conversation: ConversationStats;
  hourlyContacts: HourlyContact[];
  intents: IntentStat[];
  platforms: PlatformStat[];
  languages: LanguageStat[];
  topKeywords: KeywordStat[];
}

export const analyticsData: AnalyticsData = {
  package: {
    type: "enterprise",
    currentUsage: 892,
    monthlyLimit: 2500,
    remaining: 1608,
  },
  conversation: {
    avgMessages: 4.2,
    maxMessages: 45,
  },
  hourlyContacts: [
    { hour: "12 AM", count: 12 },
    { hour: "1 AM", count: 8 },
    { hour: "2 AM", count: 5 },
    { hour: "3 AM", count: 3 },
    { hour: "4 AM", count: 2 },
    { hour: "5 AM", count: 8 },
    { hour: "6 AM", count: 25 },
    { hour: "7 AM", count: 68 },
    { hour: "8 AM", count: 142 },
    { hour: "9 AM", count: 235 },
    { hour: "10 AM", count: 312 },
    { hour: "11 AM", count: 356 },
    { hour: "12 PM", count: 298 },
    { hour: "1 PM", count: 275 },
    { hour: "2 PM", count: 289 },
    { hour: "3 PM", count: 310 },
    { hour: "4 PM", count: 285 },
    { hour: "5 PM", count: 248 },
    { hour: "6 PM", count: 195 },
    { hour: "7 PM", count: 178 },
    { hour: "8 PM", count: 156 },
    { hour: "9 PM", count: 125 },
    { hour: "10 PM", count: 78 },
    { hour: "11 PM", count: 42 },
  ],
  intents: [
    { intent: "Battery Inquiry", count: 856 },
    { intent: "Price Check", count: 542 },
    { intent: "On-site Service", count: 342 },
    { intent: "EM Motorcycle", count: 256 },
    { intent: "Warranty Info", count: 178 },
    { intent: "Greeting", count: 165 },
    { intent: "Purchase", count: 145 },
    { intent: "Recommendation", count: 132 },
    { intent: "Contact Channels", count: 98 },
    { intent: "Battery Symptom", count: 87 },
  ],
  platforms: [
    { platform: "LINE", count: 1245 },
    { platform: "Facebook", count: 678 },
    { platform: "Web", count: 212 },
  ],
  languages: [
    { language: "th", count: 1985 },
    { language: "en", count: 142 },
    { language: "zh", count: 8 },
  ],
  topKeywords: [
    { keyword: "แบตเตอรี่", count: 856 },
    { keyword: "BYD", count: 542 },
    { keyword: "ราคา", count: 498 },
    { keyword: "Tesla", count: 385 },
    { keyword: "on-site", count: 342 },
    { keyword: "LiFePO4", count: 298 },
    { keyword: "มอเตอร์ไซค์ EM", count: 256 },
    { keyword: "เปลี่ยนแบต", count: 234 },
    { keyword: "MG ZS EV", count: 198 },
    { keyword: "รับประกัน", count: 178 },
  ],
};
