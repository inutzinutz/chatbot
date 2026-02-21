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
    currentUsage: 1449,
    monthlyLimit: 2500,
    remaining: 1051,
  },
  conversation: {
    avgMessages: 3.7,
    maxMessages: 79,
  },
  hourlyContacts: [
    { hour: "12 AM", count: 94 },
    { hour: "1 AM", count: 96 },
    { hour: "2 AM", count: 40 },
    { hour: "3 AM", count: 27 },
    { hour: "4 AM", count: 23 },
    { hour: "5 AM", count: 51 },
    { hour: "6 AM", count: 89 },
    { hour: "7 AM", count: 162 },
    { hour: "8 AM", count: 323 },
    { hour: "9 AM", count: 462 },
    { hour: "10 AM", count: 651 },
    { hour: "11 AM", count: 721 },
    { hour: "12 PM", count: 635 },
    { hour: "1 PM", count: 588 },
    { hour: "2 PM", count: 589 },
    { hour: "3 PM", count: 632 },
    { hour: "4 PM", count: 568 },
    { hour: "5 PM", count: 520 },
    { hour: "6 PM", count: 404 },
    { hour: "7 PM", count: 393 },
    { hour: "8 PM", count: 437 },
    { hour: "9 PM", count: 316 },
    { hour: "10 PM", count: 254 },
    { hour: "11 PM", count: 249 },
  ],
  intents: [
    { intent: "Product Details", count: 2937 },
    { intent: "Product Inquiry", count: 2467 },
    { intent: "Greeting", count: 771 },
    { intent: "Purchase", count: 753 },
    { intent: "Store Location", count: 575 },
    { intent: "Drone Purchase", count: 574 },
    { intent: "Other", count: 559 },
    { intent: "Recommendation", count: 522 },
    { intent: "Installment Info", count: 368 },
    { intent: "Document Service", count: 312 },
  ],
  platforms: [
    { platform: "FACEBOOK", count: 1913 },
    { platform: "LINE", count: 592 },
  ],
  languages: [
    { language: "th", count: 2137 },
    { language: "en", count: 232 },
    { language: "my", count: 5 },
    { language: "fr", count: 2 },
    { language: "lo", count: 1 },
    { language: "es", count: 1 },
    { language: "ar", count: 1 },
  ],
  topKeywords: [
    { keyword: "price", count: 646 },
    { keyword: "fly more combo", count: 412 },
    { keyword: "dji neo 2", count: 404 },
    { keyword: "dji neo", count: 332 },
    { keyword: "dji mini 5 pro", count: 252 },
    { keyword: "dji mini 4 pro", count: 233 },
    { keyword: "dji air 3s", count: 217 },
    { keyword: "service plus", count: 201 },
    { keyword: "drone", count: 189 },
    { keyword: "dji mini 4k", count: 181 },
  ],
};
