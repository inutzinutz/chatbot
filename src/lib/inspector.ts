/* ------------------------------------------------------------------ */
/*  Pipeline Trace — per-message AI processing inspection              */
/* ------------------------------------------------------------------ */

export type PipelineStepStatus = "matched" | "skipped" | "checked" | "not_reached";

export interface PipelineStepDetail {
  matchedTriggers?: string[];
  intent?: string;
  intentId?: string;
  score?: number;
  confidence?: number;
  allScores?: { intent: string; score: number }[];
  matchedProducts?: string[];
  matchedScript?: string;
  matchedDoc?: string;
  matchedFaqTopic?: string;
  matchedCategory?: string;
  productsCount?: number;
  // Carousel recommendation — typed as unknown to avoid circular import with products.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  carouselProducts?: any[];
}

export interface PipelineStep {
  layer: number;
  name: string;
  description: string;
  status: PipelineStepStatus;
  durationMs: number;
  details?: PipelineStepDetail;
}

export interface PipelineTrace {
  totalDurationMs: number;
  mode: "pipeline" | "pipeline_then_agent" | "pipeline_then_claude" | "pipeline_then_openai" | "claude_fallback" | "openai_fallback" | "claude_stream" | "openai_stream" | "fallback";
  steps: PipelineStep[];
  finalLayer: number;
  finalLayerName: string;
  finalIntent?: string;
  userMessage: string;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Inspector Log (existing)                                           */
/* ------------------------------------------------------------------ */

export interface InspectorLog {
  id: number;
  time: string;
  customer: string;
  message: string;
  agent: "Supervise Agent" | "Response Agent" | "Intent Agent";
  processingDuration: number; // ms
  response?: string;
  intent?: string;
  confidence?: number;
}

export const AGENT_TYPES = [
  "Supervise Agent",
  "Response Agent",
  "Intent Agent",
] as const;

export const inspectorLogs: InspectorLog[] = [
  {
    id: 201268,
    time: "20 Feb, 23:44",
    customer: "Ethel Baluran",
    message: "and the price please",
    agent: "Supervise Agent",
    processingDuration: 934,
    response: "Routing to Response Agent for pricing inquiry.",
    intent: "ask_price",
    confidence: 0.95,
  },
  {
    id: 201267,
    time: "20 Feb, 23:44",
    customer: "Ethel Baluran",
    message: "and the price please",
    agent: "Response Agent",
    processingDuration: 2525,
    response:
      "DJI Mini 4 Pro ราคา 28,900 บาท (Fly More Combo) หรือ 22,900 บาท (ตัวเครื่อง) ครับ",
    intent: "ask_price",
    confidence: 0.97,
  },
  {
    id: 201265,
    time: "20 Feb, 23:44",
    customer: "Ethel Baluran",
    message: "and the price please",
    agent: "Intent Agent",
    processingDuration: 1430,
    intent: "ask_price",
    confidence: 0.96,
  },
  {
    id: 201264,
    time: "20 Feb, 23:44",
    customer: "Ethel Baluran",
    message: "yes",
    agent: "Supervise Agent",
    processingDuration: 1032,
    response: "Customer confirmed. Continuing conversation flow.",
    intent: "confirm",
    confidence: 0.88,
  },
  {
    id: 201263,
    time: "20 Feb, 23:44",
    customer: "Ethel Baluran",
    message: "yes",
    agent: "Response Agent",
    processingDuration: 1778,
    response: "ดีครับ! ต้องการทราบข้อมูลเพิ่มเติมเกี่ยวกับรุ่นไหนครับ?",
    intent: "confirm",
    confidence: 0.91,
  },
  {
    id: 201261,
    time: "20 Feb, 23:44",
    customer: "Ethel Baluran",
    message: "yes",
    agent: "Intent Agent",
    processingDuration: 1827,
    intent: "confirm",
    confidence: 0.89,
  },
  {
    id: 201260,
    time: "20 Feb, 23:43",
    customer: "Ethel Baluran",
    message: "yes please",
    agent: "Supervise Agent",
    processingDuration: 3028,
    response: "Escalated to Response Agent with context.",
    intent: "confirm",
    confidence: 0.92,
  },
  {
    id: 201259,
    time: "20 Feb, 23:43",
    customer: "Ethel Baluran",
    message: "yes please",
    agent: "Response Agent",
    processingDuration: 3006,
    response:
      "แนะนำ DJI Mavic 3 Classic สำหรับถ่ายภาพมืออาชีพ ราคา 46,900 บาทครับ",
    intent: "confirm",
    confidence: 0.93,
  },
  {
    id: 201257,
    time: "20 Feb, 23:43",
    customer: "Ethel Baluran",
    message: "yes please",
    agent: "Intent Agent",
    processingDuration: 1788,
    intent: "confirm",
    confidence: 0.9,
  },
  {
    id: 201256,
    time: "20 Feb, 23:42",
    customer: "Ethel Baluran",
    message: "ok",
    agent: "Supervise Agent",
    processingDuration: 934,
    intent: "acknowledge",
    confidence: 0.85,
  },
  {
    id: 201255,
    time: "20 Feb, 23:42",
    customer: "Ethel Baluran",
    message: "ok",
    agent: "Response Agent",
    processingDuration: 1550,
    response: "มีอะไรให้ช่วยเพิ่มเติมไหมครับ?",
    intent: "acknowledge",
    confidence: 0.87,
  },
  {
    id: 201253,
    time: "20 Feb, 23:42",
    customer: "Ethel Baluran",
    message: "ok",
    agent: "Intent Agent",
    processingDuration: 1396,
    intent: "acknowledge",
    confidence: 0.84,
  },
  {
    id: 201240,
    time: "20 Feb, 23:35",
    customer: "Somchai K.",
    message: "DJI Mini 4 Pro มีสีอะไรบ้าง",
    agent: "Supervise Agent",
    processingDuration: 1120,
    intent: "ask_product_detail",
    confidence: 0.94,
  },
  {
    id: 201239,
    time: "20 Feb, 23:35",
    customer: "Somchai K.",
    message: "DJI Mini 4 Pro มีสีอะไรบ้าง",
    agent: "Response Agent",
    processingDuration: 2340,
    response: "DJI Mini 4 Pro มีสีเทาเข้ม (Dark Gray) เพียงสีเดียวครับ",
    intent: "ask_product_detail",
    confidence: 0.96,
  },
  {
    id: 201238,
    time: "20 Feb, 23:35",
    customer: "Somchai K.",
    message: "DJI Mini 4 Pro มีสีอะไรบ้าง",
    agent: "Intent Agent",
    processingDuration: 1560,
    intent: "ask_product_detail",
    confidence: 0.95,
  },
  {
    id: 201230,
    time: "20 Feb, 23:30",
    customer: "Maria Santos",
    message: "do you ship internationally?",
    agent: "Supervise Agent",
    processingDuration: 980,
    intent: "ask_shipping",
    confidence: 0.91,
  },
  {
    id: 201229,
    time: "20 Feb, 23:30",
    customer: "Maria Santos",
    message: "do you ship internationally?",
    agent: "Response Agent",
    processingDuration: 2100,
    response:
      "We currently ship within Thailand only. For international orders, please contact us via LINE for special arrangements.",
    intent: "ask_shipping",
    confidence: 0.93,
  },
  {
    id: 201228,
    time: "20 Feb, 23:30",
    customer: "Maria Santos",
    message: "do you ship internationally?",
    agent: "Intent Agent",
    processingDuration: 1340,
    intent: "ask_shipping",
    confidence: 0.92,
  },
  {
    id: 201220,
    time: "20 Feb, 23:25",
    customer: "John Doe",
    message: "warranty for DJI Avata 2?",
    agent: "Supervise Agent",
    processingDuration: 1050,
    intent: "ask_warranty",
    confidence: 0.93,
  },
  {
    id: 201219,
    time: "20 Feb, 23:25",
    customer: "John Doe",
    message: "warranty for DJI Avata 2?",
    agent: "Response Agent",
    processingDuration: 1890,
    response:
      "DJI Avata 2 มีประกันศูนย์ DJI 1 ปี และสามารถซื้อ DJI Care Refresh เพิ่มเติมได้ครับ",
    intent: "ask_warranty",
    confidence: 0.95,
  },
  {
    id: 201218,
    time: "20 Feb, 23:25",
    customer: "John Doe",
    message: "warranty for DJI Avata 2?",
    agent: "Intent Agent",
    processingDuration: 1200,
    intent: "ask_warranty",
    confidence: 0.94,
  },
  {
    id: 201210,
    time: "20 Feb, 23:20",
    customer: "Napat W.",
    message: "ราคา DJI Osmo Action 4",
    agent: "Supervise Agent",
    processingDuration: 890,
    intent: "ask_price",
    confidence: 0.97,
  },
  {
    id: 201209,
    time: "20 Feb, 23:20",
    customer: "Napat W.",
    message: "ราคา DJI Osmo Action 4",
    agent: "Response Agent",
    processingDuration: 2200,
    response:
      "DJI Osmo Action 4 ราคา 12,990 บาท (Standard Combo) หรือ 15,990 บาท (Adventure Combo) ครับ",
    intent: "ask_price",
    confidence: 0.98,
  },
  {
    id: 201208,
    time: "20 Feb, 23:20",
    customer: "Napat W.",
    message: "ราคา DJI Osmo Action 4",
    agent: "Intent Agent",
    processingDuration: 1100,
    intent: "ask_price",
    confidence: 0.97,
  },
  {
    id: 201200,
    time: "20 Feb, 23:15",
    customer: "Lisa Chen",
    message: "can I register my drone here?",
    agent: "Supervise Agent",
    processingDuration: 1150,
    intent: "ask_registration",
    confidence: 0.9,
  },
  {
    id: 201199,
    time: "20 Feb, 23:15",
    customer: "Lisa Chen",
    message: "can I register my drone here?",
    agent: "Response Agent",
    processingDuration: 2450,
    response:
      "Yes! We provide free drone registration assistance (CAAT) for all DJI drones purchased from our store. Please bring your drone and ID card to our shop.",
    intent: "ask_registration",
    confidence: 0.92,
  },
  {
    id: 201198,
    time: "20 Feb, 23:15",
    customer: "Lisa Chen",
    message: "can I register my drone here?",
    agent: "Intent Agent",
    processingDuration: 1380,
    intent: "ask_registration",
    confidence: 0.91,
  },
  {
    id: 201190,
    time: "20 Feb, 23:10",
    customer: "Prem T.",
    message: "มีโปรโมชั่นอะไรบ้าง",
    agent: "Supervise Agent",
    processingDuration: 920,
    intent: "ask_promotion",
    confidence: 0.94,
  },
  {
    id: 201189,
    time: "20 Feb, 23:10",
    customer: "Prem T.",
    message: "มีโปรโมชั่นอะไรบ้าง",
    agent: "Response Agent",
    processingDuration: 2680,
    response:
      "ตอนนี้มีโปรโมชั่น DJI Mini 4 Pro ลด 10% และ DJI Avata 2 แถม DJI Care Refresh 1 ปีครับ",
    intent: "ask_promotion",
    confidence: 0.96,
  },
  {
    id: 201188,
    time: "20 Feb, 23:10",
    customer: "Prem T.",
    message: "มีโปรโมชั่นอะไรบ้าง",
    agent: "Intent Agent",
    processingDuration: 1450,
    intent: "ask_promotion",
    confidence: 0.95,
  },
];
