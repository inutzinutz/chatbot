/* ------------------------------------------------------------------ */
/*  Follow-up Agent — AI-powered conversation analysis                  */
/*  Scans chat history to find conversations needing follow-up          */
/*  Uses Claude (priority 1) → OpenAI (priority 2) → Rule-based (3)   */
/* ------------------------------------------------------------------ */

import type { ChatMessage, ChatConversation, FollowUpResult } from "@/lib/chatStore";

// ── Analysis prompt ──

function buildAnalysisPrompt(
  messages: ChatMessage[],
  conv: ChatConversation,
  businessName: string
): string {
  // Take last 20 messages for analysis
  const recent = messages.slice(-20);
  const transcript = recent
    .map((m) => {
      const role = m.role === "customer" ? "Customer" : m.role === "bot" ? "Bot" : "Admin";
      return `[${role}] ${m.content}`;
    })
    .join("\n");

  const hoursSinceLastMsg = Math.round(
    (Date.now() - conv.lastMessageAt) / (1000 * 60 * 60)
  );

  return `คุณเป็น AI Agent วิเคราะห์สถานะการสนทนาของร้าน ${businessName}

วิเคราะห์สนทนาต่อไปนี้ แล้วตอบว่าต้องติดตามลูกค้าต่อหรือไม่:

ชื่อลูกค้า: ${conv.displayName}
ข้อความสุดท้ายจาก: ${conv.lastMessageRole === "customer" ? "ลูกค้า" : conv.lastMessageRole === "bot" ? "Bot" : "แอดมิน"}
เวลาผ่านไปแล้ว: ${hoursSinceLastMsg} ชั่วโมง

=== สนทนา ===
${transcript}
=== จบ ===

ตอบเป็น JSON เท่านั้น (ไม่ต้องมี markdown):
{
  "needsFollowup": true หรือ false,
  "reason": "เหตุผลสั้นๆ ภาษาไทย",
  "suggestedMessage": "ข้อความติดตามที่แนะนำ ภาษาไทย สุภาพ ใช้ครับ",
  "priority": "high" หรือ "medium" หรือ "low",
  "category": "unanswered" หรือ "purchase_intent" หรือ "support_pending" หรือ "cold_lead" หรือ "completed"
}

เกณฑ์:
- "unanswered": ลูกค้าถามแล้วยังไม่ได้ตอบ หรือ bot ตอบไม่ตรง → priority: high
- "purchase_intent": ลูกค้าสนใจซื้อ/ถามราคา แต่ยังไม่ปิดการขาย → priority: high
- "support_pending": ลูกค้ามีปัญหา/ต้องการซ่อม/เคลม ยังไม่จบ → priority: high
- "cold_lead": สนทนาค้างนานเกิน 24 ชม. ลูกค้าเคยสนใจ → priority: medium
- "completed": สนทนาจบแล้ว ลูกค้าได้ข้อมูลครบ → needsFollowup: false`;
}

// ── Call AI for analysis ──

async function callAIAnalysis(prompt: string): Promise<FollowUpResult | null> {
  // Priority 1: Claude
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 512,
          messages: [{ role: "user", content: prompt }],
          stream: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text;
        if (text) return parseAIResponse(text);
      }
    } catch (err) {
      console.error("[FollowupAgent] Claude error:", err);
    }
  }

  // Priority 2: OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 512,
          stream: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return parseAIResponse(text);
      }
    } catch (err) {
      console.error("[FollowupAgent] OpenAI error:", err);
    }
  }

  return null; // No API available — will fall back to rules
}

