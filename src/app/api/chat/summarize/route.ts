import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";

export const runtime = "nodejs";
export const maxDuration = 30;

/* ------------------------------------------------------------------ */
/*  Conversation Summary Trigger                                       */
/*  POST /api/chat/summarize                                           */
/*  { businessId, userId }                                             */
/*                                                                     */
/*  Called automatically when message count crosses multiples of 20.  */
/*  Uses Claude/OpenAI to generate a rolling summary stored in Redis: */
/*    convctx:{businessId}:{userId}  TTL 30 days                      */
/*                                                                     */
/*  The pipeline reads this key in L0 Context Extraction to give      */
/*  the AI rich context without sending all 500 messages.             */
/* ------------------------------------------------------------------ */

export interface ConvContext {
  userId: string;
  businessId: string;
  summary: string;          // Rolling plain-text summary (Thai)
  keyFacts: string[];       // Extracted facts: name, phone, product, budget...
  lastSummarizedAt: number;
  messageCountAtSummary: number;
}

const SUMMARY_KEY = (biz: string, uid: string) => `convctx:${biz}:${uid}`;
const TTL = 30 * 24 * 60 * 60; // 30 days

async function generateSummary(
  businessId: string,
  userId: string,
  displayName: string,
  messages: { role: string; content: string }[]
): Promise<ConvContext | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!anthropicKey && !openaiKey) return null;

  // Build conversation text (last 30 messages for summary context)
  const recent = messages.slice(-30);
  const convText = recent
    .filter((m) => !m.content.startsWith("[ระบบ]"))
    .map((m) => `[${m.role === "customer" ? displayName : m.role === "admin" ? "Admin" : "Bot"}]: ${m.content}`)
    .join("\n");

  const prompt = `วิเคราะห์บทสนทนานี้และสรุปเป็นภาษาไทย:

${convText}

ตอบในรูปแบบ JSON ดังนี้:
{
  "summary": "สรุปบทสนทนาโดยย่อ 2-3 ประโยค รวมถึงสิ่งที่ลูกค้าต้องการและสถานะล่าสุด",
  "keyFacts": ["ชื่อ: ...", "สินค้าที่สนใจ: ...", "งบประมาณ: ...", "ปัญหา: ...", "สถานะ: ..."]
}

ใส่เฉพาะข้อมูลที่พบในบทสนทนาจริงๆ ไม่ต้องแต่งเพิ่ม`;

  try {
    if (anthropicKey) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-20250514",
          max_tokens: 512,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json() as { content: { text: string }[] };
        const text = data.content?.[0]?.text ?? "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { summary: string; keyFacts: string[] };
          return {
            userId,
            businessId,
            summary: parsed.summary ?? "",
            keyFacts: parsed.keyFacts ?? [],
            lastSummarizedAt: Date.now(),
            messageCountAtSummary: messages.length,
          };
        }
      }
    } else if (openaiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 512,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices: { message: { content: string } }[] };
        const text = data.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(text) as { summary: string; keyFacts: string[] };
        return {
          userId,
          businessId,
          summary: parsed.summary ?? "",
          keyFacts: parsed.keyFacts ?? [],
          lastSummarizedAt: Date.now(),
          messageCountAtSummary: messages.length,
        };
      }
    }
  } catch (err) {
    console.error("[summarize] AI call failed:", err);
  }
  return null;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { businessId, userId } = body as { businessId: string; userId: string };
  if (!businessId || !userId) {
    return NextResponse.json({ error: "Missing businessId or userId" }, { status: 400 });
  }

  // Internal call — no session required (called from webhook pipeline)
  // Verify via shared secret to prevent abuse
  const secret = req.headers.get("x-internal-secret");
  const expected = process.env.INTERNAL_SECRET ?? "chatbot-internal";
  if (secret !== expected) {
    // Also allow calls from the same origin (admin panel)
    const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
    const baseUrl = process.env.NEXTJS_URL ?? process.env.VERCEL_URL ?? "";
    if (!origin.includes(baseUrl.replace(/^https?:\/\//, ""))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const conv = await chatStore.getConversation(businessId, userId);
  const messages = await chatStore.getMessages(businessId, userId);

  if (messages.length === 0) {
    return NextResponse.json({ success: false, reason: "no messages" });
  }

  const msgSimple = messages.map((m) => ({ role: m.role, content: m.content }));
  const displayName = conv?.displayName ?? userId;

  const ctx = await generateSummary(businessId, userId, displayName, msgSimple);
  if (!ctx) {
    return NextResponse.json({ success: false, reason: "AI unavailable or no API key" });
  }

  // Save to Redis
  const Redis = (await import("ioredis")).default;
  const g = globalThis as unknown as { __redis_sum?: InstanceType<typeof Redis> };
  if (!g.__redis_sum && process.env.REDIS_URL) {
    g.__redis_sum = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      retryStrategy: (t) => (t > 3 ? null : Math.min(t * 200, 1000)),
    });
  }
  if (g.__redis_sum) {
    const key = SUMMARY_KEY(businessId, userId);
    await g.__redis_sum.set(key, JSON.stringify(ctx));
    await g.__redis_sum.expire(key, TTL);
  }

  return NextResponse.json({ success: true, summary: ctx.summary, factsCount: ctx.keyFacts.length });
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const userId = req.nextUrl.searchParams.get("userId");
  if (!businessId || !userId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const Redis = (await import("ioredis")).default;
  const g = globalThis as unknown as { __redis_sum?: InstanceType<typeof Redis> };
  if (!g.__redis_sum && process.env.REDIS_URL) {
    g.__redis_sum = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      retryStrategy: (t) => (t > 3 ? null : Math.min(t * 200, 1000)),
    });
  }

  if (!g.__redis_sum) return NextResponse.json({ context: null });

  const raw = await g.__redis_sum.get(SUMMARY_KEY(businessId, userId));
  const context = raw ? JSON.parse(raw) as ConvContext : null;
  return NextResponse.json({ context });
}
