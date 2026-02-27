/* ------------------------------------------------------------------ */
/*  POST /api/learn                                                     */
/*                                                                      */
/*  Auto-learning endpoint — two modes:                                 */
/*  1. retrain=true  (admin marked answer as bad):                      */
/*     GPT-4o gets the bad answer + knowledge base → generates a        */
/*     correct answer, then saves learned rule.                         */
/*  2. retrain=false (legacy: admin supplied correction manually):      */
/*     GPT-4o analyses before/after correction.                         */
/*                                                                      */
/*  Auth: internal-secret header                                        */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { learnedStore } from "@/lib/learnedStore";
import { getBusinessConfig } from "@/lib/businessUnits";

export const runtime = "nodejs";
export const maxDuration = 30;

const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? "chatbot-internal";

// ── System prompts for GPT-4o ─────────────────────────────────────────

/** Mode 1: admin manually supplied the correct answer */
function buildAnalysisPrompt(
  businessName: string,
  userQuestion: string,
  botResponse: string,
  adminCorrection: string,
  existingIntentNames: string,
): string {
  return `You are an AI training assistant for "${businessName}" customer service chatbot.

A human admin corrected the bot's response. Analyze this correction and decide what the bot should learn.

CUSTOMER QUESTION:
"${userQuestion}"

BOT RESPONSE (incorrect/insufficient):
"${botResponse}"

ADMIN CORRECTION (the right answer):
"${adminCorrection}"

EXISTING INTENT NAMES (for reference):
${existingIntentNames}

Analyze and respond with a JSON object (no markdown, just raw JSON):

{
  "action": "intent" | "knowledge" | "script" | "none",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation in Thai",

  // If action = "intent":
  "intent": {
    "intentId": "existing_intent_id or 'new'",
    "intentName": "ชื่อ intent ภาษาไทย",
    "triggers": ["คำสำคัญ1", "คำสำคัญ2", "..."],
    "responseTemplate": "คำตอบที่ควรใช้ (ภาษาไทย)"
  },

  // If action = "knowledge":
  "knowledge": {
    "title": "หัวข้อเอกสาร",
    "triggers": ["คำสำคัญ1", "คำสำคัญ2"],
    "content": "เนื้อหาความรู้ที่สมบูรณ์ (ภาษาไทย)"
  },

  // If action = "script":
  "script": {
    "name": "ชื่อ script",
    "triggers": ["คำสำคัญ1", "คำสำคัญ2"],
    "adminReply": "ข้อความที่ admin ใช้ตอบ (ภาษาไทย)"
  }
}

Rules:
- Use "intent" when bot couldn't recognise the TOPIC at all (wrong or no match)
- Use "knowledge" when it's factual info, policy, technical detail the bot didn't know
- Use "script" when admin gave a reusable sales/service reply (pitch, promotion, etc.)
- Use "none" when it's a personal one-off answer, escalation, or contact info exchange
- Triggers must be SHORT Thai keywords (1-4 words) the customer is likely to type
- Confidence > 0.6 to save; < 0.6 means too ambiguous
- Response template MUST be in Thai and complete (ready to send to customer)
- Do NOT include any markdown in the JSON values`;
}

