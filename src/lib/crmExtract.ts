/* ------------------------------------------------------------------ */
/*  CRM Auto-extract — server-side helper                              */
/*  Called fire-and-forget from LINE webhook after each customer msg   */
/*                                                                      */
/*  Uses Claude Haiku (cheapest) → OpenAI fallback                    */
/*  Only runs if the conversation has ≥ 5 customer messages            */
/*  (to avoid running on very short/greeting-only chats)              */
/* ------------------------------------------------------------------ */

import { chatStore, type CRMProfile } from "./chatStore";
import { logTokenUsage } from "./tokenTracker";

const EXTRACT_SYSTEM = `คุณคือระบบ CRM extraction สำหรับธุรกิจไทย
วิเคราะห์บทสนทนาแล้วดึงข้อมูลลูกค้าออกมาเป็น JSON เท่านั้น ไม่มีข้อความอื่น

Format ที่ต้องการ (ถ้าไม่มีข้อมูลให้ใส่ null):
{
  "name": "ชื่อจริงของลูกค้า (ไม่ใช่ชื่อ LINE)",
  "phone": "เบอร์โทรศัพท์ (format: 0XX-XXX-XXXX หรือ 0XXXXXXXXX)",
  "email": "อีเมล หรือ null",
  "interestedProducts": ["สินค้า1", "สินค้า2"],
  "budget": "งบประมาณที่บอก เช่น '10,000 บาท' หรือ null",
  "purchaseIntent": "hot|warm|cold|purchased",
  "province": "จังหวัดที่อยู่ หรือ null",
  "occupation": "อาชีพ หรือ null",
  "stage": "lead|prospect|customer|churned"
}

กฎ:
- ดึงเฉพาะข้อมูลที่ลูกค้าบอกในบทสนทนา อย่าเดา
- hot=ถามราคา/พร้อมซื้อ, warm=สนใจแต่ยังไม่ซื้อ, cold=แค่ถามข้อมูล, purchased=ซื้อแล้ว`;

type RawExtract = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  interestedProducts?: string[] | null;
  budget?: string | null;
  purchaseIntent?: string | null;
  province?: string | null;
  occupation?: string | null;
  stage?: string | null;
};

async function callAI(prompt: string, businessId: string): Promise<RawExtract | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 400,
          system: EXTRACT_SYSTEM,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json() as { content?: { text: string }[]; usage?: { input_tokens: number; output_tokens: number } };
        const text = data.content?.[0]?.text?.trim() || "";
        logTokenUsage({ businessId, model: "claude-haiku-4-5", callSite: "crm_extract", promptTokens: data.usage?.input_tokens ?? 0, completionTokens: data.usage?.output_tokens ?? 0 }).catch(() => {});
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]) as RawExtract;
      }
    } catch { /* fallthrough */ }
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 400,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: EXTRACT_SYSTEM },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices?: { message: { content: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
        const text = data.choices?.[0]?.message?.content || "{}";
        logTokenUsage({ businessId, model: "gpt-4o-mini", callSite: "crm_extract", promptTokens: data.usage?.prompt_tokens ?? 0, completionTokens: data.usage?.completion_tokens ?? 0 }).catch(() => {});
        return JSON.parse(text) as RawExtract;
      }
    } catch { /* fallthrough */ }
  }

  return null;
}

/**
 * Auto-extract CRM data from a conversation and upsert into Redis.
 * Call fire-and-forget: `autoExtractCRM(biz, uid).catch(() => {})`
 *
 * Only runs if the conversation has ≥ 5 customer messages
 * OR if the last message contains a phone number pattern.
 */
export async function autoExtractCRM(businessId: string, userId: string): Promise<void> {
  try {
    const [conv, msgs] = await Promise.all([
      chatStore.getOrCreateConversation(businessId, userId),
      chatStore.getMessages(businessId, userId),
    ]);

    const customerMsgs = msgs.filter((m) => m.role === "customer");
    const totalText = customerMsgs.map((m) => m.content).join(" ");

    // Quick heuristic: skip if very short chat with no interesting signals
    const hasPhonePattern = /0[0-9]{8,9}/.test(totalText);
    const hasNameSignal = /ชื่อ|เรียกว่า|ผม|ดิฉัน|ชื่อว่า/.test(totalText);
    const hasProductSignal = /สนใจ|อยากได้|ต้องการ|ราคา|ซื้อ|สั่ง/.test(totalText);

    if (customerMsgs.length < 3 && !hasPhonePattern && !hasNameSignal && !hasProductSignal) {
      return; // not enough signal yet
    }

    // Build compact conversation text (last 30 messages)
    const convText = msgs
      .slice(-30)
      .map((m) => {
        const label = m.role === "customer" ? `ลูกค้า (${conv.displayName})` : m.role === "admin" ? "Admin" : "Bot";
        return `[${label}]: ${m.content}`;
      })
      .join("\n");

    const extracted = await callAI(`สกัดข้อมูล CRM จากบทสนทนานี้:\n\n${convText}`, businessId);
    if (!extracted) return;

    // Check if anything meaningful was extracted
    const hasData = extracted.name || extracted.phone || extracted.email ||
      extracted.interestedProducts?.length || extracted.budget ||
      extracted.province || extracted.occupation;
    if (!hasData) return;

    const existing = await chatStore.getCRMProfile(businessId, userId);
    const now = Date.now();

    const profile: CRMProfile = {
      userId,
      businessId,
      lineDisplayName: conv.displayName,
      createdAt: existing?.createdAt ?? now,
      // Merge: prefer existing manual edits, fall back to extracted
      name: existing?.name || (extracted.name ?? undefined),
      phone: existing?.phone || (extracted.phone ?? undefined),
      email: existing?.email || (extracted.email ?? undefined),
      interestedProducts: extracted.interestedProducts?.filter(Boolean) as string[] | undefined
        || existing?.interestedProducts,
      budget: extracted.budget ?? existing?.budget ?? undefined,
      purchaseIntent: (extracted.purchaseIntent as CRMProfile["purchaseIntent"]) || existing?.purchaseIntent,
      province: extracted.province ?? existing?.province ?? undefined,
      occupation: extracted.occupation ?? existing?.occupation ?? undefined,
      stage: (extracted.stage as CRMProfile["stage"]) || existing?.stage || "lead",
      tags: existing?.tags,
      extractedAt: now,
      extractedBy: "ai",
      updatedAt: now,
      updatedBy: "auto",
    };

    await chatStore.saveCRMProfile(profile);
  } catch (err) {
    console.error("[crmExtract] Error:", err);
  }
}