function parseAIResponse(text: string): FollowUpResult | null {
  try {
    // Strip markdown code blocks if present
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleaned);
    return {
      needsFollowup: !!data.needsFollowup,
      reason: data.reason || "",
      suggestedMessage: data.suggestedMessage || "",
      priority: ["high", "medium", "low"].includes(data.priority) ? data.priority : "medium",
      category: ["unanswered", "purchase_intent", "support_pending", "cold_lead", "completed"].includes(data.category)
        ? data.category
        : "cold_lead",
      displayName: "",
      lastMessageAt: 0,
      analyzedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// ── Rule-based fallback (no AI API available) ──

function ruleBasedAnalysis(
  messages: ChatMessage[],
  conv: ChatConversation
): FollowUpResult {
  const hoursSinceLastMsg = (Date.now() - conv.lastMessageAt) / (1000 * 60 * 60);
  const lastMsg = messages[messages.length - 1];

  // Rule 1: Last message from customer + no reply for > 1 hour
  if (conv.lastMessageRole === "customer" && hoursSinceLastMsg > 1) {
    return {
      needsFollowup: true,
      reason: `ลูกค้าส่งข้อความมา ${Math.round(hoursSinceLastMsg)} ชม. แล้ว ยังไม่ได้ตอบ`,
      suggestedMessage: `สวัสดีครับ ขออภัยที่ตอบช้านะครับ มีอะไรให้ช่วยเพิ่มเติมไหมครับ?`,
      priority: hoursSinceLastMsg > 24 ? "high" : "medium",
      category: "unanswered",
      displayName: conv.displayName,
      lastMessageAt: conv.lastMessageAt,
      analyzedAt: Date.now(),
    };
  }

  // Rule 2: Purchase keywords detected + conversation went cold (> 24h)
  const purchaseKeywords = ["ราคา", "ซื้อ", "สั่ง", "จ่าย", "โอน", "price", "buy", "order", "สนใจ", "เอา"];
  const hasPurchaseIntent = messages.some(
    (m) =>
      m.role === "customer" &&
      purchaseKeywords.some((kw) => m.content.toLowerCase().includes(kw))
  );
  if (hasPurchaseIntent && hoursSinceLastMsg > 24) {
    return {
      needsFollowup: true,
      reason: "ลูกค้าเคยสนใจซื้อ/ถามราคา แต่สนทนาค้างนานกว่า 24 ชม.",
      suggestedMessage: `สวัสดีครับ เห็นว่าเคยสนใจสินค้าของเรา ตอนนี้ยังสนใจอยู่ไหมครับ? มีโปรโมชั่นพิเศษมาแนะนำครับ`,
      priority: "high",
      category: "purchase_intent",
      displayName: conv.displayName,
      lastMessageAt: conv.lastMessageAt,
      analyzedAt: Date.now(),
    };
  }

  // Rule 3: Support keywords + unresolved
  const supportKeywords = ["ซ่อม", "เคลม", "เสีย", "ปัญหา", "repair", "broken", "warranty"];
  const hasSupportIssue = messages.some(
    (m) =>
      m.role === "customer" &&
      supportKeywords.some((kw) => m.content.toLowerCase().includes(kw))
  );
  if (hasSupportIssue && hoursSinceLastMsg > 4 && conv.lastMessageRole !== "admin") {
    return {
      needsFollowup: true,
      reason: "ลูกค้ามีปัญหา/ต้องการซ่อม ยังไม่ได้รับการดูแลจากแอดมิน",
      suggestedMessage: `สวัสดีครับ ทราบว่ามีปัญหาเรื่องสินค้า ขออภัยด้วยครับ ทีมงานจะติดต่อกลับเพื่อช่วยดูแลให้โดยเร็วครับ`,
      priority: "high",
      category: "support_pending",
      displayName: conv.displayName,
      lastMessageAt: conv.lastMessageAt,
      analyzedAt: Date.now(),
    };
  }

  // Rule 4: Cold lead (> 48h since last interaction)
  if (hoursSinceLastMsg > 48 && lastMsg?.role !== "admin") {
    return {
      needsFollowup: true,
      reason: `สนทนาค้างมา ${Math.round(hoursSinceLastMsg)} ชม. ลูกค้าอาจลืมหรือหมดสนใจ`,
      suggestedMessage: `สวัสดีครับ ทาง ${conv.businessId === "evlifethailand" ? "EV Life Thailand" : "DJI 13 STORE"} ยังพร้อมให้บริการครับ มีอะไรให้ช่วยเพิ่มเติมไหมครับ?`,
      priority: "low",
      category: "cold_lead",
      displayName: conv.displayName,
      lastMessageAt: conv.lastMessageAt,
      analyzedAt: Date.now(),
    };
  }

  // No follow-up needed
  return {
    needsFollowup: false,
    reason: "สนทนาปกติ ไม่ต้องติดตาม",
    suggestedMessage: "",
    priority: "low",
    category: "completed",
    displayName: conv.displayName,
    lastMessageAt: conv.lastMessageAt,
    analyzedAt: Date.now(),
  };
}

// ── Main: Analyze a single conversation ──

export async function analyzeConversation(
  messages: ChatMessage[],
  conv: ChatConversation,
  businessName: string
): Promise<FollowUpResult> {
  if (messages.length === 0) {
    return {
      needsFollowup: false,
      reason: "ไม่มีข้อความ",
      suggestedMessage: "",
      priority: "low",
      category: "completed",
      displayName: conv.displayName,
      lastMessageAt: conv.lastMessageAt,
      analyzedAt: Date.now(),
    };
  }

  // Try AI analysis first
  const prompt = buildAnalysisPrompt(messages, conv, businessName);
  const aiResult = await callAIAnalysis(prompt);

  if (aiResult) {
    aiResult.displayName = conv.displayName;
    aiResult.lastMessageAt = conv.lastMessageAt;
    return aiResult;
  }

  // Fallback to rules
  return ruleBasedAnalysis(messages, conv);
}