/** Mode 2: admin marked answer as bad — GPT-4o must generate correct answer from KB */
function buildRetrainPrompt(
  businessName: string,
  userQuestion: string,
  badBotResponse: string,
  existingIntentNames: string,
  knowledgeSummary: string,
): string {
  return `You are an AI training assistant for "${businessName}" customer service chatbot.

An admin reviewed a bot response and marked it as INCORRECT. You must:
1. Understand what the customer was asking
2. Use the knowledge base below to generate a correct answer
3. Save a learned rule so the bot answers correctly next time

CUSTOMER QUESTION:
"${userQuestion}"

BAD BOT RESPONSE (marked as incorrect by admin):
"${badBotResponse}"

BUSINESS KNOWLEDGE BASE (use this to write the correct answer):
${knowledgeSummary}

EXISTING INTENT NAMES:
${existingIntentNames}

Respond with a JSON object (no markdown, just raw JSON):

{
  "action": "intent" | "knowledge" | "script" | "none",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation in Thai",

  "intent": {
    "intentId": "existing_intent_id or 'new'",
    "intentName": "ชื่อ intent ภาษาไทย",
    "triggers": ["คำสำคัญ1", "คำสำคัญ2"],
    "responseTemplate": "คำตอบที่ถูกต้องสมบูรณ์ (ภาษาไทย)"
  },

  "knowledge": {
    "title": "หัวข้อเอกสาร",
    "triggers": ["คำสำคัญ1", "คำสำคัญ2"],
    "content": "เนื้อหาความรู้ที่สมบูรณ์ (ภาษาไทย)"
  },

  "script": {
    "name": "ชื่อ script",
    "triggers": ["คำสำคัญ1", "คำสำคัญ2"],
    "adminReply": "ข้อความที่ควรตอบ (ภาษาไทย)"
  }
}

Rules:
- Generate a COMPLETE correct Thai response based on the knowledge base
- Use "intent" for topic/routing errors, "knowledge" for factual errors, "script" for sales pitch errors
- Use "none" only if the question is personal/one-off and impossible to generalise
- Triggers must be SHORT Thai keywords (1-4 words)
- Confidence > 0.7 required (you have KB to reference, so be confident)
- Do NOT include any markdown in the JSON values`;
}

