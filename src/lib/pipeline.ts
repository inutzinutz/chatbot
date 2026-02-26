/* ------------------------------------------------------------------ */
/*  Shared Pipeline — used by /api/chat and /api/line/webhook          */
/* ------------------------------------------------------------------ */

import { type Product } from "@/lib/products";
import { type BusinessConfig } from "@/lib/businessUnits";
import type { PipelineStep, PipelineTrace } from "@/lib/inspector";
import { recommendProducts } from "@/lib/carouselBuilder";
import type { ChatSummary, PendingForm, QuotationFormData } from "@/lib/chatStore";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface IntentScore {
  intent: BusinessConfig["intents"][number];
  score: number;
  matchedTriggers: string[];
}

interface ConversationContext {
  recentProducts: Product[];
  activeProduct: Product | null;
  recentTopic: string | null;
  isFollowUp: boolean;
  recentUserMessages: string[];
  summary: string;
}

export interface TracedResult {
  content: string;
  trace: PipelineTrace;
  /** True when Layer 1 admin escalation was triggered — webhook should auto-pin + disable bot + notify admin */
  isAdminEscalation?: boolean;
  /**
   * When bot is unsure, this holds suggested quick-reply labels.
   * LINE webhook → send as Quick Reply buttons.
   * Web chat → send as clickable option chips.
   */
  clarifyOptions?: string[];
  /**
   * True when the customer cancelled escalation and wants the bot back.
   * LINE webhook should re-enable bot + unpin conversation when this is set.
   */
  isCancelEscalation?: boolean;
  /**
   * When set, the webhook must persist this form state back to chatStore.
   * - PendingForm object: save/update the form (mid-collection)
   * - null: clear the form (collection complete or cancelled)
   */
  pendingFormUpdate?: PendingForm | null;
  /**
   * When set, the channel (LINE/FB/Web) should send a product carousel
   * in addition to (or instead of) the text content.
   * Max 10 items. Channel-specific formatting is done in each webhook handler.
   */
  carouselProducts?: Product[];
}

// ─────────────────────────────────────────────────────────────
// INTENT ENGINE — Multi-signal scoring (business-aware)
// ─────────────────────────────────────────────────────────────

// Module-level cache: trigger string → compiled word-boundary RegExp
// Avoids recompiling the same pattern on every message (hot-loop fix).
// Using a Map instead of WeakMap since keys are strings.
const _wbRegexCache = new Map<string, RegExp>();

function getWordBoundaryRegex(trigger: string): RegExp {
  let re = _wbRegexCache.get(trigger);
  if (!re) {
    const escaped = trigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`(^|[\\s,!?])${escaped}($|[\\s,!?])`);
    _wbRegexCache.set(trigger, re);
  }
  return re;
}

export function scoreIntents(message: string, biz: BusinessConfig): IntentScore[] {
  const lower = message.toLowerCase();
  const scores: IntentScore[] = [];

  for (const intent of biz.intents) {
    if (!intent.active || intent.triggers.length === 0) continue;
    let score = 0;
    const matchedTriggers: string[] = [];

    for (const trigger of intent.triggers) {
      const t = trigger.toLowerCase();
      if (!lower.includes(t)) continue;
      matchedTriggers.push(trigger);
      // Award bonus point only for ASCII triggers that can benefit from word-boundary check.
      // Thai script has no spaces between words, so the regex almost never matches Thai text —
      // applying it would systematically under-score Thai triggers by 33%. Instead we give
      // the full 3 points for exact-string matches on Thai triggers.
      const isAsciiTrigger = /^[\x00-\x7F]+$/.test(t);
      if (isAsciiTrigger) {
        const wb = getWordBoundaryRegex(t);
        score += wb.test(lower) ? 3 : 2;
      } else {
        // Thai: always award 3 (treat as boundary-matched)
        score += 3;
      }
    }

    if (matchedTriggers.length > 1) score += (matchedTriggers.length - 1) * 0.5;
    if (score > 0) scores.push({ intent, score, matchedTriggers });
  }

  return scores.sort((a, b) => b.score - a.score);
}

export function classifyIntent(message: string, biz: BusinessConfig, threshold = 2): IntentScore | null {
  const scores = scoreIntents(message, biz);
  return scores.length > 0 && scores[0].score >= threshold ? scores[0] : null;
}

// ─────────────────────────────────────────────────────────────
// REPETITION GUARD
// ─────────────────────────────────────────────────────────────

/**
 * Normalise a bot response string for repetition comparison.
 * - Lowercase
 * - Collapse whitespace / newlines
 * - Strip markdown bold markers (**) and emoji
 */
