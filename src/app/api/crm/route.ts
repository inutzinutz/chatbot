/* ------------------------------------------------------------------ */
/*  CRM API                                                             */
/*                                                                      */
/*  GET  ?businessId=&userId=           → get single CRM profile        */
/*  GET  ?businessId=&view=all          → list all CRM profiles         */
/*  GET  ?businessId=&view=export       → CSV export (all profiles)     */
/*  POST { action:"extract", businessId, userId }  → AI auto-extract    */
/*  POST { action:"save",    businessId, profile } → admin manual save  */
/*  POST { action:"delete",  businessId, userId }  → delete profile     */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { chatStore, type CRMProfile } from "@/lib/chatStore";
import { requireAdminSession, unauthorizedResponse } from "@/lib/auth";
import { logTokenUsage } from "@/lib/tokenTracker";

export const runtime = "nodejs";
export const maxDuration = 30;

// ── AI Extraction ──────────────────────────────────────────────────

const EXTRACT_SYSTEM = `คุณคือระบบ CRM extraction สำหรับธุรกิจไทย
วิเคราะห์บทสนทนาแล้วดึงข้อมูลลูกค้าออกมาเป็น JSON เท่านั้น ไม่มีข้อความอื่น

Format ที่ต้องการ (ถ้าไม่มีข้อมูลให้ใส่ null):
{
  "name": "ชื่อจริงของลูกค้า (ไม่ใช่ชื่อ LINE)",
  "phone": "เบอร์โทรศัพท์ (format: 0XX-XXX-XXXX หรือ 0XXXXXXXXX)",
  "email": "อีเมล หรือ null",
  "interestedProducts": ["สินค้า1", "สินค้า2"],
  "budget": "งบประมาณที่บอก เช่น '10,000 บาท' หรือ null",
  "purchaseIntent": "hot|warm|cold|purchased (ประเมินจากบทสนทนา)",
  "province": "จังหวัดที่อยู่ หรือ null",
  "occupation": "อาชีพ หรือ null",
  "stage": "lead|prospect|customer|churned"
}

กฎ:
- ดึงเฉพาะข้อมูลที่ลูกค้าบอกในบทสนทนา อย่าเดา
- purchaseIntent: hot=ถามราคา/พร้อมซื้อ, warm=สนใจแต่ยังไม่ซื้อ, cold=แค่ถามข้อมูล, purchased=ซื้อแล้ว
- stage: lead=ยังไม่รู้จัก, prospect=สนใจสินค้า, customer=เคยซื้อ, churned=เลิกใช้`;

async function extractWithAI(
  messages: { role: string; content: string }[],
  displayName: string,
  businessId: string
): Promise<Partial<CRMProfile> | null> {
  // Build conversation text (last 40 messages, customer only)
  const convText = messages
    .filter((m) => m.role === "customer" || m.role === "bot" || m.role === "admin")
    .slice(-40)
    .map((m) => {
      const label = m.role === "customer" ? `ลูกค้า (${displayName})` : m.role === "admin" ? "Admin" : "Bot";
      return `[${label}]: ${m.content}`;
    })
    .join("\n");

  if (!convText.trim()) return null;

  // Try Claude first
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
          model: "claude-haiku-4-5",
          max_tokens: 500,
          system: EXTRACT_SYSTEM,
          messages: [{ role: "user", content: `สกัดข้อมูล CRM จากบทสนทนานี้:\n\n${convText}` }],
        }),
      });
      if (res.ok) {
        const data = await res.json() as { content?: { text: string }[]; usage?: { input_tokens: number; output_tokens: number } };
        const text = data.content?.[0]?.text?.trim() || "";
        logTokenUsage({ businessId, model: "claude-haiku-4-5", callSite: "crm_extract", promptTokens: data.usage?.input_tokens ?? 0, completionTokens: data.usage?.output_tokens ?? 0 }).catch(() => {});
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
      }
    } catch { /* fallthrough */ }
  }

  // Try OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 500,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: EXTRACT_SYSTEM },
            { role: "user", content: `สกัดข้อมูล CRM จากบทสนทนานี้:\n\n${convText}` },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices?: { message: { content: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
        const text = data.choices?.[0]?.message?.content || "{}";
        logTokenUsage({ businessId, model: "gpt-4o-mini", callSite: "crm_extract", promptTokens: data.usage?.prompt_tokens ?? 0, completionTokens: data.usage?.completion_tokens ?? 0 }).catch(() => {});
        return JSON.parse(text);
      }
    } catch { /* fallthrough */ }
  }

  return null;
}