// ── POST handler ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  const secret = req.headers.get("x-internal-secret");
  if (secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "No OPENAI_API_KEY" }, { status: 503 });
  }

  let body: {
    businessId: string;
    userQuestion: string;
    botMessage: string;
    adminCorrection: string;
    correctionId?: string;
    qaId?: string;
    retrain?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { businessId, userQuestion, botMessage, adminCorrection, correctionId, qaId, retrain } = body;
  if (!businessId || !userQuestion || !botMessage) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  // Non-retrain mode requires adminCorrection
  if (!retrain && !adminCorrection) {
    return NextResponse.json({ error: "Missing adminCorrection" }, { status: 400 });
  }

  try {
    const biz = getBusinessConfig(businessId);
    const existingIntentNames = biz.intents
      .map((i) => `- ${i.id}: ${i.name}`)
      .join("\n");

    // Track this as a miss for dashboard stats
    await learnedStore.trackMiss(businessId, userQuestion);

    // Build system prompt depending on mode
    let systemPrompt: string;
    if (retrain) {
      // Mode 2: auto-retrain — build knowledge summary from biz config
      const kbLines: string[] = [];
      if (biz.intents?.length) {
        kbLines.push("## Intents");
        for (const intent of biz.intents.slice(0, 20)) {
          kbLines.push(`- ${intent.name}: triggers=[${(intent.triggers ?? []).slice(0, 5).join(", ")}]`);
        }
      }
      if (biz.systemPromptIdentity) {
        kbLines.push("\n## System Context");
        kbLines.push(biz.systemPromptIdentity.slice(0, 800));
      }
      const knowledgeSummary = kbLines.join("\n") || "No knowledge base available.";
      systemPrompt = buildRetrainPrompt(biz.name, userQuestion, botMessage, existingIntentNames, knowledgeSummary);
    } else {
      systemPrompt = buildAnalysisPrompt(biz.name, userQuestion, botMessage, adminCorrection, existingIntentNames);
    }

    // Call GPT-4o to analyze
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: retrain
              ? "Analyze the bad bot response and generate a learned rule. Return the JSON decision."
              : "Analyze the correction and return the JSON decision.",
          },
        ],
      }),
    });

    if (!gptResponse.ok) {
      const err = await gptResponse.text().catch(() => "");
      console.error("[learn] GPT error:", gptResponse.status, err);
      return NextResponse.json({ error: "GPT failed", detail: err }, { status: 502 });
    }

    const gptData = await gptResponse.json() as {
      choices: { message: { content: string } }[];
    };
    const raw = gptData.choices?.[0]?.message?.content ?? "{}";

    let decision: {
      action: "intent" | "knowledge" | "script" | "none";
      confidence: number;
      reasoning: string;
      intent?: {
        intentId: string;
        intentName: string;
        triggers: string[];
        responseTemplate: string;
      };
      knowledge?: {
        title: string;
        triggers: string[];
        content: string;
      };
      script?: {
        name: string;
        triggers: string[];
        adminReply: string;
      };
    };

    try {
      decision = JSON.parse(raw);
    } catch {
      console.error("[learn] GPT returned invalid JSON:", raw);
      return NextResponse.json({ error: "GPT returned invalid JSON", raw }, { status: 502 });
    }

    // Confidence threshold: only save if GPT is reasonably sure
    if (decision.action === "none" || decision.confidence < 0.6) {
      return NextResponse.json({
        saved: false,
        action: decision.action,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
      });
    }

    let savedId: string | null = null;

    const sourceAnswer = adminCorrection || (decision.intent?.responseTemplate ?? decision.knowledge?.content ?? decision.script?.adminReply ?? "");

    if (decision.action === "intent" && decision.intent) {
      const learned = await learnedStore.saveLearnedIntent({
        businessId,
        intentId: decision.intent.intentId,
        intentName: decision.intent.intentName,
        triggers: decision.intent.triggers,
        responseTemplate: decision.intent.responseTemplate,
        sourceQuestion: userQuestion,
        sourceAdminAnswer: sourceAnswer,
        confidence: decision.confidence,
        enabled: true,
      });
      savedId = learned.id;
    } else if (decision.action === "knowledge" && decision.knowledge) {
      const learned = await learnedStore.saveLearnedKnowledge({
        businessId,
        title: decision.knowledge.title,
        content: decision.knowledge.content,
        triggers: decision.knowledge.triggers,
        sourceQuestion: userQuestion,
        sourceAdminAnswer: sourceAnswer,
        confidence: decision.confidence,
        enabled: true,
      });
      savedId = learned.id;
    } else if (decision.action === "script" && decision.script) {
      const learned = await learnedStore.saveLearnedScript({
        businessId,
        name: decision.script.name,
        triggers: decision.script.triggers,
        adminReply: decision.script.adminReply,
        sourceQuestion: userQuestion,
        confidence: decision.confidence,
        enabled: true,
      });
      savedId = learned.id;
    }

    console.log(
      `[learn] ${businessId} → ${decision.action} (conf=${decision.confidence}) id=${savedId} retrain=${!!retrain} qaId=${qaId ?? "-"} "${userQuestion.slice(0, 60)}"`
    );

    return NextResponse.json({
      saved: true,
      action: decision.action,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      savedId,
      correctionId,
      qaId,
    });

  } catch (err) {
    console.error("[learn] Unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── GET: List learned data + stats ───────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== INTERNAL_SECRET) {
    // Also allow authenticated admins via session (no secret needed from UI)
    // For simplicity: require businessId and allow if no secret needed (public stats)
  }

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const view = req.nextUrl.searchParams.get("view") || "all";

  if (view === "stats") {
    const stats = await learnedStore.getStats(businessId);
    return NextResponse.json({ stats });
  }

  const [intents, knowledge, scripts, stats] = await Promise.all([
    learnedStore.getLearnedIntents(businessId),
    learnedStore.getLearnedKnowledge(businessId),
    learnedStore.getLearnedScripts(businessId),
    learnedStore.getStats(businessId),
  ]);

  return NextResponse.json({ intents, knowledge, scripts, stats });
}

// ── PATCH: Toggle / delete learned items ─────────────────────────────

export async function PATCH(req: NextRequest) {
  let body: {
    businessId: string;
    type: "intent" | "knowledge" | "script";
    id: string;
    action: "enable" | "disable" | "delete";
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { businessId, type, id, action } = body;
  if (!businessId || !type || !id || !action) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (action === "delete") {
    if (type === "intent") await learnedStore.deleteLearnedIntent(businessId, id);
    if (type === "knowledge") await learnedStore.deleteLearnedKnowledge(businessId, id);
    if (type === "script") await learnedStore.deleteLearnedScript(businessId, id);
  } else {
    const enabled = action === "enable";
    if (type === "intent") await learnedStore.toggleLearnedIntent(businessId, id, enabled);
    if (type === "knowledge") await learnedStore.toggleLearnedKnowledge(businessId, id, enabled);
    if (type === "script") await learnedStore.toggleLearnedScript(businessId, id, enabled);
  }

  return NextResponse.json({ success: true });
}
