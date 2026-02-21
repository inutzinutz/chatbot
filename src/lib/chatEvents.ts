/* ------------------------------------------------------------------ */
/*  Chat Event Tracking — localStorage-based analytics collection      */
/* ------------------------------------------------------------------ */

export interface ChatEvent {
  id: string;
  timestamp: string;
  type: "message_sent" | "response_received" | "session_start" | "session_end";
  /** The AI mode that handled the response */
  mode?: "pipeline" | "pipeline_then_agent" | "pipeline_then_claude" | "pipeline_then_openai" | "claude_fallback" | "openai_fallback" | "claude_stream" | "openai_stream" | "fallback";
  /** Which pipeline layer resolved the response */
  finalLayer?: number;
  finalLayerName?: string;
  /** Detected intent (if any) */
  intent?: string;
  /** Message length in chars */
  messageLength?: number;
  /** Response time in ms */
  responseTimeMs?: number;
  /** Hour of day (0-23) for time-of-day analytics */
  hour: number;
  /** The user's message (first 100 chars for keyword extraction) */
  messagePreview?: string;
}

const STORAGE_KEY = "dji13_chat_events";
const MAX_EVENTS = 5000; // cap to prevent localStorage from growing too large

/** Save a new chat event */
export function trackChatEvent(event: Omit<ChatEvent, "id" | "timestamp" | "hour">): void {
  if (typeof window === "undefined") return;
  try {
    const events = getChatEvents();
    const now = new Date();
    const newEvent: ChatEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: now.toISOString(),
      hour: now.getHours(),
    };
    events.push(newEvent);
    // Keep only the most recent events
    const trimmed = events.slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // storage unavailable
  }
}

/** Get all stored chat events */
export function getChatEvents(): ChatEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as ChatEvent[];
  } catch {
    return [];
  }
}

/** Clear all chat events */
export function clearChatEvents(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/* ------------------------------------------------------------------ */
/*  Compute analytics from stored events                               */
/* ------------------------------------------------------------------ */

export interface ComputedAnalytics {
  totalMessages: number;
  totalResponses: number;
  totalSessions: number;
  avgResponseTimeMs: number;
  /** Hourly message distribution (24 buckets) */
  hourlyDistribution: { hour: string; count: number }[];
  /** Top intents by frequency */
  topIntents: { intent: string; count: number }[];
  /** AI mode distribution */
  modeDistribution: { mode: string; count: number }[];
  /** Top keywords extracted from messages */
  topKeywords: { keyword: string; count: number }[];
  /** Pipeline layer resolution distribution */
  layerDistribution: { layer: string; count: number }[];
}

/** Thai/English stop words to exclude from keyword extraction */
const STOP_WORDS = new Set([
  "ครับ", "ค่ะ", "คะ", "ไหม", "มั้ย", "บ้าง", "อะไร", "ยังไง",
  "ได้", "มี", "เป็น", "ไป", "มา", "ให้", "จะ", "แล้ว", "ก็",
  "the", "a", "an", "is", "are", "was", "were", "do", "does", "did",
  "i", "you", "he", "she", "it", "we", "they", "me", "my", "your",
  "what", "how", "can", "will", "would", "please", "thanks", "thank",
  "hi", "hello", "hey", "ok", "yes", "no",
]);

export function computeAnalytics(events: ChatEvent[]): ComputedAnalytics {
  const messages = events.filter((e) => e.type === "message_sent");
  const responses = events.filter((e) => e.type === "response_received");
  const sessions = events.filter((e) => e.type === "session_start");

  // Avg response time
  const responseTimes = responses
    .map((r) => r.responseTimeMs)
    .filter((t): t is number => t !== undefined);
  const avgResponseTimeMs =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

  // Hourly distribution
  const hourCounts = new Array(24).fill(0);
  for (const e of messages) {
    hourCounts[e.hour]++;
  }
  const hourLabels = [
    "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM",
    "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM",
    "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM",
    "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM",
  ];
  const hourlyDistribution = hourLabels.map((hour, i) => ({
    hour,
    count: hourCounts[i],
  }));

  // Top intents
  const intentMap = new Map<string, number>();
  for (const r of responses) {
    if (r.intent) {
      intentMap.set(r.intent, (intentMap.get(r.intent) || 0) + 1);
    }
  }
  const topIntents = [...intentMap.entries()]
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Mode distribution
  const modeMap = new Map<string, number>();
  for (const r of responses) {
    if (r.mode) {
      modeMap.set(r.mode, (modeMap.get(r.mode) || 0) + 1);
    }
  }
  const modeDistribution = [...modeMap.entries()]
    .map(([mode, count]) => ({ mode, count }))
    .sort((a, b) => b.count - a.count);

  // Top keywords (from message previews)
  const wordMap = new Map<string, number>();
  for (const m of messages) {
    if (!m.messagePreview) continue;
    const words = m.messagePreview
      .toLowerCase()
      .split(/[\s,!?.;:]+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    for (const word of words) {
      wordMap.set(word, (wordMap.get(word) || 0) + 1);
    }
  }
  const topKeywords = [...wordMap.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Layer distribution
  const layerMap = new Map<string, number>();
  for (const r of responses) {
    if (r.finalLayerName) {
      layerMap.set(r.finalLayerName, (layerMap.get(r.finalLayerName) || 0) + 1);
    }
  }
  const layerDistribution = [...layerMap.entries()]
    .map(([layer, count]) => ({ layer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalMessages: messages.length,
    totalResponses: responses.length,
    totalSessions: sessions.length,
    avgResponseTimeMs,
    hourlyDistribution,
    topIntents,
    modeDistribution,
    topKeywords,
    layerDistribution,
  };
}
