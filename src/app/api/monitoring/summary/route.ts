/* ------------------------------------------------------------------ */
/*  /api/monitoring/summary — Generate AI summary for a conversation    */
/*                                                                      */
/*  POST { businessId, userId } → triggers GPT-4o summary generation   */
/*  GET  { businessId, userId } → return cached summary                 */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";
import type { ChatSummary } from "@/lib/chatStore";
import { logTokenUsage } from "@/lib/tokenTracker";

export const runtime = "nodejs";
export const maxDuration = 30;

// Thai timezone date string
function toThaiDate(ts: number): string {
  return new Date(ts + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const userId = req.nextUrl.searchParams.get("userId");

  if (!businessId || !userId) {
    return NextResponse.json({ error: "Missing businessId or userId" }, { status: 400 });
  }

  const summary = await chatStore.getChatSummary(businessId, userId);
  return NextResponse.json({ summary });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, userId, force } = await req.json() as {
      businessId: string;
      userId: string;
      force?: boolean;
    };

    if (!businessId || !userId) {
      return NextResponse.json({ error: "Missing businessId or userId" }, { status: 400 });
    }

    // Check cache unless force=true
    if (!force) {
      const cached = await chatStore.getChatSummary(businessId, userId);
      if (cached) return NextResponse.json({ summary: cached, cached: true });
    }

    // Fetch conversation + messages
    const [conv, messages] = await Promise.all([
      chatStore.getOrCreateConversation(businessId, userId),
      chatStore.getMessages(businessId, userId),
    ]);

    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages to summarize" }, { status: 400 });
    }

    // Build conversation text for GPT
    const convText = messages
      .slice(-60) // last 60 messages
      .map((m) => {
        const role =
          m.role === "customer"
            ? `ลูกค้า (${conv.displayName})`
            : m.role === "admin"
            ? `Admin (${m.sentBy || "admin"})`
            : "Bot";
        return `[${role}]: ${m.content}`;
      })
      .join("\n");

    const adminNames = [
      ...new Set(
        messages
          .filter((m) => m.role === "admin" && m.sentBy)
          .map((m) => m.sentBy!)
      ),
    ];

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: "No OpenAI API key" }, { status: 500 });
    }

    // Call GPT-4o to summarize
    const systemPrompt = `คุณคือระบบวิเคราะห์การสนทนาของธุรกิจ
ตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น
Format ที่ต้องการ:
{
  "topic": "หัวข้อหลักที่คุยกัน (1 ประโยค)",
  "outcome": "ผลลัพธ์ของการสนทนา (เช่น ลูกค้าสนใจซื้อ, resolved, ยังไม่ตัดสินใจ)",
  "sentiment": "positive | neutral | negative",
  "keyPoints": ["bullet point 1", "bullet point 2", "bullet point 3"],
  "pendingAction": "งานที่ยังค้างอยู่ หรือ null ถ้าไม่มี"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `สรุปการสนทนานี้:\n\n${convText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 400,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "GPT call failed" }, { status: 500 });
    }

    const gptData = await response.json() as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    // Log token usage (fire-and-forget)
    logTokenUsage({
      businessId,
      model: "gpt-4o-mini",
      callSite: "monitoring_summary",
      promptTokens: gptData.usage?.prompt_tokens ?? 0,
      completionTokens: gptData.usage?.completion_tokens ?? 0,
      conversationId: userId,
    }).catch(() => {});
    const raw = gptData.choices[0]?.message?.content || "{}";
    let parsed: {
      topic?: string;
      outcome?: string;
      sentiment?: string;
      keyPoints?: string[];
      pendingAction?: string | null;
    } = {};

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    // Compute duration (first to last message)
    const firstMsg = messages[0];
    const lastMsg = messages[messages.length - 1];
    const durationMin = firstMsg && lastMsg
      ? Math.round((lastMsg.timestamp - firstMsg.timestamp) / (1000 * 60))
      : 0;

    const summary: ChatSummary = {
      userId,
      businessId,
      displayName: conv.displayName,
      topic: parsed.topic || "ไม่ระบุ",
      outcome: parsed.outcome || "ไม่ระบุ",
      sentiment:
        (parsed.sentiment as ChatSummary["sentiment"]) || "neutral",
      keyPoints: parsed.keyPoints || [],
      pendingAction: parsed.pendingAction || undefined,
      adminHandled: adminNames.length > 0,
      adminNames,
      messageCount: messages.length,
      duration: durationMin,
      summarizedAt: Date.now(),
      conversationDate: toThaiDate(conv.lastMessageAt),
    };

    await chatStore.saveChatSummary(summary);

    return NextResponse.json({ summary, cached: false });
  } catch (err) {
    console.error("[monitoring/summary] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
