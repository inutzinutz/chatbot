/* ------------------------------------------------------------------ */
/*  Shared Pipeline — used by /api/chat and /api/line/webhook          */
/* ------------------------------------------------------------------ */

import { type Product } from "@/lib/products";
import { type BusinessConfig } from "@/lib/businessUnits";
import type { PipelineStep, PipelineTrace } from "@/lib/inspector";

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
}

// ─────────────────────────────────────────────────────────────
// INTENT ENGINE — Multi-signal scoring (business-aware)
// ─────────────────────────────────────────────────────────────

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
      const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wb = new RegExp(`(^|[\\s,!?])${escaped}($|[\\s,!?])`);
      score += wb.test(lower) ? 3 : 2;
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

function extractConversationContext(
  messages: ChatMessage[],
  currentMessage: string,
  biz: BusinessConfig
): ConversationContext {
  const recentProducts: Product[] = [];
  const recentUserMessages: string[] = [];
  let activeProduct: Product | null = null;
  let recentTopic: string | null = null;

  const recentMsgs = messages.slice(-8);
  for (const msg of recentMsgs) {
    if (msg.role === "user") {
      recentUserMessages.push(msg.content);
    }

    const text = msg.content.toLowerCase();

    for (const product of biz.products) {
      const nameMatch = product.name.toLowerCase();
      if (text.includes(nameMatch)) {
        if (!recentProducts.find((p) => p.id === product.id)) {
          recentProducts.push(product);
        }
        continue;
      }

      for (const tag of product.tags) {
        if (tag.length > 3 && text.includes(tag.toLowerCase())) {
          if (!recentProducts.find((p) => p.id === product.id)) {
            recentProducts.push(product);
          }
          break;
        }
      }
    }

    if (msg.role === "assistant") {
      const productNameMatch = msg.content.match(/\*\*(.+?)\*\*/g);
      if (productNameMatch) {
        for (const match of productNameMatch) {
          const name = match.replace(/\*\*/g, "");
          const found = biz.products.find(
            (p) => p.name.toLowerCase() === name.toLowerCase()
          );
          if (found && !recentProducts.find((rp) => rp.id === found.id)) {
            recentProducts.push(found);
          }
        }
      }
    }
  }

  if (recentProducts.length > 0) {
    activeProduct = recentProducts[recentProducts.length - 1];
  }

  const currentLower = currentMessage.toLowerCase();
  const isFollowUp =
    messages.length > 1 &&
    FOLLOW_UP_PATTERNS.some((p) => currentLower.includes(p)) &&
    (currentMessage.length < 40 ||
      FOLLOW_UP_PATTERNS.some((p) => currentLower.includes(p)));

  for (const { keys, topic } of TOPIC_PATTERNS) {
    if (keys.some((k) => currentLower.includes(k))) {
      recentTopic = topic;
      break;
    }
  }

  const parts: string[] = [];
  if (activeProduct) parts.push(`Active product: ${activeProduct.name}`);
  if (recentProducts.length > 1)
    parts.push(`${recentProducts.length} products in context`);
  if (recentTopic) parts.push(`Topic: ${recentTopic}`);
  if (isFollowUp) parts.push("Follow-up detected");
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

    case "warranty":
      return `**${p.name}** — ข้อมูลการรับประกันครับ\n\nกรุณาสอบถามรายละเอียดการรับประกันเฉพาะสินค้านี้กับทีมงานครับ\n\nสนใจดูรายละเอียดเพิ่มไหมครับ?`;

    case "shipping":
      return `การจัดส่ง **${p.name}** ครับ\n\nกรุณาสอบถามรายละเอียดการจัดส่งกับทีมงานครับ\n\nต้องการสั่งซื้อเลยไหมครับ?`;

    case "specs":
      return `รายละเอียด **${p.name}** ครับ\n\n${p.description}\n\n💰 ราคา: **${p.price.toLocaleString()} บาท**\n📂 หมวดหมู่: ${p.category}\n\nมีคำถามเพิ่มเติมไหมครับ?`;

    case "installment":
      return `**${p.name}** ราคา **${p.price.toLocaleString()} บาท** ครับ\n\nสอบถามเงื่อนไขการผ่อนชำระได้ที่ทีมงานครับ`;

    case "promotion":
      return `โปรโมชั่นสำหรับ **${p.name}** ครับ\n\n💰 ราคา: **${p.price.toLocaleString()} บาท**\n\nสอบถามโปรโมชั่นล่าสุดได้ที่ทีมงานครับ`;

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

  // Specs
  lines.push("📋 สเปค:");
  if (specLine) {
    const specs = specLine.split("|").map((s) => s.trim()).filter(Boolean);
    for (const spec of specs) {
      lines.push(`  • ${spec}`);
    }
  }
  lines.push("");

  // Features from description
  lines.push("✨ จุดเด่น:");
  if (thaiDesc.includes("กะทัดรัด") || thaiDesc.includes("ในเมือง")) {
    lines.push("  • ขนาดกะทัดรัด คล่องตัว เหมาะใช้งานในเมือง");
  }
  if (thaiDesc.includes("คลาสสิก") || thaiDesc.includes("อิตาเลียน")) {
    lines.push("  • ดีไซน์คลาสสิก สไตล์อิตาเลียน สวยโดดเด่น");
  }
  if (thaiDesc.includes("มาตรฐาน")) {
    lines.push("  • รุ่นมาตรฐาน เหมาะทั้งในเมืองและทางไกล");
  }
  if (thaiDesc.includes("สมรรถนะสูง") || thaiDesc.includes("อัปเกรด")) {
    lines.push("  • รุ่นอัปเกรด สมรรถนะสูง กำลังมอเตอร์เหนือชั้น");
  }
  if (thaiDesc.includes("ระยะทางไกล")) {
    lines.push("  • เน้นระยะทางไกล วิ่งได้ไกลที่สุดในซีรีส์");
  }
  if (thaiDesc.includes("สปอร์ต") || thaiDesc.includes("ทันสมัย")) {
    lines.push("  • สไตล์สปอร์ต ดีไซน์ทันสมัย พลังแรง");
  }
  if (thaiDesc.includes("จดทะเบียน") || p.tags.includes("จดทะเบียนได้")) {
    lines.push("  • จดทะเบียนได้ตามกฎหมาย พร้อม พ.ร.บ.");
  }
  lines.push("");

  // Warranty
  lines.push("🔧 รับประกัน:");
  lines.push("  • มอเตอร์: 3 ปี");
  lines.push("  • แบตเตอรี่: 3 ปี / 30,000 กม.");
  lines.push("  • เฟรม: 5 ปี");
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
  lines.push("EV Life Thailand เป็นตัวแทนจำหน่ายมอเตอร์ไซค์ไฟฟ้า EM อย่างเป็นทางการครับ");
  lines.push("");
  lines.push("รุ่นที่มีจำหน่าย:");

  // Sort by price ascending
  const sorted = [...products].sort((a, b) => a.price - b.price);

  for (const p of sorted) {
    const specLine = p.description.split("\n").find((l) => l.includes("Motor:"));
    let specs = "";
    if (specLine) {
      const motor = specLine.match(/Motor:\s*(\d+W)/)?.[1] || "";
      const range = specLine.match(/Range:\s*(\d+)\s*km/)?.[1] || "";
      const speed = specLine.match(/Top Speed:\s*(\d+)\s*km\/h/)?.[1] || "";
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

export function buildSystemPrompt(biz: BusinessConfig): string {
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

  return `${biz.systemPromptIdentity}

## หมวดหมู่สินค้า: ${categories}

## รายการสินค้า:
${productList}

## FAQ:
${faqList}

## Sale Scripts (ยึดตามนี้เมื่อตรงกับคำถาม):
${saleScriptList}

## Knowledge Base:
${knowledgeList}

## Intent Policies (ต้องยึดตาม policy ของแต่ละ intent อย่างเคร่งครัด):
${intentPolicyList}

## กฎเหล็ก (ห้ามละเมิดเด็ดขาด):
1. **ห้ามยืนยันสต็อก** — ไม่มีข้อมูลสต็อกเรียลไทม์ ให้ตอบว่า "ผมขออนุญาตตรวจสอบกับทีมงานให้แน่ชัดก่อนนะครับ"
2. **ถ้าลูกค้าขอคุยกับแอดมิน/คนจริง** — โอนทันทีและหยุดตอบ
3. **ไม่มี VAT Refund** สำหรับนักท่องเที่ยว
4. **สินค้า DISCONTINUE** — แจ้งและแนะนำรุ่นทดแทนเสมอ
5. **ห้ามแต่งข้อมูลสินค้า** ที่ไม่มีในระบบ
6. **ห้ามส่ง payment link** ทาง chat
7. ราคาแสดงเป็นบาทเสมอ รูปแบบ: 12,650 บาท
8. ถ้าไม่มีข้อมูล ให้แนะนำติดต่อผ่านช่องทางอย่างเป็นทางการ`;
}

// ─────────────────────────────────────────────────────────────
// CLARIFICATION ENGINE
// ─────────────────────────────────────────────────────────────

interface ClarifyResult {
  question: string;
  options: string[];
}

/**
 * Returns a clarify question + quick-reply options ONLY when there is genuinely
 * no way to determine what the customer wants.
 *
 * Single rule: no intent matched at all (score = 0), no product in context,
 * AND the message is longer than a single character (i.e. not just "?" or whitespace).
 *
 * Everything else — short words, low scores, tied scores — should be handled by
 * the normal pipeline layers. Broader trigger matching in intentPolicies is the
 * right fix for ambiguous short messages, not asking the customer to clarify.
 */
function buildClarifyResponse(
  message: string,
  allScores: IntentScore[],
  ctx: ConversationContext,
  biz: BusinessConfig
): ClarifyResult | null {
  const trimmed = message.trim();
  const topScore = allScores[0]?.score ?? 0;
  const hasProductCtx = !!ctx.activeProduct;

  // Only trigger when pipeline has truly nothing — zero intent score, no product context
  if (topScore > 0 || hasProductCtx || trimmed.length <= 1) {
    return null;
  }

  // Skip common one-word greetings and affirmations that default fallback handles fine
  const skipWords = ["สวัสดี", "หวัดดี", "hello", "hi", "ok", "โอเค", "ครับ", "ค่ะ", "ได้", "เอา", "?", "??"];
  if (skipWords.some((w) => trimmed.toLowerCase() === w)) {
    return null;
  }

  const defaultOptions = biz.categoryChecks.slice(0, 4).map((c) => c.label);
  if (defaultOptions.length === 0) defaultOptions.push("ราคาสินค้า", "สินค้าแนะนำ", "ติดต่อเรา");

  return {
    question: `ขอบคุณที่ติดต่อ ${biz.name} ครับ สอบถามเรื่องอะไรได้เลยครับ`,
    options: defaultOptions,
  };
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
  biz: BusinessConfig
): TracedResult {
  const pipelineStart = now();
  const lower = userMessage.toLowerCase();
  const steps: PipelineStep[] = [];
  let finalLayer = 0;
  let finalLayerName = "";
  let finalIntent: string | undefined;

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
  if (biz.matchAdminEscalation(userMessage)) {
    addStep(1, "Admin Escalation", "ตรวจจับคำขอคุยกับแอดมิน/คนจริง", "matched", t, {
      matchedTriggers: ["admin escalation keywords"],
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
    if (ctx.activeProduct) {
      addStep(3, "Stock Inquiry", "ตรวจจับคำถามสต็อก + มีบริบทสินค้า", "matched", t, {
        matchedProducts: [ctx.activeProduct.name],
      });
      finalLayer = 3;
      finalLayerName = "Safety: Stock (contextual)";
      return finishTrace(
        `ผมขออนุญาตตรวจสอบสต็อก **${ctx.activeProduct.name}** กับทีมงานให้แน่ชัดก่อนนะครับ\n\nเพื่อข้อมูลที่ถูกต้อง 100% ครับ ระหว่างนี้ ให้ผมช่วยแนะนำข้อมูลส่วนอื่นก่อนไหมครับ?`
      );
    }
    addStep(3, "Stock Inquiry", "ตรวจจับคำถามเรื่องสต็อกสินค้า", "matched", t);
    finalLayer = 3;
    finalLayerName = "Safety: Stock Inquiry";
    return finishTrace(biz.buildStockCheckResponse());
  }
  addStep(3, "Stock Inquiry", "ตรวจจับคำถามเรื่องสต็อกสินค้า", "skipped", t);

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
    const contextResponse = buildContextualResponse(ctx, userMessage, biz);
    if (contextResponse) {
      addStep(5, "Context Resolution", "ตอบต่อเนื่องจากบริบทสนทนา", "matched", t, {
        intent: `follow-up: ${ctx.recentTopic || "general"}`,
        matchedProducts: [ctx.activeProduct.name],
        matchedTriggers: FOLLOW_UP_PATTERNS.filter((p) => lower.includes(p)),
      });
      finalLayer = 5;
      finalLayerName = `Context: ${ctx.activeProduct.name} → ${ctx.recentTopic || "detail"}`;
      return finishTrace(contextResponse);
    }
    addStep(5, "Context Resolution", "ตอบต่อเนื่องจากบริบทสนทนา (ไม่จับ topic ได้)", "checked", t, {
      matchedProducts: [ctx.activeProduct.name],
    });
  } else if (ctx.isFollowUp && !ctx.activeProduct) {
    addStep(5, "Context Resolution", "Follow-up แต่ไม่มีสินค้าในบริบท", "skipped", t);
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
      case "greeting":
        intentResponse = intent.responseTemplate;
        break;
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
      case "store_location_hours":
        intentResponse = intent.responseTemplate;
        break;
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
        const specificModel = findSpecificProductInCategory(lower, emProducts, "EM ");
        if (specificModel) {
          intentResponse = buildDetailedEMResponse(specificModel, biz);
          intentDetails.matchedProducts = [specificModel.name];
        } else {
          intentResponse = buildEMCatalogResponse(emProducts, biz);
        }
        break;
      }
      case "admin_escalation":
        intentResponse = biz.buildAdminEscalationResponse();
        break;
      case "budget_recommendation": {
        const budgetMatch = lower.match(/(\d[\d,]*)\s*(บาท|฿)?/);
        const budget = budgetMatch
          ? parseInt(budgetMatch[1].replace(/,/g, ""))
          : null;

        // Detect context: is the customer asking about a motorcycle or a car battery?
        const MOTO_SIGNALS = ["คัน", "มอไซ", "มอเตอร์ไซ", "motorcycle", "ขับ", "ขี่", "em ", " em", "legend", "milan", "owen", "endo", "หมู่บ้าน", "ในเมือง", "ทางไกล"];
        const BATTERY_SIGNALS = ["แบต", "battery", "byd", "tesla", "mg ", " mg", "neta", "volvo", "bmw", "mercedes", "ora", "ev ", " ev", "รถ", "car"];
        const isMotoContext = MOTO_SIGNALS.some((s) => lower.includes(s));
        const isBatteryContext = BATTERY_SIGNALS.some((s) => lower.includes(s));

        let pool = budget
          ? biz.getActiveProducts().filter((p) => p.price <= budget)
          : biz.getCheapestProducts(5);

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
          intentResponse = `ขออภัยครับ ไม่พบสินค้าในงบประมาณที่ระบุ\n\nสินค้าราคาเริ่มต้นของเราครับ:\n${biz.getCheapestProducts(3).map((p) => `💰 **${p.name}** — ${p.price.toLocaleString()} บาท`).join("\n")}`;
        } else {
          const list = pool
            .slice(0, 5)
            .map(
              (p) =>
                `💰 **${p.name}** — **${p.price.toLocaleString()} บาท**`
            )
            .join("\n");
          intentResponse = `สินค้าที่เหมาะกับงบของคุณครับ 💰\n\n${list}\n\nสนใจรุ่นไหนให้ผมแจ้งรายละเอียดเพิ่มเติมได้เลยครับ!`;
        }
        break;
      }
      case "recommendation": {
        // Detect context — prefer motorcycles if message hints at riding/vehicle
        const MOTO_REC_SIGNALS = ["คัน", "มอไซ", "มอเตอร์ไซ", "motorcycle", "ขับ", "ขี่", "em ", " em", "legend", "milan", "owen", "หมู่บ้าน", "ในเมือง", "ทางไกล", "แนะนำคัน", "รุ่นไหน", "คันไหน"];
        const BATTERY_REC_SIGNALS = ["แบต", "battery", "byd", "tesla", "mg", "neta", "volvo", "bmw", "mercedes", "ora", "รถยนต์", "รถ ev"];
        const lowerRec = lower;
        const wantsMoto = MOTO_REC_SIGNALS.some((s) => lowerRec.includes(s));
        const wantsBattery = BATTERY_REC_SIGNALS.some((s) => lowerRec.includes(s));

        let recProducts = biz.getActiveProducts();
        if (wantsMoto && !wantsBattery) {
          recProducts = recProducts.filter((p) => p.category === "มอเตอร์ไซค์ไฟฟ้า EM");
        } else if (wantsBattery && !wantsMoto) {
          recProducts = recProducts.filter((p) => p.category === "แบตเตอรี่ EV");
        }

        const popular = recProducts.slice(0, 4);
        const list = popular
          .map(
            (p) =>
              `🏆 **${p.name}** — ${p.price.toLocaleString()} บาท`
          )
          .join("\n");
        intentResponse = `สินค้าแนะนำยอดนิยมครับ\n\n${list}\n\n${intent.responseTemplate}`;
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
      case "ev_purchase":
      case "drone_purchase":
      case "product_details":
        intentResponse = null; // pass-through to next layers
        break;
      default:
        if (intent.responseTemplate) intentResponse = intent.responseTemplate;
        break;
    }

    if (intentResponse !== null) {
      addStep(6, "Intent Engine", "จับ intent ด้วย multi-signal scoring", "matched", t, intentDetails);
      finalLayer = 6;
      finalLayerName = `Intent: ${intent.name}`;
      finalIntent = intent.id;
      return finishTrace(intentResponse);
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
    addStep(7, "Sale Scripts", "จับคู่กับ sale script", "matched", t, {
      matchedScript: matchedScript.triggers.join(", "),
    });
    finalLayer = 7;
    finalLayerName = "Sale Script";
    return finishTrace(matchedScript.adminReply);
  }
  addStep(7, "Sale Scripts", "จับคู่กับ sale script", "skipped", t);

  // ── LAYER 8: Knowledge base ──
  t = now();
  const matchedDoc = biz.matchKnowledgeDoc(userMessage);
  if (matchedDoc) {
    addStep(8, "Knowledge Base", "ค้นหาจาก knowledge base", "matched", t, {
      matchedDoc: matchedDoc.title,
    });
    finalLayer = 8;
    finalLayerName = `Knowledge: ${matchedDoc.title}`;
    return finishTrace(`📚 **${matchedDoc.title}**\n\n${matchedDoc.content}`);
  }
  addStep(8, "Knowledge Base", "ค้นหาจาก knowledge base", "skipped", t);

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
        addStep(9, "FAQ Search", "ค้นหาจาก FAQ", "matched", t, {
          matchedFaqTopic: topic,
          matchedTriggers: keys.filter((k) => lower.includes(k)),
        });
        finalLayer = 9;
        finalLayerName = `FAQ: ${topic}`;
        faqHit = true;
        return finishTrace(`📋 **${hit.question}**\n\n${hit.answer}`);
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

    // Multiple matches → show brief cards
    const top = matchedProducts.slice(0, 3);
    const cards = top.map(buildProductCard).join("\n\n---\n\n");
    const more =
      matchedProducts.length > 3
        ? `\n\n_...และอีก ${matchedProducts.length - 3} รายการ_`
        : "";
    return finishTrace(
      `พบสินค้าที่เกี่ยวข้อง ${matchedProducts.length} รายการครับ\n\n${cards}${more}\n\nสนใจรุ่นไหนเพิ่มเติมไหมครับ?`
    );
  }
  addStep(10, "Product Search", "ค้นหาสินค้า", "skipped", t);

  // ── LAYER 11: Category browse ──
  t = now();
  if (
    ["หมวด", "ประเภท", "category", "มีอะไรบ้าง", "ขายอะไร"].some((k) =>
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
        addStep(12, "Category Specific", `ค้นหาตามหมวด ${label}`, "matched", t, {
          matchedCategory: category,
        });
        finalLayer = 12;
        finalLayerName = `Category: ${label}`;
        return finishTrace(content);
      }
    }
  }
  addStep(12, "Category Specific", "ค้นหาตามหมวดเฉพาะ", "skipped", t);

  // ── CLARIFICATION CHECK ──
  // Detect ambiguity before falling to Layer 13/14 and ask bot clarify question.
  // Cases:
  //   A) Message is short/vague (≤8 chars or single word) → ask what they need
  //   B) Intent score exists but below threshold (1–1.9) → ask to confirm topic
  //   C) Top-2 intent scores are close (within 1 point) → ask to disambiguate
  //   D) Pipeline reached here (L13/14) without resolving a product → ask clarify
  {
    const clarifyResult = buildClarifyResponse(userMessage, allScores, ctx, biz);
    if (clarifyResult) {
      addStep(12, "Clarification", "ข้อความคลุมเครือ — ถามเพิ่มเติม", "matched", t, {
        intent: "clarify",
        allScores: allScores.slice(0, 3).map((s) => ({ intent: s.intent.name, score: s.score })),
      });
      finalLayer = 12;
      finalLayerName = "Clarification";
      const result = finishTrace(clarifyResult.question);
      result.clarifyOptions = clarifyResult.options;
      return result;
    }
  }

  // ── LAYER 13: Context-aware fallback ──
  t = now();
  if (ctx.activeProduct && allMessages.length > 2) {
    const p = ctx.activeProduct;
    addStep(13, "Context Fallback", "ใช้บริบทสนทนาตอบ fallback", "matched", t, {
      matchedProducts: [p.name],
    });
    finalLayer = 13;
    finalLayerName = `Context Fallback: ${p.name}`;
    return finishTrace(
      `เกี่ยวกับ **${p.name}** ครับ:\n\n${p.description.split("\n")[0]}\n💰 ราคา: **${p.price.toLocaleString()} บาท**\n\nสนใจสอบถามเรื่องไหนเพิ่มเติมครับ?\n- รายละเอียดสเปค\n- ประกัน\n- การสั่งซื้อ\n\nหรือจะดูสินค้าอื่นก็บอกได้เลยครับ!`
    );
  }
  addStep(13, "Context Fallback", "ใช้บริบทสนทนาตอบ fallback", "skipped", t);

  // ── LAYER 14: Default fallback ──
  t = now();
  addStep(14, "Default Fallback", "ข้อความตอบกลับเริ่มต้น", "matched", t);
  finalLayer = 14;
  finalLayerName = "Default Fallback";

  return finishTrace(biz.defaultFallbackMessage);

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
      [13, "Context Fallback", "ใช้บริบทสนทนาตอบ fallback"],
      [14, "Default Fallback", "ข้อความตอบกลับเริ่มต้น"],
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