function normaliseForRepetition(text: string): string {
  return text
    .toLowerCase()
    .replace(/\*\*/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns true when `candidate` is too similar to a recent bot reply.
 *
 * Similarity is measured by a simple token-overlap Jaccard index:
 *   overlap = |A ∩ B| / |A ∪ B|
 *
 * Threshold: 0.72  (≈72% of unique words overlap → consider it a repeat)
 * We look at the last `windowSize` assistant messages (default 3).
 */
function isTooSimilarToRecentReply(
  candidate: string,
  allMessages: ChatMessage[],
  windowSize = 3,
  threshold = 0.72
): boolean {
  const recentBotMessages = allMessages
    .filter((m) => m.role === "assistant")
    .slice(-windowSize);

  if (recentBotMessages.length === 0) return false;

  const tokensOf = (text: string) =>
    new Set(normaliseForRepetition(text).split(" ").filter((w) => w.length > 1));

  const candidateTokens = tokensOf(candidate);
  if (candidateTokens.size === 0) return false;

  for (const msg of recentBotMessages) {
    const recentTokens = tokensOf(msg.content);
    if (recentTokens.size === 0) continue;

    // Intersection
    let intersectSize = 0;
    for (const t of candidateTokens) {
      if (recentTokens.has(t)) intersectSize++;
    }

    // Union
    const unionSize = candidateTokens.size + recentTokens.size - intersectSize;
    const jaccard = intersectSize / unionSize;

    if (jaccard >= threshold) return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────
// CONVERSATION CONTEXT
// ─────────────────────────────────────────────────────────────

const FOLLOW_UP_PATTERNS = [
  "รุ่นนี้", "ตัวนี้", "อันนี้", "เครื่องนี้", "สินค้านี้",
  "ราคาเท่าไหร่", "ราคาเท่าไร", "กี่บาท",
  "มีสีอะไร", "สีอะไรบ้าง",
  "มีประกัน", "ประกันกี่ปี", "ประกันเท่าไหร่",
  "ส่งกี่วัน", "ส่งฟรีไหม", "ค่าส่งเท่าไหร่", "จัดส่งยังไง",
  "มีโปรไหม", "ลดราคาไหม",
  "สเปค", "spec", "รายละเอียด",
  "ผ่อนได้ไหม", "ผ่อนกี่งวด",
  "เอาอันนี้", "สั่งได้เลย", "จะสั่ง", "สั่งซื้อ",
  "เปรียบเทียบ", "ต่างกันยังไง", "อะไรดีกว่า",
  "มีของไหม", "มีสต็อกไหม", "พร้อมส่งไหม",
  "แถมอะไร", "ได้อะไรบ้าง", "มาพร้อมอะไร",
  "this one", "how much", "what color", "any discount",
  "specs", "details", "warranty", "shipping",
  "compare", "difference", "better",
  "i want it", "order", "buy this",
  "เอา", "ได้", "ครับ", "ค่ะ", "โอเค", "ok", "yes",
  "แล้วก็", "แล้ว", "อีกอย่าง",
];

const TOPIC_PATTERNS: { keys: string[]; topic: string }[] = [
  { keys: ["ราคา", "กี่บาท", "เท่าไหร่", "เท่าไร", "price", "how much", "cost"], topic: "price" },
  { keys: ["ประกัน", "warranty", "เคลม", "care refresh", "service plus"], topic: "warranty" },
  { keys: ["ส่ง", "จัดส่ง", "shipping", "delivery", "ค่าส่ง", "กี่วัน"], topic: "shipping" },
  { keys: ["สี", "color", "สีอะไร"], topic: "color" },
  { keys: ["สเปค", "spec", "รายละเอียด", "detail", "คุณสมบัติ", "feature"], topic: "specs" },
  { keys: ["ผ่อน", "installment", "งวด", "บัตรเครดิต"], topic: "installment" },
  { keys: ["โปร", "ส่วนลด", "promotion", "discount", "ลดราคา", "แถม"], topic: "promotion" },
  { keys: ["เปรียบเทียบ", "compare", "ต่างกัน", "vs", "อะไรดีกว่า", "difference"], topic: "compare" },
  { keys: ["สต็อก", "ของ", "พร้อมส่ง", "stock", "available", "มีไหม"], topic: "stock" },
  { keys: ["สั่ง", "ซื้อ", "เอา", "order", "buy"], topic: "order" },
];

/**
 * Scan one message's text and add any products found into the set.
 * Returns the last product found in this message (for recency tracking).
 */
function scanProductsInText(
  text: string,
  products: Product[],
  seen: Map<string, Product>
): Product | null {
  let lastFound: Product | null = null;
  const lower = text.toLowerCase();

  for (const product of products) {
    const nameMatch = product.name.toLowerCase();
    let matched = false;

    if (lower.includes(nameMatch)) {
      matched = true;
    }

    if (!matched) {
      for (const tag of product.tags) {
        if (tag.length > 3 && !GENERIC_PRODUCT_TAGS.has(tag.toLowerCase()) && lower.includes(tag.toLowerCase())) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      seen.set(String(product.id), product);
      lastFound = product;
    }
  }

  // Also catch bold **ProductName** patterns (assistant replies)
  const boldMatches = text.match(/\*\*(.+?)\*\*/g);
  if (boldMatches) {
    for (const m of boldMatches) {
      const name = m.replace(/\*\*/g, "").trim();
      const found = products.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (found) {
        seen.set(String(found.id), found);
        lastFound = found;
      }
    }
  }

  return lastFound;
}

function extractConversationContext(
  messages: ChatMessage[],
  currentMessage: string,
  biz: BusinessConfig
): ConversationContext {
  const recentUserMessages: string[] = [];

  // ── Pass 1: scan last 10 messages chronologically, track product mentions ──
  // Use a Map keyed by product.id to deduplicate; preserve insertion order = recency
  const seenProducts = new Map<string, Product>();
  let lastAssistantProduct: Product | null = null;  // most recent product in the last assistant reply
  let lastTopicInHistory: string | null = null;      // most recent topic seen in prior turns

  const recentMsgs = messages.slice(-10);

  for (const msg of recentMsgs) {
    if (msg.role === "user") {
      recentUserMessages.push(msg.content);
    }

    const lastInMsg = scanProductsInText(msg.content, biz.products, seenProducts);

    // Track the most recent product that the ASSISTANT explicitly talked about
    if (msg.role === "assistant" && lastInMsg) {
      lastAssistantProduct = lastInMsg;
    }

    // Track topic from prior user messages (for topic persistence)
    if (msg.role === "user") {
      const ml = msg.content.toLowerCase();
      for (const { keys, topic } of TOPIC_PATTERNS) {
        if (keys.some((k) => ml.includes(k))) {
          lastTopicInHistory = topic;
          break;
        }
      }
    }
  }

  const recentProducts = Array.from(seenProducts.values());

  // ── Pass 2: determine activeProduct ──
  // Priority order:
  //   1. Product mentioned in the CURRENT user message
  //   2. Product last explicitly discussed by the assistant (cleared if topic changes)
  //   3. Most recently seen product in the last 10 messages
  const currentLower = currentMessage.toLowerCase();

  // Category-switch signals: if current message clearly switches topic category,
  // reset lastAssistantProduct so we don't carry stale context forward.
  const BATTERY_CATEGORY_SIGNALS = ["แบต", "battery", "lifepo4", "lfp", "well done", "welldone", "ev battery", "byd", "tesla", "volvo", "mg ", "ora ", "neta "];
  const MOTO_CATEGORY_SIGNALS = ["มอไซ", "มอเตอร์ไซ", "motorcycle", "em ", "legend", "milano", "owen", "enzo", "qarez", "ebike", "e-bike"];

  const hasBatterySignal = BATTERY_CATEGORY_SIGNALS.some((s) => currentLower.includes(s));
  const hasMotoSignal = MOTO_CATEGORY_SIGNALS.some((s) => currentLower.includes(s));

  // If the last assistant product was from a different category than what the user is now asking,
  // clear it so L5 context-fallback doesn't answer about the wrong product.
  if (lastAssistantProduct && hasBatterySignal && lastAssistantProduct.category !== "แบตเตอรี่ EV") {
    lastAssistantProduct = null;
  }
  if (lastAssistantProduct && hasMotoSignal && lastAssistantProduct.category !== "มอเตอร์ไซค์ไฟฟ้า EM") {
    lastAssistantProduct = null;
  }

  let activeProduct: Product | null = null;

  // Check if current message mentions a product directly
  const currentSeenMap = new Map<string, Product>();
  const currentLastProduct = scanProductsInText(currentMessage, biz.products, currentSeenMap);
  if (currentLastProduct) {
    activeProduct = currentLastProduct;
  } else if (lastAssistantProduct) {
    activeProduct = lastAssistantProduct;
  } else if (recentProducts.length > 0) {
    activeProduct = recentProducts[recentProducts.length - 1];
  }

  // ── Pass 3: topic detection ──
  // First check current message; fall back to last topic seen in history

  // HIGH-PRIORITY OVERRIDES: certain topic combinations must win before the
  // generic loop runs, because a price word (เท่าไร) inside a shipping
  // question ("จัดส่งเชียงใหม่ค่าขนส่งเท่าไร") would otherwise mis-classify
  // as topic="price" and return the product price instead of shipping info.

  // Location words that signal the customer is asking about delivery destination
  const LOCATION_SIGNALS = [
    "เชียงใหม่", "ภูเก็ต", "ขอนแก่น", "อุดร", "นครราชสีมา", "โคราช",
    "สงขลา", "หาดใหญ่", "เชียงราย", "ลำปาง", "พิษณุโลก", "นครสวรรค์",
    "ระยอง", "ชลบุรี", "พัทยา", "อยุธยา", "สระบุรี", "สุพรรณ", "กาญจนบุรี",
    "สมุทร", "นนทบุรี", "ปทุมธานี", "ปราจีน", "ฉะเชิงเทรา",
    "ต่างจังหวัด", "ต่างประเทศ", "จังหวัด", "province", "upcountry",
    "ภาค", "เหนือ", "อีสาน", "ใต้", "ตะวันออก",
  ];
  const SHIPPING_SIGNALS = [
    "ส่ง", "จัดส่ง", "ขนส่ง", "ค่าส่ง", "shipping", "delivery", "กี่วัน", "ส่งได้ไหม",
  ];

  const hasLocationSignal = LOCATION_SIGNALS.some((l) => currentLower.includes(l));
  const hasShippingSignal = SHIPPING_SIGNALS.some((s) => currentLower.includes(s));

  let recentTopic: string | null = null;

  // Override: location + any shipping/price word → treat as shipping inquiry
  if (hasLocationSignal && (hasShippingSignal || currentLower.includes("เท่าไร") || currentLower.includes("เท่าไหร่"))) {
    recentTopic = "shipping";
  }

  if (!recentTopic) {
    // Shipping topic must be checked BEFORE price to prevent "ค่าขนส่งเท่าไร" → price
    const ORDERED_TOPIC_PATTERNS = [
      ...TOPIC_PATTERNS.filter((tp) => tp.topic === "shipping"),
      ...TOPIC_PATTERNS.filter((tp) => tp.topic !== "shipping"),
    ];
    for (const { keys, topic } of ORDERED_TOPIC_PATTERNS) {
      if (keys.some((k) => currentLower.includes(k))) {
        recentTopic = topic;
        break;
      }
    }
  }

  // Topic persistence: if current message has no topic but looks like a follow-up, carry forward
  if (!recentTopic && lastTopicInHistory) {
    recentTopic = lastTopicInHistory;
  }

  // ── Pass 4: follow-up detection ──
  // A message is a follow-up when:
  //   - There is prior context (messages > 1), AND
  //   - It contains a follow-up pattern OR is very short (≤ 25 chars) AND there's an activeProduct
  const hasFollowUpKeyword = FOLLOW_UP_PATTERNS.some((p) => currentLower.includes(p));
  const isShortWithContext = currentMessage.trim().length <= 25 && messages.length > 1 && activeProduct !== null;
  const isFollowUp = messages.length > 1 && (hasFollowUpKeyword || isShortWithContext);

  const parts: string[] = [];
  if (activeProduct) parts.push(`Active: ${activeProduct.name}`);
  if (recentProducts.length > 1) parts.push(`${recentProducts.length} products in ctx`);
  if (recentTopic) parts.push(`Topic: ${recentTopic}`);
  if (isFollowUp) parts.push("follow-up");
  const summary = parts.length > 0 ? parts.join(" | ") : "No prior context";

  return {
    recentProducts,
    activeProduct,
    recentTopic,
    isFollowUp,
    recentUserMessages,
    summary,
  };
}

// ─────────────────────────────────────────────────────────────
// CONTEXTUAL RESPONSE BUILDER
// ─────────────────────────────────────────────────────────────

function buildProductCard(p: Product): string {
  const badge =
    p.status === "discontinue" ? "⚠️ DISCONTINUE" : "✅ พร้อมจำหน่าย";
  const alt = p.recommendedAlternative
    ? `\n➡️ แนะนำรุ่นใหม่: **${p.recommendedAlternative}**`
    : "";
  return `**${p.name}**\n💰 **${p.price.toLocaleString()} บาท** | ${p.category}\n${badge}${alt}\n${p.description.split("\n")[0]}`;
}

function buildContextualResponse(
  ctx: ConversationContext,
  userMessage: string,
  biz: BusinessConfig
): string | null {
  const p = ctx.activeProduct;
  if (!p) return null;

  const topic = ctx.recentTopic;
  const lower = userMessage.toLowerCase();

  switch (topic) {
    case "price":
      return `**${p.name}** ราคา **${p.price.toLocaleString()} บาท** ครับ 💰${
        p.status === "discontinue"
          ? `\n\n⚠️ สินค้านี้ยกเลิกจำหน่ายแล้ว แนะนำ **${p.recommendedAlternative}** ครับ`
          : ""
      }\n\nสนใจสอบถามเพิ่มเติมไหมครับ?`;

    case "warranty": {
      // Read warranty lines directly from product description
      const descLines = p.description.split("\n");
      const warrantyLine = descLines.find((l) => l.startsWith("Warranty:"));
      if (warrantyLine) {
        const parts = warrantyLine.replace("Warranty:", "").split("|").map((s) => s.trim()).filter(Boolean);
        const warrantyText = parts.map((pt) => `  • ${pt}`).join("\n");
        return `**${p.name}** — การรับประกันครับ\n\n🔧 รับประกัน:\n${warrantyText}\n\nเคลมผ่านช่องทาง:\n${biz.orderChannelsText}\n\nมีคำถามเพิ่มเติมไหมครับ?`;
      }
      // Category-specific fallback
      if (p.category === "แบตเตอรี่ EV") {
        return `**${p.name}** — รับประกัน **4 ปีเต็ม** ครับ\n\n✅ ครอบคลุม: แบตเสื่อม ชาร์จไม่ขึ้น ความจุลดผิดปกติ\n❌ ไม่ครอบคลุม: อุบัติเหตุ ดัดแปลงโดยบุคคลอื่น\n\nเคลมผ่านช่องทาง:\n${biz.orderChannelsText}`;
      }
      return `**${p.name}** — รับประกัน: มอเตอร์ 5 ปี / แบตเตอรี่-คอนโทรลเลอร์ 3 ปี / ระบบไฟฟ้า 1 ปี ครับ\n\nเคลมผ่านช่องทาง:\n${biz.orderChannelsText}`;
    }

    case "shipping": {
      const isMoto = p.category === "มอเตอร์ไซค์ไฟฟ้า EM";

      // Detect if customer mentioned a specific province/location
      const LOCATION_SIGNALS_MAP: { signal: string; label: string }[] = [
        { signal: "เชียงใหม่", label: "เชียงใหม่" },
        { signal: "ภูเก็ต",   label: "ภูเก็ต" },
        { signal: "ขอนแก่น",  label: "ขอนแก่น" },
        { signal: "อุดร",     label: "อุดรธานี" },
        { signal: "นครราชสีมา", label: "นครราชสีมา" },
        { signal: "โคราช",    label: "นครราชสีมา" },
        { signal: "สงขลา",    label: "สงขลา" },
        { signal: "หาดใหญ่",  label: "สงขลา" },
        { signal: "เชียงราย", label: "เชียงราย" },
        { signal: "ลำปาง",    label: "ลำปาง" },
        { signal: "พิษณุโลก", label: "พิษณุโลก" },
        { signal: "ระยอง",    label: "ระยอง" },
        { signal: "ชลบุรี",   label: "ชลบุรี" },
        { signal: "พัทยา",    label: "ชลบุรี" },
        { signal: "ต่างจังหวัด", label: "ต่างจังหวัด" },
      ];
      const foundLocation = LOCATION_SIGNALS_MAP.find((l) => lower.includes(l.signal));
      const locationLabel = foundLocation?.label ?? null;

      const BKK_AREA = ["กรุงเทพ", "กทม", "บางกอก", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ"];
      const isBkkArea = BKK_AREA.some((b) => lower.includes(b));

      if (isMoto) {
        if (isBkkArea) {
          return `การจัดส่ง **${p.name}** ไป**กรุงเทพฯ และปริมณฑล** ครับ\n\n🚚 **ส่งฟรี** ถึงบ้าน ไม่มีค่าใช้จ่ายเพิ่มครับ\n⏱ รอรับภายใน 3-5 วันทำการ\n\nสั่งซื้อหรือนัดจัดส่งได้เลยครับ:\n${biz.orderChannelsText}`;
        }
        if (locationLabel) {
          return `การจัดส่ง **${p.name}** ไป**${locationLabel}** ครับ\n\n📦 ต่างจังหวัด — มีค่าจัดส่งตามระยะทาง\n⏱ รอรับ 3-7 วันทำการ\n\nทีมงานจะแจ้งค่าขนส่งที่แน่นอนก่อนยืนยันการสั่งซื้อครับ\nติดต่อสอบถามได้เลย:\n${biz.orderChannelsText}`;
        }
        return `การจัดส่ง **${p.name}** ครับ\n\n🚚 กรุงเทพฯ และปริมณฑล — **ส่งฟรี** ถึงบ้าน\n📦 ต่างจังหวัด — มีค่าจัดส่งตามระยะทาง\n⏱ รอรับ 3-7 วันทำการ\n\nสั่งซื้อผ่านช่องทาง:\n${biz.orderChannelsText}`;
      }

      // Non-motorcycle (battery On-site service)
      const ON_SITE_AREA = ["กรุงเทพ", "กทม", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ"];
      const inOnSiteArea = ON_SITE_AREA.some((b) => lower.includes(b));

      if (locationLabel && !inOnSiteArea) {
        return `บริการ On-site ของ **${p.name}** ครับ\n\n⚠️ ขณะนี้ให้บริการเฉพาะ **กรุงเทพฯ + นนทบุรี + ปทุมธานี + สมุทรปราการ** ครับ\nยังไม่ครอบคลุม **${locationLabel}** ในขณะนี้\n\nสำหรับพื้นที่ต่างจังหวัด กรุณาติดต่อทีมงานเพื่อสอบถามความเป็นไปได้:\n${biz.orderChannelsText}`;
      }
      return `การบริการ **${p.name}** ครับ\n\n🔧 On-site ถึงบ้าน — ช่างมาเปลี่ยนให้ถึงที่\n✅ ฟรีค่าเดินทาง กรุงเทพฯ + นนทบุรี + ปทุมธานี + สมุทรปราการ\n⏱ นัดหมายล่วงหน้า 1-2 วัน\n\nนัดหมายผ่านช่องทาง:\n${biz.orderChannelsText}`;
    }

    case "specs":
      return `รายละเอียด **${p.name}** ครับ\n\n${p.description}\n\n💰 ราคา: **${p.price.toLocaleString()} บาท**\n📂 หมวดหมู่: ${p.category}\n\nมีคำถามเพิ่มเติมไหมครับ?`;

    case "installment": {
      const isMotoInstall = p.category === "มอเตอร์ไซค์ไฟฟ้า EM";
      if (isMotoInstall) {
        return `**${p.name}** ราคา **${p.price.toLocaleString()} บาท** — ผ่อนได้เลยครับ!\n\n💳 โปรไฟแนนซ์:\n  • ผ่อน 0% หรือ ฟรีดาวน์ (เงื่อนไขตามธนาคาร)\n  • ทุกอาชีพออกได้ — อิสระ ค้าขาย พนักงานประจำ\n  • บริการทำสัญญาถึงบ้าน ฟรี!\n  • เอกสาร: บัตรประชาชน + สลิปเงินเดือน หรือ Statement\n\nสนใจผ่อน ติดต่อได้เลยครับ:\n${biz.orderChannelsText}`;
      }
      return `**${p.name}** ราคา **${p.price.toLocaleString()} บาท** ครับ\n\n💳 ชำระได้: เงินสด / โอนเงิน / บัตรเครดิต (On-site)\n\nสอบถามเพิ่มเติม:\n${biz.orderChannelsText}`;
    }

    case "promotion": {
      const isMotoPromo = p.category === "มอเตอร์ไซค์ไฟฟ้า EM";
      if (isMotoPromo) {
        return `โปรโมชั่นสำหรับ **${p.name}** ครับ 🎉\n\n💰 ราคา: **${p.price.toLocaleString()} บาท**\n\n**สิทธิ์ฟรี:**\n  • จดทะเบียน + พ.ร.บ.\n  • ประกันรถหาย 1 ปี (เฉพาะไฟแนนซ์)\n  • ส่งฟรี กรุงเทพฯ และปริมณฑล\n\n**ของแถม:** หมวกกันน็อค, ถุงมือ, กรอบป้าย, เสื้อคลุม\n\nสอบถามเพิ่มเติม:\n${biz.orderChannelsText}`;
      }
      return `โปรโมชั่นสำหรับ **${p.name}** ครับ\n\n💰 ราคา: **${p.price.toLocaleString()} บาท** (รวมติดตั้ง On-site)\n🔧 รับประกัน 4 ปี\n\nสอบถามโปรล่าสุด:\n${biz.orderChannelsText}`;
    }

    case "stock":
      return `ผมขออนุญาตตรวจสอบสต็อก **${p.name}** กับทีมงานให้แน่ชัดก่อนนะครับ\n\nเพื่อข้อมูลที่ถูกต้อง 100% ครับ`;

    case "compare": {
      if (ctx.recentProducts.length >= 2) {
        const [p1, p2] = ctx.recentProducts.slice(-2);
        return `เปรียบเทียบ **${p1.name}** vs **${p2.name}** ครับ\n\n` +
          `| | **${p1.name}** | **${p2.name}** |\n` +
          `|---|---|---|\n` +
          `| ราคา | ${p1.price.toLocaleString()} บาท | ${p2.price.toLocaleString()} บาท |\n` +
          `| หมวดหมู่ | ${p1.category} | ${p2.category} |\n` +
          `| สถานะ | ${p1.status === "discontinue" ? "ยกเลิก" : "จำหน่าย"} | ${p2.status === "discontinue" ? "ยกเลิก" : "จำหน่าย"} |\n\n` +
          `สนใจรุ่นไหนมากกว่าครับ?`;
      }
      return `สำหรับ **${p.name}** ราคา **${p.price.toLocaleString()} บาท** ครับ\n\nอยากเปรียบเทียบกับรุ่นไหนครับ?`;
    }

    case "order":
      return `ขอบคุณที่สนใจ **${p.name}** ครับ!\n\n💰 ราคา: **${p.price.toLocaleString()} บาท**\n\nช่องทางสั่งซื้อครับ:\n${biz.orderChannelsText}\n\nทีมงานจะช่วยดำเนินการสั่งซื้อและแจ้งรายละเอียดการชำระเงินให้ครับ`;

    default:
      break;
  }

  if (ctx.isFollowUp && p) {
    // ── Negation guard: "ไม่เอา", "ไม่ชอบ", "ไม่สนใจ" etc. → customer rejected this product
    // Return null so the pipeline can handle it as a fresh question (show catalog or clarify)
    const NEGATION_PREFIXES = ["ไม่เอา", "ไม่ชอบ", "ไม่สนใจ", "ไม่ต้องการ", "ไม่อยากได้", "ไม่เอา", "not interested", "no thanks", "don't want"];
    if (NEGATION_PREFIXES.some((n) => lower.startsWith(n) || lower.includes(" " + n))) {
      return null; // Let pipeline handle as new query
    }

    const affirmations = ["เอา", "ได้", "ครับ", "ค่ะ", "โอเค", "ok", "yes", "ตกลง", "เอาเลย"];
    if (affirmations.some((a) => lower === a || lower.startsWith(a + " "))) {
      return `ดีเลยครับ! สำหรับ **${p.name}** ราคา **${p.price.toLocaleString()} บาท**\n\nสามารถสั่งซื้อได้ผ่าน:\n${biz.orderChannelsText}\n\nหรือต้องการทราบข้อมูลเพิ่มเติมก่อนไหมครับ?`;
    }

    return `**${p.name}** ครับ\n\n${p.description.split("\n")[0]}\n💰 ราคา: **${p.price.toLocaleString()} บาท**\n📂 หมวดหมู่: ${p.category}\n${p.status === "discontinue" ? `⚠️ ยกเลิกจำหน่าย → แนะนำ **${p.recommendedAlternative}**` : "✅ พร้อมจำหน่าย"}\n\nต้องการทราบเรื่องอะไรเพิ่มเติมครับ?`;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// PRODUCT DETAIL HELPERS
// ─────────────────────────────────────────────────────────────

const GENERIC_PRODUCT_TAGS = new Set([
  "มอเตอร์ไซค์ไฟฟ้า", "em", "จดทะเบียนได้",
  "แบตเตอรี่", "lifepo4", "12v", "auxiliary battery", "รถยนต์ไฟฟ้า",
  "อุปกรณ์เสริม", "บริการ", "เปลี่ยนแบตเตอรี่",
]);

/**
 * Find a specific product mentioned by name in the user message.
 * Sorts by extracted model name length (descending) to match more
 * specific names first — e.g. "Legend Pro" before "Legend".
 */
function findSpecificProductInCategory(
  messageLower: string,
  products: Product[],
  brandPrefix: string
): Product | null {
  const prefixLower = brandPrefix.toLowerCase();

  // Build candidates with their extracted model names
  const candidates = products.map((p) => {
    const nameLower = p.name.toLowerCase();
    const modelName = nameLower.startsWith(prefixLower)
      ? nameLower.slice(prefixLower.length).trim()
      : nameLower;
    return { product: p, modelName };
  });

  // Sort by model name length descending (match longest/most specific first)
  candidates.sort((a, b) => b.modelName.length - a.modelName.length);

  // Pass 1: Full product name match
  for (const c of candidates) {
    if (messageLower.includes(c.product.name.toLowerCase())) return c.product;
  }

  // Pass 2: Model name match (e.g. "legend pro", "qarez", "owen long range")
  for (const c of candidates) {
    if (c.modelName.length > 2 && messageLower.includes(c.modelName)) {
      return c.product;
    }
  }

  // Pass 3: Tag-based match for partial names (e.g. "Owen" → tag "Owen" on EM Owen Long Range)
  for (const c of candidates) {
    for (const tag of c.product.tags) {
      const tl = tag.toLowerCase();
      if (tl.length > 2 && !GENERIC_PRODUCT_TAGS.has(tl) && messageLower.includes(tl)) {
        return c.product;
      }
    }
  }

  return null;
}

/**
 * Build a detailed response for a specific EM motorcycle model.
 */
function buildDetailedEMResponse(p: Product, biz: BusinessConfig): string {
  const lines: string[] = [];
  const descLines = p.description.split("\n");
  const thaiDesc = descLines[0];
  const specLine = descLines.find((l) => l.includes("Motor:"));

  lines.push(`**${p.name}** ครับ`);
  lines.push("");
  lines.push(`💰 ราคา: **${p.price.toLocaleString()} บาท**`);
  lines.push("");

  // Specs — parse from Motor: / Battery: / Range: / Top Speed: / Charge: line
  lines.push("📋 สเปค:");
  if (specLine) {
    const motor = specLine.match(/Motor:\s*([^\|]+)/)?.[1]?.trim() || "";
    const battery = specLine.match(/Battery:\s*([^\|]+)/)?.[1]?.trim() || "";
    const rangeRaw = specLine.match(/Range:\s*([^\|]+)/)?.[1]?.trim() || "";
    const speedRaw = specLine.match(/Top Speed:\s*([^\|]+)/)?.[1]?.trim() || "";
    // Strip trailing unit suffixes to avoid double-printing
    const range = rangeRaw.replace(/\s*km\s*$/i, "").trim();
    const speed = speedRaw.replace(/\s*km\/h\s*$/i, "").trim();
    const charge = specLine.match(/Charge:\s*([^\|]+)/)?.[1]?.trim() || "";
    if (motor) lines.push(`  • มอเตอร์: ${motor}`);
    if (battery) lines.push(`  • แบตเตอรี่: ${battery}`);
    if (range) lines.push(`  • ระยะวิ่ง: ${range} กม./ชาร์จ`);
    if (speed) lines.push(`  • ความเร็วสูงสุด: ${speed} กม./ชม.`);
    if (charge) lines.push(`  • เวลาชาร์จ: ${charge}`);
  }
  lines.push("");

  // Features — pull first sentence of Thai description
  lines.push("✨ จุดเด่น:");
  // Extract the first Thai sentence as the highlight
  const highlight = thaiDesc.split(/[.。]/)[0].trim();
  if (highlight) lines.push(`  • ${highlight}`);
  if (thaiDesc.includes("จดทะเบียน") || p.tags.includes("จดทะเบียนได้")) {
    lines.push("  • จดทะเบียนได้ตามกฎหมาย ผ่านมาตรฐาน มอก. + UNR136");
  }
  lines.push("");

  // Warranty — read from description Warranty: line
  const warrantyLine = descLines.find((l) => l.startsWith("Warranty:"));
  lines.push("🔧 รับประกัน:");
  if (warrantyLine) {
    const parts = warrantyLine.replace("Warranty:", "").split("|").map((s) => s.trim()).filter(Boolean);
    for (const part of parts) lines.push(`  • ${part}`);
  } else {
    lines.push("  • มอเตอร์: 5 ปี / 30,000 กม.");
    lines.push("  • แบตเตอรี่คอนโทรลเลอร์: 3 ปี / 20,000 กม.");
    lines.push("  • ระบบไฟฟ้า: 1 ปี / 10,000 กม.");
  }
  lines.push("");
  lines.push("📞 สนใจสั่งซื้อหรือนัดทดลองขับได้เลยครับ");
  lines.push(biz.orderChannelsText);

  return lines.join("\n");
}

/**
 * Build a catalog list of all EM motorcycles with specs (for generic EM inquiry).
 */
function buildEMCatalogResponse(products: Product[], biz: BusinessConfig): string {
  const lines: string[] = [];
  lines.push(`${biz.name} เป็นตัวแทนจำหน่ายมอเตอร์ไซค์ไฟฟ้า EM อย่างเป็นทางการครับ`);
  lines.push("");
  lines.push("รุ่นที่มีจำหน่าย:");

  // Sort by price ascending
  const sorted = [...products].sort((a, b) => a.price - b.price);

  for (const p of sorted) {
    const specLine = p.description.split("\n").find((l) => l.includes("Motor:"));
    let specs = "";
    if (specLine) {
      const motor = specLine.match(/Motor:\s*(\d+W)/)?.[1] || "";
      const range = specLine.match(/Range:\s*([\d\-]+)\s*km/)?.[1] || "";
      const speed = specLine.match(/Top Speed:\s*([\d\-]+)\s*km\/h/)?.[1] || "";
      if (motor && range && speed) {
        specs = ` (มอเตอร์ ${motor}, วิ่ง ${range} กม./ชาร์จ, เร็วสุด ${speed} กม./ชม.)`;
      }
    }
    lines.push(`• **${p.name}** — ${p.price.toLocaleString()} บาท${specs}`);
  }

  lines.push("");
  lines.push("ทุกรุ่นจดทะเบียนได้ตามกฎหมายครับ");
  lines.push("สนใจรุ่นไหนครับ? พิมพ์ชื่อรุ่นได้เลย ผมจะให้รายละเอียดเต็มครับ!");

  return lines.join("\n");
}

/**
 * Build a detailed response for a specific product (generic — batteries, accessories, etc.)
 */
function buildDetailedProductResponseGeneric(p: Product, biz: BusinessConfig): string {
  const lines: string[] = [];
  lines.push(`**${p.name}** ครับ`);
  lines.push("");
  lines.push(`💰 ราคา: ${p.price > 0 ? `**${p.price.toLocaleString()} บาท**` : "**ฟรี** (รวมในค่าสินค้า)"}`);
  lines.push("");

  // Description — split into readable lines
  const descLines = p.description.split("\n");
  lines.push("📋 รายละเอียด:");
  for (const line of descLines) {
    if (line.trim()) lines.push(`  ${line.trim()}`);
  }
  lines.push("");

  lines.push(`📂 หมวดหมู่: ${p.category}`);

  if (p.status === "discontinue") {
    lines.push("⚠️ สินค้ายกเลิกจำหน่ายแล้ว");
    if (p.recommendedAlternative) {
      lines.push(`➡️ แนะนำ: **${p.recommendedAlternative}**`);
    }
  } else {
    lines.push("✅ พร้อมจำหน่าย");
  }
  lines.push("");

  lines.push("📞 สนใจสั่งซื้อหรือสอบถามเพิ่มเติมได้เลยครับ");
  lines.push(biz.orderChannelsText);

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT — business-aware (for GPT fallback)
// ─────────────────────────────────────────────────────────────

export function buildSystemPrompt(biz: BusinessConfig, offHoursNote?: string, chatSummary?: ChatSummary | null): string {
  const activeProducts = biz.getActiveProducts();
  const discontinuedProducts = biz.products.filter(
    (p) => p.status === "discontinue"
  );

  const formatProduct = (p: Product) =>
    `- [ID:${p.id}] ${p.name} | ราคา ${p.price.toLocaleString()} บาท | ${p.category} | ${p.description.split("\n")[0]}${p.recommendedAlternative ? ` → แนะนำ: ${p.recommendedAlternative}` : ""}`;

  const productList = [
    "### Active Products:",
    ...activeProducts.map(formatProduct),
    ...(discontinuedProducts.length > 0
      ? [
          "",
          "### Discontinued Products (แจ้งลูกค้าและแนะนำรุ่นทดแทนเสมอ):",
          ...discontinuedProducts.map(formatProduct),
        ]
      : []),
  ].join("\n");

  const faqList = biz.faqData
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  const saleScriptList = biz.saleScripts
    .map((s) => `- Triggers: ${s.triggers.join(", ")}\n  Reply: ${s.adminReply}`)
    .join("\n");

  const knowledgeList = biz.knowledgeDocs
    .map((d) => `[${d.title}]\n${d.content}`)
    .join("\n\n");

  const categories = biz.getCategories().join(", ");

  const intentPolicyList = biz.intents
    .filter((i) => i.active)
    .sort((a, b) => a.number - b.number)
    .map(
      (i) =>
        `### Intent #${i.number}: ${i.name}\n` +
        `Triggers: ${i.triggers.length > 0 ? i.triggers.join(", ") : "(fallback/default)"}\n` +
        `Policy: ${i.policy}\n` +
        `Template: ${i.responseTemplate}`
    )
    .join("\n\n");

  const summarySection = chatSummary
    ? `\n\n## บริบทการสนทนาก่อนหน้า (Chat Summary):\n` +
      `- หัวข้อหลัก: ${chatSummary.topic}\n` +
      `- ผลลัพธ์: ${chatSummary.outcome}\n` +
      `- ความรู้สึกลูกค้า: ${chatSummary.sentiment}\n` +
      `- ประเด็นสำคัญ: ${chatSummary.keyPoints.slice(0, 5).join("; ")}\n` +
      (chatSummary.pendingAction ? `- สิ่งที่รอดำเนินการ: ${chatSummary.pendingAction}\n` : "") +
      `(ใช้ข้อมูลนี้เป็น context ของการสนทนา ไม่ต้องถามซ้ำในสิ่งที่ลูกค้าได้แจ้งไว้แล้ว)`
    : "";

  const staticPart = `${biz.systemPromptIdentity}

## กฎเหล็ก (ห้ามละเมิดเด็ดขาด):
1. **ห้ามยืนยันสต็อก** — ไม่มีข้อมูลสต็อกเรียลไทม์ ให้ตอบว่า "ผมขออนุญาตตรวจสอบกับทีมงานให้แน่ชัดก่อนนะครับ"
2. **ถ้าลูกค้าขอคุยกับแอดมิน/คนจริง** — โอนทันทีและหยุดตอบ
3. **ไม่มี VAT Refund** สำหรับนักท่องเที่ยว
4. **สินค้า DISCONTINUE** — แจ้งและแนะนำรุ่นทดแทนเสมอ
5. **ห้ามแต่งข้อมูลสินค้า** ที่ไม่มีในระบบ
6. **ห้ามส่ง payment link** ทาง chat
7. ราคาแสดงเป็นบาทเสมอ รูปแบบ: 12,650 บาท
8. ถ้าไม่มีข้อมูล ให้แนะนำติดต่อผ่านช่องทางอย่างเป็นทางการ`;

  const dynamicPart = `## หมวดหมู่สินค้า: ${categories}

## รายการสินค้า:
${productList}

## FAQ:
${faqList}

## Sale Scripts (ยึดตามนี้เมื่อตรงกับคำถาม):
${saleScriptList}

## Knowledge Base:
${knowledgeList}

## Intent Policies (ต้องยึดตาม policy ของแต่ละ intent อย่างเคร่งครัด):
${intentPolicyList}${summarySection}${offHoursNote ? `\n\n## สถานะเวลาทำการ:\n${offHoursNote}` : ""}`;

  return `${staticPart}\n\n${dynamicPart}`;
}

/**
 * Returns the system prompt split into two parts for Anthropic prompt caching.
 * - staticPart: persona + iron rules (never changes) → mark with cache_control
 * - dynamicPart: product list, FAQ, intent policies, summary, off-hours (changes per request)
 *
 * Use this instead of buildSystemPrompt() when calling Anthropic API directly
 * to enable prompt caching and reduce token costs by ~60-80%.
 */
export function buildSystemPromptParts(
  biz: BusinessConfig,
  offHoursNote?: string,
  chatSummary?: ChatSummary | null
): { staticPart: string; dynamicPart: string } {
  const activeProducts = biz.getActiveProducts();
  const discontinuedProducts = biz.products.filter((p) => p.status === "discontinue");

  const formatProduct = (p: Product) =>
    `- [ID:${p.id}] ${p.name} | ราคา ${p.price.toLocaleString()} บาท | ${p.category} | ${p.description.split("\n")[0]}${p.recommendedAlternative ? ` → แนะนำ: ${p.recommendedAlternative}` : ""}`;

  const productList = [
    "### Active Products:",
    ...activeProducts.map(formatProduct),
    ...(discontinuedProducts.length > 0
      ? ["", "### Discontinued Products (แจ้งลูกค้าและแนะนำรุ่นทดแทนเสมอ):", ...discontinuedProducts.map(formatProduct)]
      : []),
  ].join("\n");

  const faqList = biz.faqData.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
  const saleScriptList = biz.saleScripts.map((s) => `- Triggers: ${s.triggers.join(", ")}\n  Reply: ${s.adminReply}`).join("\n");
  const knowledgeList = biz.knowledgeDocs.map((d) => `[${d.title}]\n${d.content}`).join("\n\n");
  const categories = biz.getCategories().join(", ");

  const intentPolicyList = biz.intents
    .filter((i) => i.active)
    .sort((a, b) => a.number - b.number)
    .map((i) =>
      `### Intent #${i.number}: ${i.name}\n` +
      `Triggers: ${i.triggers.length > 0 ? i.triggers.join(", ") : "(fallback/default)"}\n` +
      `Policy: ${i.policy}\n` +
      `Template: ${i.responseTemplate}`
    )
    .join("\n\n");

  const summarySection = chatSummary
    ? `\n\n## บริบทการสนทนาก่อนหน้า (Chat Summary):\n` +
      `- หัวข้อหลัก: ${chatSummary.topic}\n` +
      `- ผลลัพธ์: ${chatSummary.outcome}\n` +
      `- ความรู้สึกลูกค้า: ${chatSummary.sentiment}\n` +
      `- ประเด็นสำคัญ: ${chatSummary.keyPoints.slice(0, 5).join("; ")}\n` +
      (chatSummary.pendingAction ? `- สิ่งที่รอดำเนินการ: ${chatSummary.pendingAction}\n` : "") +
      `(ใช้ข้อมูลนี้เป็น context ของการสนทนา ไม่ต้องถามซ้ำในสิ่งที่ลูกค้าได้แจ้งไว้แล้ว)`
    : "";

  const staticPart = `${biz.systemPromptIdentity}

## กฎเหล็ก (ห้ามละเมิดเด็ดขาด):
1. **ห้ามยืนยันสต็อก** — ไม่มีข้อมูลสต็อกเรียลไทม์ ให้ตอบว่า "ผมขออนุญาตตรวจสอบกับทีมงานให้แน่ชัดก่อนนะครับ"
2. **ถ้าลูกค้าขอคุยกับแอดมิน/คนจริง** — โอนทันทีและหยุดตอบ
3. **ไม่มี VAT Refund** สำหรับนักท่องเที่ยว
4. **สินค้า DISCONTINUE** — แจ้งและแนะนำรุ่นทดแทนเสมอ
5. **ห้ามแต่งข้อมูลสินค้า** ที่ไม่มีในระบบ
6. **ห้ามส่ง payment link** ทาง chat
7. ราคาแสดงเป็นบาทเสมอ รูปแบบ: 12,650 บาท
8. ถ้าไม่มีข้อมูล ให้แนะนำติดต่อผ่านช่องทางอย่างเป็นทางการ`;

  const dynamicPart = `## หมวดหมู่สินค้า: ${categories}

## รายการสินค้า:
${productList}

## FAQ:
${faqList}

## Sale Scripts (ยึดตามนี้เมื่อตรงกับคำถาม):
${saleScriptList}

## Knowledge Base:
${knowledgeList}

## Intent Policies (ต้องยึดตาม policy ของแต่ละ intent อย่างเคร่งครัด):
${intentPolicyList}${summarySection}${offHoursNote ? `\n\n## สถานะเวลาทำการ:\n${offHoursNote}` : ""}`;

  return { staticPart, dynamicPart };
}

// ─────────────────────────────────────────────────────────────
// CLARIFICATION ENGINE
// ─────────────────────────────────────────────────────────────

interface ClarifyResult {
  question: string;
  options: string[];
}

/**
 * Returns a clarify question + quick-reply options when the pipeline is not confident.
 *
 * Triggers:
 *   A) No intent matched at all (score = 0) and message > 1 char
 *   B) Top intent score is low (2–3) AND message is substantive (> 5 chars)
 *      → pipeline matched something but not confidently enough to act
 *   C) Top-2 intent scores are tied (within 1.5 points) AND both ≥ 2
 *      → ambiguous between two intents
 *
 * Does NOT trigger for:
 *   - Very short messages (≤ 5 chars) — handled by greeting/affirmation layers
 *   - Common greetings / single affirmations
 *   - Messages where a product was found in context (Layer 5 or product search handles those)
 */
function buildClarifyResponse(
  message: string,
  allScores: IntentScore[],
  ctx: ConversationContext,
  biz: BusinessConfig
): ClarifyResult | null {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const topScore = allScores[0]?.score ?? 0;
  const secondScore = allScores[1]?.score ?? 0;

  // Skip very short messages and common greetings / single affirmations
  if (trimmed.length <= 5) return null;
  const skipWords = ["สวัสดี", "หวัดดี", "hello", "hi", "ok", "โอเค", "ครับ", "ค่ะ", "ได้", "เอา", "?", "??", "ขอบคุณ", "thank you", "thanks"];
  if (skipWords.some((w) => lower === w || lower === w + "ครับ" || lower === w + "ค่ะ")) return null;

  const defaultOptions = biz.categoryChecks.slice(0, 4).map((c) => c.label);
  if (defaultOptions.length === 0) defaultOptions.push("ราคาสินค้า", "สินค้าแนะนำ", "ติดต่อเรา");

  // Case A: no intent matched at all
  if (topScore === 0) {
    return {
      question: `ขอบคุณที่ติดต่อ **${biz.name}** ครับ 😊\n\nขอทราบว่าสนใจเรื่องอะไรครับ?`,
      options: defaultOptions,
    };
  }

  // Case B: low-confidence match (score 2–3) — pipeline matched a trigger but weakly
  // Only clarify if the message is substantive enough to warrant a real question
  const LOW_CONFIDENCE_MAX = 3;
  if (topScore <= LOW_CONFIDENCE_MAX && trimmed.length > 5) {
    const guessedIntent = allScores[0].intent;
    return {
      question: `ขอทราบให้แน่ใจก่อนนะครับ — กำลังถามเรื่อง **${guessedIntent.name}** ใช่ไหมครับ?\n\nหรือสนใจเรื่องอื่นครับ?`,
      options: [guessedIntent.name, ...defaultOptions.filter((o) => o !== guessedIntent.name).slice(0, 3)],
    };
  }

  // Case C: top-2 intents are very close (tied) — could be either
  if (topScore >= 2 && secondScore >= 2 && (topScore - secondScore) <= 1.5) {
    const a = allScores[0].intent.name;
    const b = allScores[1].intent.name;
    return {
      question: `ขอทราบให้ชัดขึ้นหน่อยได้ไหมครับ — ถามเรื่องอะไรครับ?`,
      options: [a, b, ...defaultOptions.filter((o) => o !== a && o !== b).slice(0, 2)],
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// PIPELINE — with conversation context & tracing (business-aware)
// ─────────────────────────────────────────────────────────────

function now() {
  return performance.now();
}

export function generatePipelineResponseWithTrace(
  userMessage: string,
  allMessages: ChatMessage[],
  biz: BusinessConfig,
  pendingForm?: PendingForm | null
): TracedResult {
  const pipelineStart = now();
  const lower = userMessage.toLowerCase();
  const steps: PipelineStep[] = [];
  let finalLayer = 0;
  let finalLayerName = "";
  let finalIntent: string | undefined;

  /**
   * Wrap a candidate response with the repetition guard.
   * If the candidate is too similar to a recent bot reply, return null
   * so the pipeline can fall through to the next layer.
   *
   * Safety layers (1-4) and escalation responses are NEVER suppressed —
   * it is important that admin escalation / stock / VAT replies always fire.
   *
   * @param candidate  The response string to evaluate
   * @param isSafetyLayer  Set to true for layers 1-4 and admin escalation
   */
  function guardRepetition(candidate: string, isSafetyLayer = false): string | null {
    if (isSafetyLayer) return candidate; // never suppress safety responses
    if (isTooSimilarToRecentReply(candidate, allMessages)) return null;
    return candidate;
  }

  const addStep = (
    layer: number,
    name: string,
    description: string,
    status: PipelineStep["status"],
    startMs: number,
    details?: PipelineStep["details"]
  ) => {
    steps.push({
      layer,
      name,
      description,
      status,
      durationMs: Math.round((now() - startMs) * 100) / 100,
      details,
    });
  };

  // ─────────────────────────────────────────────────────────────
  // QUOTATION FORM — multi-turn data collection
  // ─────────────────────────────────────────────────────────────

  /** Steps in the quotation form — in order */
  const QUOTATION_STEPS: Array<{
    key: keyof QuotationFormData;
    question: string;
    label: string;
  }> = [
    { key: "items",   label: "รายการสินค้า/บริการ",       question: "ขอทราบรายการสินค้าหรือบริการที่ต้องการใบเสนอราคาด้วยครับ 📋\n(เช่น EM Milano 1 คัน, EM Legend Pro 2 คัน)" },
    { key: "orgName", label: "ชื่อหน่วยงาน/บริษัท",       question: "ขอทราบชื่อหน่วยงานหรือบริษัทที่จะออกใบเสนอราคาให้ด้วยครับ 🏢" },
    { key: "address", label: "ที่อยู่",                   question: "ขอที่อยู่สำหรับออกใบเสนอราคาด้วยครับ 📍\n(เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์)" },
    { key: "taxId",   label: "เลขที่ผู้เสียภาษี",         question: "ขอเลขที่ผู้เสียภาษี (13 หลัก) ด้วยครับ 🔢" },
    { key: "phone",   label: "เบอร์โทรติดต่อ",            question: "ขอเบอร์โทรศัพท์สำหรับให้เจ้าหน้าที่ติดต่อกลับด้วยครับ 📞" },
  ];

  /** Cancel keywords — customer wants to abort the form */
  const FORM_CANCEL_KEYWORDS = ["ยกเลิก", "cancel", "ไม่เอาแล้ว", "เลิก", "หยุด", "stop", "ออก"];

  // ── LAYER -1: Pending Quotation Form (runs before everything else) ──
  if (pendingForm?.type === "quotation") {
    const t0 = now();
    const msg = userMessage.trim();

    // Allow customer to cancel mid-form
    if (FORM_CANCEL_KEYWORDS.some((k) => msg.toLowerCase().includes(k))) {
      addStep(-1, "Quotation Form", "ลูกค้ายกเลิก form — ล้าง state", "matched", t0);
      finalLayer = -1;
      finalLayerName = "Quotation Form: cancelled";
      const cancelResult = finishTrace(
        "ยกเลิกการขอใบเสนอราคาแล้วครับ 👍\n\nถ้าต้องการใบเสนอราคาในภายหลัง พิมพ์ \"ขอใบเสนอราคา\" ได้เลยนะครับ!"
      );
      cancelResult.pendingFormUpdate = null; // clear form
      return cancelResult;
    }

    const currentStep = pendingForm.step;
    const stepDef = QUOTATION_STEPS[currentStep];

    if (stepDef) {
      // Save the answer to current step
      const updatedData: Partial<QuotationFormData> = {
        ...pendingForm.data,
        [stepDef.key]: msg,
      };
      const nextStep = currentStep + 1;

      if (nextStep < QUOTATION_STEPS.length) {
        // More steps to collect
        const nextStepDef = QUOTATION_STEPS[nextStep];
        addStep(-1, "Quotation Form", `เก็บ "${stepDef.label}" → ถาม "${nextStepDef.label}"`, "matched", t0, {
          intent: `quotation_form:step_${currentStep}→${nextStep}`,
        });
        finalLayer = -1;
        finalLayerName = `Quotation Form: step ${nextStep}/${QUOTATION_STEPS.length}`;
        const midResult = finishTrace(
          `รับทราบแล้วครับ ✅\n\n${nextStepDef.question}`
        );
        midResult.pendingFormUpdate = {
          type: "quotation",
          step: nextStep,
          data: updatedData,
        };
        return midResult;
      } else {
        // All steps done — build summary and escalate
        const finalData = updatedData as QuotationFormData;
        const summary = [
          "📋 **ข้อมูลสำหรับออกใบเสนอราคา**",
          "",
          `• รายการ: ${finalData.items}`,
          `• หน่วยงาน/บริษัท: ${finalData.orgName}`,
          `• ที่อยู่: ${finalData.address}`,
          `• เลขที่ผู้เสียภาษี: ${finalData.taxId}`,
          `• เบอร์โทร: ${finalData.phone}`,
        ].join("\n");

        addStep(-1, "Quotation Form", "เก็บข้อมูลครบแล้ว — escalate แอดมิน", "matched", t0, {
          intent: "quotation_form:complete",
        });
        finalLayer = -1;
        finalLayerName = "Quotation Form: complete → escalate";

        const doneText =
          `ขอบคุณครับ! ได้รับข้อมูลครบแล้วครับ 🙏\n\n${summary}\n\n` +
          `ทีมงานจะจัดทำใบเสนอราคาและติดต่อกลับที่เบอร์ **${finalData.phone}** โดยเร็วที่สุดครับ ⏰`;

        const doneResult = finishTrace(doneText);
        doneResult.pendingFormUpdate = null; // clear form
        doneResult.isAdminEscalation = true; // pin + notify admin
        return doneResult;
      }
    }
  }

  // ── LAYER 0: Conversation Context Extraction ──
  let t = now();
  const ctx = extractConversationContext(allMessages, userMessage, biz);
  addStep(0, "Context Extraction", "วิเคราะห์บริบทจากประวัติแชท", "checked", t, {
    intent: ctx.summary,
    matchedProducts: ctx.recentProducts.map((p) => p.name),
    productsCount: ctx.recentProducts.length,
  });

  // ── LAYER 1: Admin Escalation ──
  t = now();

  // Extended service/repair escalation: customer says they're coming in or has a repair issue.
  // These are appointment / after-sales messages that only a human admin can handle.
  const SERVICE_ESCALATION_KEYWORDS = [
    // Appointment / visit
    "เอารถเข้า", "นำรถเข้า", "พารถเข้า", "จะเข้าไป", "จะเข้าศูนย์", "เข้าศูนย์",
    "นัดช่าง", "นัดซ่อม", "นัดเช็ค", "นัดหมาย",
    // Repair / part issue
    "ลูกปืน", "โช๊ค", "ผ้าเบรก", "เบรก", "ยาง", "สายพาน",
    "มอเตอร์เสีย", "มอเตอร์พัง", "ระบบไฟ", "ฟิวส์",
    "ซ่อม", "เปลี่ยนอะไหล่", "อะไหล่", "พังแล้ว", "เสียแล้ว",
    // Service check
    "เช็คระยะ", "เช็ครถ", "เช็คช่าง", "เช็คลูกปืน", "เช็คเบรก",
    "ตรวจรถ", "ตรวจเช็ค",
  ];
  const isServiceEscalation = SERVICE_ESCALATION_KEYWORDS.some((k) => lower.includes(k));

  if (biz.matchAdminEscalation(userMessage) || isServiceEscalation) {
    const triggerInfo = isServiceEscalation
      ? SERVICE_ESCALATION_KEYWORDS.filter((k) => lower.includes(k))
      : ["admin escalation keywords"];
    addStep(1, "Admin Escalation", "ตรวจจับคำขอคุยกับแอดมิน/นัดหมาย/ซ่อม", "matched", t, {
      matchedTriggers: triggerInfo,
    });
    finalLayer = 1;
    finalLayerName = "Safety: Admin Escalation";
    const escalationResult = finishTrace(biz.buildAdminEscalationResponse());
    escalationResult.isAdminEscalation = true;
    return escalationResult;
  }
  addStep(1, "Admin Escalation", "ตรวจจับคำขอคุยกับแอดมิน/คนจริง", "skipped", t);

  // ── LAYER 2: VAT Refund ──
  t = now();
  if (biz.matchVatRefund(userMessage)) {
    addStep(2, "VAT Refund", "ตรวจจับคำถามเรื่อง VAT Refund", "matched", t);
    finalLayer = 2;
    finalLayerName = "Safety: VAT Refund";
    return finishTrace(biz.buildVatRefundResponse());
  }
  addStep(2, "VAT Refund", "ตรวจจับคำถามเรื่อง VAT Refund", "skipped", t);

  // ── LAYER 3: Stock Inquiry ──
  t = now();
  if (biz.matchStockInquiry(userMessage)) {
    // Guard: if the user is asking about a part/component (e.g. โช๊ค, ลูกปืน, ผ้าเบรก)
    // they are NOT asking about product stock — they have a technical/repair question.
    // These are handled by the service escalation in Layer 1, but if they slip through,
    // don't misclassify them as a stock inquiry.
    const PARTS_SIGNALS = ["โช๊ค", "ลูกปืน", "ผ้าเบรก", "สายพาน", "อะไหล่", "ฮอนด้า", "ยามาฮ่า", "ใส่แทน", "เทียบ"];
    const isParts = PARTS_SIGNALS.some((k) => lower.includes(k));

    if (!isParts) {
      if (ctx.activeProduct) {
        const stockMsg = `ผมขออนุญาตตรวจสอบสต็อก **${ctx.activeProduct.name}** กับทีมงานให้แน่ชัดก่อนนะครับ\n\nเพื่อข้อมูลที่ถูกต้อง 100% ครับ ระหว่างนี้ ให้ผมช่วยแนะนำข้อมูลส่วนอื่นก่อนไหมครับ?`;
        // Guard: don't repeat the same stock message
        if (!isTooSimilarToRecentReply(stockMsg, allMessages)) {
          addStep(3, "Stock Inquiry", "ตรวจจับคำถามสต็อก + มีบริบทสินค้า", "matched", t, {
            matchedProducts: [ctx.activeProduct.name],
          });
          finalLayer = 3;
          finalLayerName = "Safety: Stock (contextual)";
          return finishTrace(stockMsg);
        } else {
          addStep(3, "Stock Inquiry", "stock reply ซ้ำ — pass-through", "checked", t, {
            matchedProducts: [ctx.activeProduct.name],
          });
        }
      } else {
        addStep(3, "Stock Inquiry", "ตรวจจับคำถามเรื่องสต็อกสินค้า", "matched", t);
        finalLayer = 3;
        finalLayerName = "Safety: Stock Inquiry";
        return finishTrace(biz.buildStockCheckResponse());
      }
    } else {
      addStep(3, "Stock Inquiry", "ตรวจพบ parts/repair query — ข้ามไป escalation", "skipped", t);
    }
  } else {
    addStep(3, "Stock Inquiry", "ตรวจจับคำถามเรื่องสต็อกสินค้า", "skipped", t);
  }

  // ── LAYER 4: Discontinued product detection ──
  t = now();
  const discontinued = biz.matchDiscontinued(userMessage);
  if (discontinued) {
    addStep(4, "Discontinued Detection", "ตรวจจับสินค้าที่ยกเลิกจำหน่าย", "matched", t, {
      matchedTriggers: [discontinued.recommended],
      intent: "discontinued_product",
    });
    finalLayer = 4;
    finalLayerName = "Discontinued Detection";
    finalIntent = "discontinued_product";
    return finishTrace(biz.buildDiscontinuedResponse(discontinued));
  }
  addStep(4, "Discontinued Detection", "ตรวจจับสินค้าที่ยกเลิกจำหน่าย", "skipped", t);

  // ── LAYER 5: Conversation Context Resolution ──
  t = now();
  if (ctx.isFollowUp && ctx.activeProduct) {
    // Safety gate: if this message scores high on an escalation intent, skip Layer 5
    // so the intent engine (Layer 6) can handle it correctly.
    // This prevents "ขอใบเสนอราคา", "ซ่อมรถ", "มีรถไหม" from being answered as a
    // product follow-up just because a product was recently mentioned.
    const ESCALATION_INTENT_IDS = new Set([
      "em_motorcycle_service",
      "specific_color_stock",
      "quotation_request",
      "admin_escalation",
    ]);
    const preScore = scoreIntents(userMessage, biz);
    const preTop = preScore.length > 0 && preScore[0].score >= 2 ? preScore[0] : null;
    const isEscalationIntent = preTop && ESCALATION_INTENT_IDS.has(preTop.intent.id);

    // ── Catalog-browse guard: "มีรุ่นอื่นไหม", "แนะนำรุ่นอื่น" etc.
    // Customer wants to browse alternatives — show category catalog, not follow-up on active product
    const CATALOG_BROWSE_PATTERNS = [
      "มีรุ่นอื่นไหม", "มีรุ่นอื่นมั้ย", "รุ่นอื่นไหม", "รุ่นอื่นมั้ย",
      "แนะนำรุ่นอื่น", "แนะนำรุ่นไหน", "มีรุ่นอะไรบ้าง", "มีรุ่นอื่นอีกไหม",
      "other model", "other option", "another model", "what else",
      "ตัวอื่นไหม", "ตัวอื่นมั้ย", "มีตัวอื่นไหม",
    ];
    const isCatalogBrowse = CATALOG_BROWSE_PATTERNS.some((p) => lower.includes(p));

    if (isEscalationIntent) {
      addStep(5, "Context Resolution", `ข้าม Layer 5 — intent "${preTop!.intent.id}" ต้อง escalate`, "skipped", t, {
        intent: preTop!.intent.id,
        score: preTop!.score,
      });
    } else if (isCatalogBrowse) {
      // Show all active products in the same category as the active product
      const category = ctx.activeProduct.category;
      const sameCategory = biz.getActiveProducts().filter((p) => p.category === category);
      let catalogText: string;
      if (sameCategory.length > 0 && category === "มอเตอร์ไซค์ไฟฟ้า EM") {
        catalogText = buildEMCatalogResponse(sameCategory, biz);
      } else if (sameCategory.length > 0) {
        const lines = sameCategory.map((p) => `• **${p.name}** — ${p.price.toLocaleString()} บาท\n  ${p.description.split("\n")[0]}`);
        catalogText = `รุ่นที่มีในหมวด **${category}** ครับ:\n\n${lines.join("\n\n")}\n\nสนใจรุ่นไหนครับ?`;
      } else {
        catalogText = `ขณะนี้มีเฉพาะ **${ctx.activeProduct.name}** ในหมวดนี้ครับ สนใจสอบถามเพิ่มเติมได้เลยครับ!`;
      }
      addStep(5, "Context Resolution", `Catalog browse — แสดงรุ่นทั้งหมดใน ${category}`, "matched", t, {
        intent: "catalog_browse",
        matchedProducts: sameCategory.map((p) => p.name),
      });
      finalLayer = 5;
      finalLayerName = `Context: catalog browse → ${category}`;
      return finishTrace(catalogText);
    } else {
      const contextResponse = buildContextualResponse(ctx, userMessage, biz);
      if (contextResponse) {
        // Apply repetition guard to Layer 5 context responses too.
        // If the bot just answered this same product+topic, pass through so later layers
        // (product search, FAQ, AI) can give a fresh answer.
        const guardedCtx = guardRepetition(contextResponse);
        if (guardedCtx !== null) {
          addStep(5, "Context Resolution", "ตอบต่อเนื่องจากบริบทสนทนา", "matched", t, {
            intent: `follow-up: ${ctx.recentTopic || "general"}`,
            matchedProducts: [ctx.activeProduct.name],
            matchedTriggers: FOLLOW_UP_PATTERNS.filter((p) => lower.includes(p)),
          });
          finalLayer = 5;
          finalLayerName = `Context: ${ctx.activeProduct.name} → ${ctx.recentTopic || "detail"}`;
          return finishTrace(guardedCtx);
        } else {
          addStep(5, "Context Resolution", "context response ซ้ำกับที่ตอบไปแล้ว — pass-through", "checked", t, {
            matchedProducts: [ctx.activeProduct.name],
          });
        }
      } else {
        addStep(5, "Context Resolution", "ตอบต่อเนื่องจากบริบทสนทนา (ไม่จับ topic ได้)", "checked", t, {
          matchedProducts: [ctx.activeProduct.name],
        });
      }
    }
  } else if (ctx.isFollowUp && !ctx.activeProduct) {
    // Follow-up but no product in context — ask which product the customer means
    // Only do this when the message is genuinely short/ambiguous (not a new question)
    if (userMessage.trim().length <= 30 && biz.getActiveProducts().length > 0) {
      const cats = [...new Set(biz.getActiveProducts().map((p) => p.category))];
      const catList = cats.map((c) => `• ${c}`).join("\n");
      const ambiguousMsg = `ขออภัยครับ ผมไม่แน่ใจว่าถามเกี่ยวกับสินค้าตัวไหนครับ 😊\n\nเราจำหน่ายสินค้าหมวดหมู่เหล่านี้ครับ:\n${catList}\n\nรบกวนระบุรุ่นหรือประเภทสินค้าที่สนใจด้วยนะครับ`;
      // Guard: don't repeat this message if bot just said it
      const guardedAmbiguous = guardRepetition(ambiguousMsg);
      if (guardedAmbiguous !== null) {
        addStep(5, "Context Resolution", "Follow-up สั้น แต่ไม่มีสินค้าในบริบท — ถามกลับ", "matched", t);
        finalLayer = 5;
        finalLayerName = "Context: ambiguous follow-up";
        return finishTrace(guardedAmbiguous);
      } else {
        addStep(5, "Context Resolution", "ambiguous follow-up ซ้ำ — pass-through", "checked", t);
      }
    } else {
      addStep(5, "Context Resolution", "Follow-up แต่ไม่มีสินค้าในบริบท", "skipped", t);
    }
  } else {
    addStep(5, "Context Resolution", "ไม่ใช่ follow-up message", "skipped", t);
  }

  // ── LAYER 6: Intent Engine ──
  t = now();
  const allScores = scoreIntents(userMessage, biz);
  const topIntent =
    allScores.length > 0 && allScores[0].score >= 2 ? allScores[0] : null;

  if (topIntent) {
    const { intent } = topIntent;
    const intentDetails: PipelineStep["details"] = {
      intent: intent.name,
      intentId: intent.id,
      score: topIntent.score,
      matchedTriggers: topIntent.matchedTriggers,
      allScores: allScores.slice(0, 5).map((s) => ({
        intent: s.intent.name,
        score: s.score,
      })),
    };

    let intentResponse: string | null = null;

    switch (intent.id) {
      case "cancel_escalation": {
        // Signal to the webhook: re-enable bot + unpin, then reply normally
        const cancelResult = finishTrace(intent.responseTemplate);
        cancelResult.isCancelEscalation = true;
        cancelResult.clarifyOptions = biz.categoryChecks.slice(0, 4).map((c) => c.label);
        addStep(6, "Intent Engine", "จับ intent ด้วย multi-signal scoring", "matched", t, intentDetails);
        finalLayer = 6;
        finalLayerName = `Intent: ${intent.name}`;
        finalIntent = intent.id;
        return cancelResult;
      }
      case "greeting": {
        // If there is prior conversation history, use a short acknowledgement
        // instead of the full welcome message to avoid repeating it every time
        const isReturningGreet = allMessages.length > 2;
        // Rotate short greeting variants to avoid saying the same thing every time
        const GREETING_VARIANTS = [
          "สวัสดีครับ! มีอะไรให้ช่วยเพิ่มเติมไหมครับ?",
          "สวัสดีครับ! วันนี้สนใจเรื่องอะไรครับ?",
          "ยินดีต้อนรับครับ! ถามได้เลยครับ 😊",
          "สวัสดีครับ! ให้ผมช่วยอะไรได้บ้างครับ?",
        ];
        const variantIdx = allMessages.length % GREETING_VARIANTS.length;
        const greetText = isReturningGreet
          ? GREETING_VARIANTS[variantIdx]
          : intent.responseTemplate;
        const greetResult = finishTrace(greetText);
        greetResult.clarifyOptions = isReturningGreet
          ? []
          : biz.categoryChecks.slice(0, 4).map((c) => c.label);
        addStep(6, "Intent Engine", "จับ intent ด้วย multi-signal scoring", "matched", t, intentDetails);
        finalLayer = 6;
        finalLayerName = `Intent: ${intent.name}`;
        finalIntent = intent.id;
        return greetResult;
      }
      case "category_select_battery":
        intentResponse = intent.responseTemplate;
        break;
      case "category_select_motorcycle": {
        // Show full EM catalog with specs
        const emCatProds = biz.getActiveProducts().filter((p) => p.category === "มอเตอร์ไซค์ไฟฟ้า EM");
        intentResponse = emCatProds.length > 0 ? buildEMCatalogResponse(emCatProds, biz) : intent.responseTemplate;
        break;
      }
      case "contact_channels":
        intentResponse = biz.buildContactChannelsResponse();
        break;
      case "store_location_hours":
      case "service_plus_options":
      case "service_plus_warranty":
      case "document_service_fee":
      case "training_request":
      case "deposit_policy":
      case "promotion_inquiry":
      case "february_promotion":
      case "installment_inquiry":
      case "offtopic_sensitive":
      case "offtopic_playful":
      case "on_site_service":
      case "warranty_info":
      case "battery_symptom":
      case "support_inquiry":
        intentResponse = intent.responseTemplate;
        break;
      case "em_motorcycle_service":
      case "specific_color_stock": {
        // These always escalate to admin immediately — bot cannot check live stock or handle service
        addStep(6, "Intent Engine", "จับ intent ด้วย multi-signal scoring", "matched", t, intentDetails);
        finalLayer = 6;
        finalLayerName = `Intent: ${intent.name}`;
        finalIntent = intent.id;
        const escalResult = finishTrace(biz.buildAdminEscalationResponse());
        escalResult.isAdminEscalation = true;
        return escalResult;
      }
      case "quotation_request": {
        // Start the quotation form — bot collects details before escalating
        addStep(6, "Intent Engine", "จับ intent ใบเสนอราคา — เริ่ม form", "matched", t, intentDetails);
        finalLayer = 6;
        finalLayerName = "Intent: quotation_request → form start";
        finalIntent = intent.id;
        const firstStep = QUOTATION_STEPS[0];
        const formStartResult = finishTrace(
          `ยินดีช่วยจัดทำใบเสนอราคาให้ครับ! 📄\n\nขอเก็บข้อมูลเพื่อให้เจ้าหน้าที่ติดต่อกลับนะครับ\n(พิมพ์ "ยกเลิก" ได้ทุกเมื่อ)\n\n${firstStep.question}`
        );
        formStartResult.pendingFormUpdate = {
          type: "quotation",
          step: 0,
          data: {},
        };
        return formStartResult;
      }
      case "discontinued_model":
        // Let Layer 4 (matchDiscontinued) handle this; if somehow missed, use template
        intentResponse = intent.responseTemplate;
        break;
      case "em_motorcycle": {
        const EM_CATEGORY = "มอเตอร์ไซค์ไฟฟ้า EM";
        const emProducts = biz.getActiveProducts().filter(
          (p) => p.category === EM_CATEGORY
        );
        if (emProducts.length === 0) {
          intentResponse = intent.responseTemplate;
          break;
        }
        // -- Comparison mode: user asks to compare two models --
        const CMP_SIGNALS = ["กับ", "vs", "ต่างกัน", "เปรียบ", "หรือ"];
        const isCompare = CMP_SIGNALS.some((s) => lower.includes(s));
        if (isCompare) {
          const mentioned = emProducts.filter((p) => {
            const nl = p.name.toLowerCase();
            const mn = nl.startsWith("em ") ? nl.slice(3) : nl;
            return lower.includes(nl) || lower.includes(mn) ||
              p.tags.some((tag) => tag.length > 2 && lower.includes(tag.toLowerCase()));
          });
          if (mentioned.length >= 2) {
            const [pa, pb] = mentioned.slice(0, 2);
            const getSpec = (p: Product) => {
              const sl = p.description.split("\n").find((l: string) => l.includes("Motor:"));
              if (!sl) return { motor: "-", battery: "-", range: "-", speed: "-", charge: "-" };
              const rr = sl.match(/Range:\s*([^\|]+)/)?.[1]?.trim() ?? "-";
              const sr = sl.match(/Top Speed:\s*([^\|]+)/)?.[1]?.trim() ?? "-";
              return {
                motor:   sl.match(/Motor:\s*([^\|]+)/)?.[1]?.trim() ?? "-",
                battery: sl.match(/Battery:\s*([^\|]+)/)?.[1]?.trim() ?? "-",
                range:   rr.replace(/\s*km\s*$/i, "").trim(),
                speed:   sr.replace(/\s*km\/h\s*$/i, "").trim(),
                charge:  sl.match(/Charge:\s*([^\|]+)/)?.[1]?.trim() ?? "-",
              };
            };
            const sa = getSpec(pa); const sb = getSpec(pb);
            const sep = "|---|---|---|";
            intentResponse = [
              `เปรียบเทียบ **${pa.name}** กับ **${pb.name}**`,
              "",
              `| สเปค | ${pa.name} | ${pb.name} |`,
              sep,
              `| ราคา | ${pa.price.toLocaleString()} บาท | ${pb.price.toLocaleString()} บาท |`,
              `| มอเตอร์ | ${sa.motor} | ${sb.motor} |`,
              `| แบตเตอรี่ | ${sa.battery} | ${sb.battery} |`,
              `| ระยะวิ่ง | ${sa.range} กม./ชาร์จ | ${sb.range} กม./ชาร์จ |`,
              `| ความเร็วสูงสุด | ${sa.speed} กม./ชม. | ${sb.speed} กม./ชม. |`,
              `| ชาร์จ | ${sa.charge} | ${sb.charge} |`,
              "",
              `สนใจรุ่นไหนครับ? หรืออยากให้แนะนำตามการใช้งาน?`,
            ].join("\n");
            intentDetails.matchedProducts = [pa.name, pb.name];
            break;
          }
        }

        // ── Single model or catalog ──
        const specificModel = findSpecificProductInCategory(lower, emProducts, "EM ");

        // Before committing to one model, check if the keyword could match MULTIPLE models
        // e.g. "EM LEGEND" matches both "EM Legend G.2" and "EM Legend Pro"
        if (specificModel) {
          const ambiguousMatches = emProducts.filter((p) => {
            const nl = p.name.toLowerCase();
            const modelName = nl.startsWith("em ") ? nl.slice(3) : nl;
            // Check if any tag or sub-word in the product name matches the user query
            return (
              p.id !== specificModel.id &&
              (nl.includes(lower.replace(/\s+/g, " ").trim()) ||
                p.tags.some(
                  (tag) =>
                    tag.length > 2 &&
                    !GENERIC_PRODUCT_TAGS.has(tag.toLowerCase()) &&
                    lower.includes(tag.toLowerCase()) &&
                    specificModel.tags.some((st) => st.toLowerCase() === tag.toLowerCase())
                ) ||
                // Both share a common sub-word from user message (e.g. "legend")
                modelName.split(" ").some(
                  (word) => word.length > 3 && lower.includes(word) && specificModel.name.toLowerCase().includes(word)
                ))
            );
          });

          if (ambiguousMatches.length > 0) {
            // User typed something like "EM Legend" — ask which variant they mean
            const allMatches = [specificModel, ...ambiguousMatches];
            const listStr = allMatches
              .map((p) => `• **${p.name}** — ${p.price.toLocaleString()} บาท`)
              .join("\n");
            intentResponse = `มีหลายรุ่นที่ตรงกับที่ถามครับ:\n\n${listStr}\n\nสนใจรุ่นไหนครับ? พิมพ์ชื่อรุ่นได้เลยครับ 😊`;
            intentDetails.matchedProducts = allMatches.map((p) => p.name);
          } else {
            intentResponse = buildDetailedEMResponse(specificModel, biz);
            intentDetails.matchedProducts = [specificModel.name];
          }
        } else {
          intentResponse = buildEMCatalogResponse(emProducts, biz);
        }
        break;
      }
      case "admin_escalation": {
        // Layer 6 admin_escalation: must also set isAdminEscalation flag
        // so the webhook pins the conversation and disables the bot
        addStep(6, "Intent Engine", "จับ intent ด้วย multi-signal scoring", "matched", t, intentDetails);
        finalLayer = 6;
        finalLayerName = `Intent: ${intent.name}`;
        finalIntent = intent.id;
        const escalL6Result = finishTrace(biz.buildAdminEscalationResponse());
        escalL6Result.isAdminEscalation = true;
        return escalL6Result;
      }
      case "budget_recommendation": {
        // Guard: do NOT parse time expressions as budget (e.g. "14.00น.", "11 โมง", "09:00")
        // A real budget number must be ≥ 100 OR explicitly have บาท/฿ unit
        const TIME_PATTERN = /\b\d{1,2}[.:]\d{2}\s*(น\.?|am|pm|นาฬิกา)?\b|\b\d{1,2}\s*(โมง|ทุ่ม|นาฬิกา)\b/i;
        if (TIME_PATTERN.test(lower)) {
          // Message is about time, not budget — pass through to next layer
          break;
        }
        const budgetMatchRaw = lower.match(/(\d[\d,]*)\s*(บาท|฿)/);
        const budgetMatchNoUnit = lower.match(/(\d{4,})/); // bare number ≥ 4 digits only
        const budgetMatch = budgetMatchRaw || budgetMatchNoUnit;
        const budget = budgetMatch
          ? parseInt(budgetMatch[1].replace(/,/g, ""))
          : null;
        // Sanity: ignore implausibly small "budgets" (< 100 บาท) that are likely not prices
        if (budget !== null && budget < 100) break;

        // Detect context: is the customer asking about a motorcycle or a car battery?
        const MOTO_SIGNALS = ["คัน", "มอไซ", "มอเตอร์ไซ", "motorcycle", "ขับ", "ขี่", "em ", " em", "legend", "milan", "owen", "endo", "หมู่บ้าน", "ในเมือง", "ทางไกล"];
        const BATTERY_SIGNALS = ["แบต", "battery", "byd", "tesla", "mg ", " mg", "neta", "volvo", "bmw", "mercedes", "ora", "ev ", " ev", "รถ", "car"];
        const isMotoContext = MOTO_SIGNALS.some((s) => lower.includes(s));
        const isBatteryContext = BATTERY_SIGNALS.some((s) => lower.includes(s));

        let pool = budget
          ? biz.getActiveProducts().filter((p) => p.price > 0 && p.price <= budget)
          : biz.getActiveProducts().filter((p) => p.price > 0).sort((a, b) => a.price - b.price).slice(0, 5);

        // Narrow pool to relevant category when context is clear
        if (isMotoContext && !isBatteryContext) {
          const motoPool = pool.filter((p) => p.category === "มอเตอร์ไซค์ไฟฟ้า EM");
          if (motoPool.length > 0) pool = motoPool;
        } else if (isBatteryContext && !isMotoContext) {
          const batPool = pool.filter((p) => p.category === "แบตเตอรี่ EV");
          if (batPool.length > 0) pool = batPool;
        } else if (!isMotoContext && !isBatteryContext) {
          // No clear context — prefer motorcycles first since they have meaningful price-point decisions
          const motoPool = pool.filter((p) => p.category === "มอเตอร์ไซค์ไฟฟ้า EM");
          if (motoPool.length > 0) pool = motoPool;
        }

        if (pool.length === 0) {
          if (isMotoContext && !isBatteryContext) {
            // Budget too low for any EM — suggest cheapest EM + financing option
            const cheapestEM = biz.getActiveProducts()
              .filter((p) => p.category === "มอเตอร์ไซค์ไฟฟ้า EM")
              .sort((a, b) => a.price - b.price)[0];
            if (cheapestEM) {
              intentResponse =
                `งบ ${budget ? budget.toLocaleString() + " บาท" : "ที่ระบุ"} อาจน้อยกว่ารุ่นที่มีจำหน่ายครับ\n\n` +
                `รุ่นเริ่มต้นที่ถูกที่สุดของเราคือ **${cheapestEM.name}** — **${cheapestEM.price.toLocaleString()} บาท** ครับ\n\n` +
                `💡 **ผ่อนได้ครับ!** ฟรีดาวน์ / ผ่อน 0% / ทุกอาชีพออกได้\n` +
                `บริการจัดสัญญาถึงบ้าน/ที่ทำงาน ฟรี!\n\n` +
                `สนใจดูรายละเอียดหรือคำนวณค่างวดไหมครับ?\n${biz.orderChannelsText}`;
            } else {
              intentResponse = `ขออภัยครับ ไม่พบมอเตอร์ไซค์ในงบประมาณที่ระบุ\n\nติดต่อทีมงานเพื่อดูตัวเลือกการผ่อนครับ:\n${biz.orderChannelsText}`;
            }
          } else {
            intentResponse = `ขออภัยครับ ไม่พบสินค้าในงบประมาณที่ระบุ\n\nสินค้าราคาเริ่มต้นของเราครับ:\n${biz.getCheapestProducts(3).filter((p) => p.category !== "แบตเตอรี่ EV" || isBatteryContext).slice(0, 3).map((p) => `💰 **${p.name}** — ${p.price.toLocaleString()} บาท`).join("\n") || biz.getCheapestProducts(3).map((p) => `💰 **${p.name}** — ${p.price.toLocaleString()} บาท`).join("\n")}`;
          }
        } else {
          const list = pool
            .slice(0, 5)
            .map(
              (p) =>
                `💰 **${p.name}** — **${p.price.toLocaleString()} บาท**`
            )
            .join("\n");
          intentResponse = `สินค้าที่เหมาะกับงบของคุณครับ 💰\n\n${list}\n\nสนใจรุ่นไหนให้ผมแจ้งรายละเอียดเพิ่มเติมได้เลยครับ!`;
          // Attach carousel
          intentDetails.carouselProducts = pool.slice(0, 5);
        }
        break;
      }
      case "recommendation": {
        // Detect context — what category does the customer want?
        const MOTO_REC_SIGNALS = [
          "คัน", "คันไหน", "มอไซ", "มอเตอร์ไซ", "motorcycle",
          "ขับ", "ขี่", "em ", " em", "legend", "milan", "owen",
          "หมู่บ้าน", "ในเมือง", "ทางไกล", "แนะนำคัน",
        ];
        const BATTERY_REC_SIGNALS = [
          "แบต", "battery", "byd", "tesla", "mg ", " mg",
          "neta", "volvo", "bmw", "mercedes", "ora", "รถยนต์ไฟฟ้า", "รถ ev",
          "12v", "lifepo4",
        ];
        const wantsMoto = MOTO_REC_SIGNALS.some((s) => lower.includes(s));
        const wantsBattery = BATTERY_REC_SIGNALS.some((s) => lower.includes(s));

        if (wantsMoto && !wantsBattery) {
          // Show EM motorcycle catalog with specs + carousel
          const emProducts = biz.getActiveProducts().filter(
            (p) => p.category === "มอเตอร์ไซค์ไฟฟ้า EM"
          );
          intentResponse = emProducts.length > 0
            ? buildEMCatalogResponse(emProducts, biz)
            : intent.responseTemplate;
          // Attach carousel for LINE/FB/Web
          if (emProducts.length > 0) {
            intentDetails.carouselProducts = emProducts.slice(0, 10);
          }
        } else if (wantsBattery && !wantsMoto) {
          // Show top battery products + carousel
          const batProducts = biz.getActiveProducts()
            .filter((p) => p.category === "แบตเตอรี่ EV")
            .slice(0, 5);
          const list = batProducts
            .map((p) => `🏆 **${p.name}** — ${p.price.toLocaleString()} บาท`)
            .join("\n");
          intentResponse = `แบตเตอรี่ LiFePO4 สำหรับรถ EV ยอดนิยมครับ\n\n${list}\n\nบอกรุ่นรถที่ใช้อยู่ผมจะแจ้งรุ่นที่เข้ากันได้เลยครับ!`;
          if (batProducts.length > 0) {
            intentDetails.carouselProducts = batProducts;
          }
        } else {
          // No clear context — show top active products across all categories + carousel
          const allActive = biz.getActiveProducts();
          const cats = biz.getCategories();
          const catSummaries = cats.map((cat) => {
            const items = allActive.filter((p) => p.category === cat);
            if (items.length === 0) return null;
            const minPrice = Math.min(...items.map((p) => p.price));
            const maxPrice = Math.max(...items.map((p) => p.price));
            const priceRange = minPrice === maxPrice
              ? `${minPrice.toLocaleString()} บาท`
              : `${minPrice.toLocaleString()} – ${maxPrice.toLocaleString()} บาท`;
            const sample = items.slice(0, 3).map((p) => `- ${p.name}`).join("\n");
            return `**${cat}** (${priceRange})\n${sample}${items.length > 3 ? `\n- ...และอีก ${items.length - 3} รายการ` : ""}`;
          }).filter(Boolean).join("\n\n");
          intentResponse = `ยินดีช่วยแนะนำครับ! ${biz.name} มีสินค้าดังนี้ครับ\n\n${catSummaries}\n\nสนใจด้านไหนครับ? หรือแจ้งรุ่นสินค้า/รถที่ใช้อยู่ได้เลยครับ!`;
          // Show top 5 by category for carousel
          const topRecs = recommendProducts(allActive, { limit: 5 });
          if (topRecs.length > 0) {
            intentDetails.carouselProducts = topRecs;
          }
        }
        break;
      }
      case "product_inquiry": {
        const cats = biz.getCategories();
        intentResponse = `📂 หมวดหมู่สินค้าของ ${biz.name} ครับ:\n\n${cats
          .map((c) => {
            const activeCount = biz.getActiveProducts().filter(
              (p) => p.category === c
            ).length;
            return `• **${c}** — ${activeCount} รายการ`;
          })
          .join("\n")}\n\nสนใจหมวดไหนครับ?`;
        break;
      }
      case "ev_purchase": {
        // Try to find a specific product mentioned — if found, respond with details
        const allActive = biz.getActiveProducts();
        const emProductsForPurchase = allActive.filter((p) => p.category === "มอเตอร์ไซค์ไฟฟ้า EM");
        const specificEMPurchase = findSpecificProductInCategory(lower, emProductsForPurchase, "EM ");
        if (specificEMPurchase) {
          intentResponse = buildDetailedEMResponse(specificEMPurchase, biz);
          intentDetails.matchedProducts = [specificEMPurchase.name];
        } else {
          // Try generic product search across all active products
          const anySpecific = findSpecificProductInCategory(lower, allActive, "");
          if (anySpecific) {
            const isEM = anySpecific.category === "มอเตอร์ไซค์ไฟฟ้า EM";
            intentResponse = isEM
              ? buildDetailedEMResponse(anySpecific, biz)
              : buildDetailedProductResponseGeneric(anySpecific, biz);
            intentDetails.matchedProducts = [anySpecific.name];
          } else {
            intentResponse = null; // pass-through to Layer 7+ for sale scripts / product search
          }
        }
        break;
      }
      case "drone_purchase":
      case "product_details":
        intentResponse = null; // pass-through to next layers
        break;
      default:
        if (intent.responseTemplate) intentResponse = intent.responseTemplate;
        break;
    }

    if (intentResponse !== null) {
      const guardedIntent = guardRepetition(intentResponse);
      if (guardedIntent !== null) {
        addStep(6, "Intent Engine", "จับ intent ด้วย multi-signal scoring", "matched", t, intentDetails);
        finalLayer = 6;
        finalLayerName = `Intent: ${intent.name}`;
        finalIntent = intent.id;
        const intentResult = finishTrace(guardedIntent);
        if (intentDetails.carouselProducts) {
          intentResult.carouselProducts = intentDetails.carouselProducts as Product[];
        }
        return intentResult;
      } else {
        addStep(6, "Intent Engine", "จับ intent แต่ตอบซ้ำ — pass-through", "checked", t, {
          ...intentDetails,
          intent: `${intentDetails.intent} [repeat-suppressed]`,
        });
      }
    } else {
      addStep(6, "Intent Engine", "จับ intent แล้วแต่ pass-through", "checked", t, intentDetails);
    }
  } else {
    addStep(6, "Intent Engine", "จับ intent ด้วย multi-signal scoring", "skipped", t, {
      allScores: allScores.slice(0, 5).map((s) => ({
        intent: s.intent.name,
        score: s.score,
      })),
    });
  }

  // ── LAYER 7: Sale scripts ──
  t = now();
  const matchedScript = biz.matchSaleScript(userMessage);
  if (matchedScript) {
    const guardedScript = guardRepetition(matchedScript.adminReply);
    if (guardedScript !== null) {
      addStep(7, "Sale Scripts", "จับคู่กับ sale script", "matched", t, {
        matchedScript: matchedScript.triggers.join(", "),
      });
      finalLayer = 7;
      finalLayerName = "Sale Script";
      return finishTrace(guardedScript);
    } else {
      addStep(7, "Sale Scripts", "sale script ซ้ำกับที่ตอบไปแล้ว — pass-through", "checked", t, {
        matchedScript: matchedScript.triggers.join(", "),
      });
    }
  } else {
    addStep(7, "Sale Scripts", "จับคู่กับ sale script", "skipped", t);
  }

  // ── LAYER 8: Knowledge base ──
  t = now();
  const matchedDoc = biz.matchKnowledgeDoc(userMessage);
  if (matchedDoc) {
    const knowledgeCandidate = `📚 **${matchedDoc.title}**\n\n${matchedDoc.content}`;
    const guardedDoc = guardRepetition(knowledgeCandidate);
    if (guardedDoc !== null) {
      addStep(8, "Knowledge Base", "ค้นหาจาก knowledge base", "matched", t, {
        matchedDoc: matchedDoc.title,
      });
      finalLayer = 8;
      finalLayerName = `Knowledge: ${matchedDoc.title}`;
      return finishTrace(guardedDoc);
    } else {
      addStep(8, "Knowledge Base", "knowledge doc ซ้ำกับที่ตอบไปแล้ว — pass-through", "checked", t, {
        matchedDoc: matchedDoc.title,
      });
    }
  } else {
    addStep(8, "Knowledge Base", "ค้นหาจาก knowledge base", "skipped", t);
  }

  // ── LAYER 9: FAQ search ──
  t = now();
  let faqHit = false;
  for (const { keys, topic } of biz.faqTerms) {
    if (keys.some((k) => lower.includes(k))) {
      const hit = biz.faqData.find((f) =>
        keys.some(
          (k) =>
            f.question.toLowerCase().includes(k) ||
            f.answer.toLowerCase().includes(k)
        )
      );
      if (hit) {
        const faqCandidate = `📋 **${hit.question}**\n\n${hit.answer}`;
        const guardedFaq = guardRepetition(faqCandidate);
        if (guardedFaq !== null) {
          addStep(9, "FAQ Search", "ค้นหาจาก FAQ", "matched", t, {
            matchedFaqTopic: topic,
            matchedTriggers: keys.filter((k) => lower.includes(k)),
          });
          finalLayer = 9;
          finalLayerName = `FAQ: ${topic}`;
          faqHit = true;
          return finishTrace(guardedFaq);
        } else {
          addStep(9, "FAQ Search", "FAQ ซ้ำกับที่ตอบไปแล้ว — pass-through", "checked", t, {
            matchedFaqTopic: topic,
          });
          faqHit = true; // still mark as hit so we don't log "skipped"
        }
      }
    }
  }
  if (!faqHit) {
    addStep(9, "FAQ Search", "ค้นหาจาก FAQ", "skipped", t);
  }

  // ── LAYER 10: Product search ──
  t = now();
  const matchedProducts = biz.searchProducts(userMessage);
  if (matchedProducts.length > 0) {
    addStep(10, "Product Search", "ค้นหาสินค้า", "matched", t, {
      matchedProducts: matchedProducts.slice(0, 3).map((p) => p.name),
      productsCount: matchedProducts.length,
    });
    finalLayer = 10;
    finalLayerName = "Product Search";

    // Single product match → show detailed view
    if (matchedProducts.length <= 2) {
      const p = matchedProducts[0];
      const isEM = p.category === "มอเตอร์ไซค์ไฟฟ้า EM";
      const detail = isEM
        ? buildDetailedEMResponse(p, biz)
        : buildDetailedProductResponseGeneric(p, biz);
      if (matchedProducts.length === 2) {
        const p2 = matchedProducts[1];
        const isEM2 = p2.category === "มอเตอร์ไซค์ไฟฟ้า EM";
        const detail2 = isEM2
          ? buildDetailedEMResponse(p2, biz)
          : buildDetailedProductResponseGeneric(p2, biz);
        return finishTrace(`${detail}\n\n---\n\n${detail2}`);
      }
      return finishTrace(detail);
    }

    // Multiple matches → show brief cards + carousel
    const top = matchedProducts.slice(0, 5);
    const cards = top.slice(0, 3).map(buildProductCard).join("\n\n---\n\n");
    const more =
      matchedProducts.length > 3
        ? `\n\n_...และอีก ${matchedProducts.length - 3} รายการ_`
        : "";
    const multiResult = finishTrace(
      `พบสินค้าที่เกี่ยวข้อง ${matchedProducts.length} รายการครับ\n\n${cards}${more}\n\nสนใจรุ่นไหนเพิ่มเติมไหมครับ?`
    );
    multiResult.carouselProducts = top;
    return multiResult;
  }
  addStep(10, "Product Search", "ค้นหาสินค้า", "skipped", t);

  // ── LAYER 11: Category browse ──
  t = now();
  if (
    ["หมวด", "ประเภท", "category", "มีอะไรบ้าง", "ขายอะไร", "มีอะไรขายบ้าง", "ขายอะไรบ้าง", "สินค้าทั้งหมด", "แนะนำสินค้า", "สินค้ามีอะไร", "รายการสินค้า"].some((k) =>
      lower.includes(k)
    )
  ) {
    const cats = biz.getCategories();
    addStep(11, "Category Browse", "แสดงหมวดหมู่", "matched", t);
    finalLayer = 11;
    finalLayerName = "Category Browse";
    return finishTrace(
      `📂 หมวดหมู่สินค้าของ ${biz.name} ครับ:\n\n${cats
        .map(
          (c) =>
            `• **${c}** (${biz.getProductsByCategory(c).length} รายการ)`
        )
        .join("\n")}\n\nสนใจหมวดไหนครับ?`
    );
  }
  addStep(11, "Category Browse", "แสดงหมวดหมู่", "skipped", t);

  // ── LAYER 12: Category-specific ──
  t = now();
  for (const { keys, category, label } of biz.categoryChecks) {
    if (keys.some((k) => lower.includes(k))) {
      let content = "";
      if (category === "Budget") {
        const cheap = biz.getCheapestProducts(5);
        content = `💡 สินค้าราคาเริ่มต้นครับ:\n\n${cheap.map((p) => `💰 **${p.name}** — **${p.price.toLocaleString()} บาท**`).join("\n")}\n\nสนใจรุ่นไหนบอกได้เลยครับ!`;
      } else {
        const items = biz.getActiveProducts().filter(
          (p) => p.category === category
        );
        if (items.length > 0) {
          content = `${label} ที่มีจำหน่ายครับ:\n\n${items.slice(0, 5).map((p) => `• **${p.name}** — ${p.price.toLocaleString()} บาท`).join("\n")}${items.length > 5 ? `\n\n_...และอีก ${items.length - 5} รายการ_` : ""}\n\nสนใจรุ่นไหนครับ?`;
        }
      }
      if (content) {
        const guardedCat = guardRepetition(content);
        if (guardedCat !== null) {
          addStep(12, "Category Specific", `ค้นหาตามหมวด ${label}`, "matched", t, {
            matchedCategory: category,
          });
          finalLayer = 12;
          finalLayerName = `Category: ${label}`;
          return finishTrace(guardedCat);
        } else {
          addStep(12, "Category Specific", `หมวด ${label} ซ้ำ — pass-through`, "checked", t, {
            matchedCategory: category,
          });
        }
      }
    }
  }
  addStep(12, "Category Specific", "ค้นหาตามหมวดเฉพาะ", "skipped", t);

  // ── LAYER 13: Clarification ──
  // Detect ambiguity before falling to Layer 14/15 and ask clarifying question.
  // Cases:
  //   A) Message is short/vague (≤8 chars or single word) → ask what they need
  //   B) Intent score exists but below threshold (1–1.9) → ask to confirm topic
  //   C) Top-2 intent scores are close (within 1 point) → ask to disambiguate
  t = now();
  {
    const clarifyResult = buildClarifyResponse(userMessage, allScores, ctx, biz);
    if (clarifyResult) {
      addStep(13, "Clarification", "ข้อความคลุมเครือ — ถามเพิ่มเติม", "matched", t, {
        intent: "clarify",
        allScores: allScores.slice(0, 3).map((s) => ({ intent: s.intent.name, score: s.score })),
      });
      finalLayer = 13;
      finalLayerName = "Clarification";
      const result = finishTrace(clarifyResult.question);
      result.clarifyOptions = clarifyResult.options;
      return result;
    }
  }
  addStep(13, "Clarification", "ไม่มีความคลุมเครือ", "skipped", t);

  // ── LAYER 14: Context-aware clarify (short messages only; longer → AI at Layer 15) ──
  // Reaching Layer 14 means all pattern layers failed. Do NOT guess with a product card
  // for substantive messages — let AI handle them at Layer 15.
  t = now();
  if (ctx.activeProduct && allMessages.length > 2 && userMessage.trim().length <= 10) {
    const p = ctx.activeProduct;
    addStep(14, "Context Fallback", "ข้อความสั้น + มีบริบทสินค้า — ถามกลับ", "matched", t, {
      matchedProducts: [p.name],
    });
    finalLayer = 14;
    finalLayerName = `Context Fallback: ${p.name}`;
    const clarifyResult = finishTrace(
      `เกี่ยวกับ **${p.name}** ครับ — สอบถามเรื่องอะไรครับ?`
    );
    clarifyResult.clarifyOptions = ["ราคา", "สเปค", "ประกัน", "สั่งซื้อ"];
    return clarifyResult;
  }
  addStep(14, "Context Fallback", "ข้อความยาว/ไม่มีบริบท — ส่งไป AI (Layer 15)", "skipped", t);

  // ── LAYER 15: Default fallback ──
  t = now();
  addStep(15, "Default Fallback", "ข้อความตอบกลับเริ่มต้น", "matched", t);
  finalLayer = 15;
  finalLayerName = "Default Fallback";

  // If the default fallback message was already sent recently, use a shorter variant
  // to avoid the bot repeating the same long intro message multiple times.
  const FALLBACK_VARIANTS = [
    biz.defaultFallbackMessage,
    `ยังไม่แน่ใจว่าถามเรื่องอะไรครับ 😊 ลองพิมพ์ชื่อสินค้า หรือบอกประเภทที่สนใจได้เลยครับ!`,
    `ขอโทษด้วยนะครับ ผมยังไม่เข้าใจคำถาม ลองถามใหม่อีกครั้ง หรือติดต่อทีมงานโดยตรงได้เลยครับ:\n${biz.orderChannelsText}`,
    `ถ้ามีคำถามเพิ่มเติม พิมพ์ได้เลยครับ หรือติดต่อทีมงานที่:\n${biz.orderChannelsText}`,
  ];

  const defaultCandidate = isTooSimilarToRecentReply(biz.defaultFallbackMessage, allMessages)
    ? FALLBACK_VARIANTS[allMessages.filter((m) => m.role === "assistant").length % (FALLBACK_VARIANTS.length - 1) + 1]
    : biz.defaultFallbackMessage;

  return finishTrace(defaultCandidate);

  // ──────────────────────────────────────────────
  function finishTrace(content: string): TracedResult {
    const allLayerDefs: [number, string, string][] = [
      [0, "Context Extraction", "วิเคราะห์บริบทจากประวัติแชท"],
      [1, "Admin Escalation", "ตรวจจับคำขอคุยกับแอดมิน/คนจริง"],
      [2, "VAT Refund", "ตรวจจับคำถามเรื่อง VAT Refund"],
      [3, "Stock Inquiry", "ตรวจจับคำถามเรื่องสต็อกสินค้า"],
      [4, "Discontinued Detection", "ตรวจจับสินค้าที่ยกเลิกจำหน่าย"],
      [5, "Context Resolution", "ตอบต่อเนื่องจากบริบทสนทนา"],
      [6, "Intent Engine", "จับ intent ด้วย multi-signal scoring"],
      [7, "Sale Scripts", "จับคู่กับ sale script"],
      [8, "Knowledge Base", "ค้นหาจาก knowledge base"],
      [9, "FAQ Search", "ค้นหาจาก FAQ"],
      [10, "Product Search", "ค้นหาสินค้า"],
      [11, "Category Browse", "แสดงหมวดหมู่"],
      [12, "Category Specific", "ค้นหาตามหมวดเฉพาะ"],
      [13, "Clarification",    "ข้อความคลุมเครือ — ถามเพิ่มเติม"],
      [14, "Context Fallback", "ใช้บริบทสนทนาตอบ fallback"],
      [15, "Default Fallback", "ข้อความตอบกลับเริ่มต้น"],
    ];

    for (const [layer, name, desc] of allLayerDefs) {
      if (!steps.find((s) => s.layer === layer)) {
        steps.push({
          layer,
          name,
          description: desc,
          status: "not_reached",
          durationMs: 0,
        });
      }
    }

    steps.sort((a, b) => a.layer - b.layer);

    const totalDurationMs = Math.round((now() - pipelineStart) * 100) / 100;

    const trace: PipelineTrace = {
      totalDurationMs,
      mode: "pipeline",
      steps,
      finalLayer,
      finalLayerName,
      finalIntent,
      userMessage,
      timestamp: new Date().toISOString(),
    };

    return { content, trace };
  }
}