// ── GET handler ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const businessId = searchParams.get("businessId");
  const userId = searchParams.get("userId");
  const view = searchParams.get("view");

  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });

  // Auth guard
  const session = await requireAdminSession(req, businessId);
  if (!session) return unauthorizedResponse();

  // Export CSV
  if (view === "export") {
    const profiles = await chatStore.getAllCRMProfiles(businessId);
    const headers = ["userId","name","phone","email","lineDisplayName","interestedProducts","budget","purchaseIntent","province","occupation","stage","tags","extractedAt","updatedAt"];
    const csvRows = [
      headers.join(","),
      ...profiles.map((p) => headers.map((h) => {
        const val = (p as unknown as Record<string, unknown>)[h];
        if (Array.isArray(val)) return `"${val.join("; ")}"`;
        if (val == null) return "";
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",")),
    ];
    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="crm_${businessId}_${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  }

  // All profiles list
  if (view === "all") {
    const profiles = await chatStore.getAllCRMProfiles(businessId);
    return NextResponse.json({ profiles });
  }

  // Single profile
  if (userId) {
    const profile = await chatStore.getCRMProfile(businessId, userId);
    return NextResponse.json({ profile });
  }

  return NextResponse.json({ error: "Specify userId or view=all" }, { status: 400 });
}

// ── POST handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { action, businessId, userId } = body as { action: string; businessId: string; userId?: string };

  if (!action || !businessId) return NextResponse.json({ error: "Missing action or businessId" }, { status: 400 });

  const session = await requireAdminSession(req, businessId);
  if (!session) return unauthorizedResponse();

  // ── Extract: AI reads chat and fills CRM ──
  if (action === "extract") {
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const [conv, msgs] = await Promise.all([
      chatStore.getOrCreateConversation(businessId, userId),
      chatStore.getMessages(businessId, userId),
    ]);

    const extracted = await extractWithAI(
      msgs.map((m) => ({ role: m.role, content: m.content })),
      conv.displayName || userId,
      businessId
    );

    if (!extracted) return NextResponse.json({ error: "AI extraction failed — no API key or empty chat" }, { status: 422 });

    // Merge with existing profile (don't overwrite manual edits with null)
    const existing = await chatStore.getCRMProfile(businessId, userId) ?? null;
    const now = Date.now();

    const merged: CRMProfile = {
      userId,
      businessId,
      lineDisplayName: conv.displayName,
      createdAt: existing?.createdAt ?? now,
      // Apply extracted fields only if non-null
      name: (extracted.name as string | null | undefined) || existing?.name,
      phone: (extracted.phone as string | null | undefined) || existing?.phone,
      email: (extracted.email as string | null | undefined) || existing?.email,
      interestedProducts: (extracted.interestedProducts as string[] | null | undefined)?.length
        ? (extracted.interestedProducts as string[])
        : existing?.interestedProducts,
      budget: (extracted.budget as string | null | undefined) || existing?.budget,
      purchaseIntent: (extracted.purchaseIntent as CRMProfile["purchaseIntent"] | null | undefined) || existing?.purchaseIntent,
      province: (extracted.province as string | null | undefined) || existing?.province,
      occupation: (extracted.occupation as string | null | undefined) || existing?.occupation,
      stage: (extracted.stage as CRMProfile["stage"] | null | undefined) || existing?.stage,
      tags: existing?.tags,
      extractedAt: now,
      extractedBy: "ai",
      updatedAt: now,
      updatedBy: session.username,
    };

    await chatStore.saveCRMProfile(merged);
    return NextResponse.json({ profile: merged, extracted });
  }

  // ── Save: admin manually edits CRM ──
  if (action === "save") {
    const profileData = body.profile as Partial<CRMProfile>;
    if (!profileData?.userId) return NextResponse.json({ error: "Missing profile.userId" }, { status: 400 });

    const existing = await chatStore.getCRMProfile(businessId, profileData.userId) ?? null;
    const now = Date.now();

    const profile: CRMProfile = {
      userId: profileData.userId,
      businessId,
      lineDisplayName: profileData.lineDisplayName || existing?.lineDisplayName,
      createdAt: existing?.createdAt ?? now,
      name: profileData.name ?? existing?.name,
      phone: profileData.phone ?? existing?.phone,
      email: profileData.email ?? existing?.email,
      interestedProducts: profileData.interestedProducts ?? existing?.interestedProducts,
      budget: profileData.budget ?? existing?.budget,
      purchaseIntent: profileData.purchaseIntent ?? existing?.purchaseIntent,
      province: profileData.province ?? existing?.province,
      occupation: profileData.occupation ?? existing?.occupation,
      stage: profileData.stage ?? existing?.stage,
      tags: profileData.tags ?? existing?.tags,
      extractedAt: existing?.extractedAt,
      extractedBy: existing?.extractedBy,
      updatedAt: now,
      updatedBy: session.username,
    };

    await chatStore.saveCRMProfile(profile);
    return NextResponse.json({ profile });
  }

  // ── Delete ──
  if (action === "delete") {
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    await chatStore.deleteCRMProfile(businessId, userId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
