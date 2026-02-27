/* ------------------------------------------------------------------ */
/*  Facebook Messenger Webhook — Node.js runtime                       */
/*                                                                      */
/*  GET  /api/facebook/webhook?businessId=xxx  → webhook verification   */
/*  POST /api/facebook/webhook?businessId=xxx  → receive messages       */
/*                                                                      */
/*  Env vars (per business):                                            */
/*    EVLIFETHAILAND_FB_PAGE_ACCESS_TOKEN                               */
/*    EVLIFETHAILAND_FB_VERIFY_TOKEN                                    */
/*    DJI13STORE_FB_PAGE_ACCESS_TOKEN                                   */
/*    DJI13STORE_FB_VERIFY_TOKEN                                        */
/*    DJI13SERVICE_FB_PAGE_ACCESS_TOKEN                                 */
/*    DJI13SERVICE_FB_VERIFY_TOKEN                                      */
/*  Fallback:                                                           */
/*    FB_PAGE_ACCESS_TOKEN / FB_VERIFY_TOKEN                            */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { getBusinessConfig, isValidBusinessId } from "@/lib/businessUnits";
import {
  generatePipelineResponseWithTrace,
  buildSystemPrompt,
  type ChatMessage,
  type LearnedData,
} from "@/lib/pipeline";
import { buildFbGenericCarousel } from "@/lib/carouselBuilder";
import { chatStore } from "@/lib/chatStore";
import { learnedStore } from "@/lib/learnedStore";
import {
  buildVisionSystemPrompt,
  buildVisionUserPrompt,
} from "@/lib/visionPrompt";
import { logTokenUsage } from "@/lib/tokenTracker";
import { getBusinessHours, checkBusinessHours } from "@/app/api/business-hours/route";

export const runtime = "nodejs";
export const maxDuration = 25;

/* ------------------------------------------------------------------ */
/*  Env helpers                                                        */
/* ------------------------------------------------------------------ */

function envKey(businessId: string, suffix: string): string {
  return `${businessId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_${suffix}`;
}

async function getFbPageToken(businessId: string): Promise<string> {
  // 1. Env var
  const fromEnv =
    (process.env as Record<string, string | undefined>)[envKey(businessId, "FB_PAGE_ACCESS_TOKEN")] ||
    process.env.FB_PAGE_ACCESS_TOKEN ||
    "";
  if (fromEnv) return fromEnv;
  // 2. Redis (saved via Dashboard)
  const g = globalThis as unknown as { __redis?: import("ioredis").default };
  if (!g.__redis) return "";
  const raw = await g.__redis.get(`fbsettings:${businessId}`);
  if (!raw) return "";
  try { return (JSON.parse(raw) as { pageAccessToken?: string }).pageAccessToken ?? ""; }
  catch { return ""; }
}

async function getFbVerifyToken(businessId: string): Promise<string> {
  const fromEnv =
    (process.env as Record<string, string | undefined>)[envKey(businessId, "FB_VERIFY_TOKEN")] ||
    process.env.FB_VERIFY_TOKEN ||
    "";
  if (fromEnv) return fromEnv;
  const g = globalThis as unknown as { __redis?: import("ioredis").default };
  if (!g.__redis) return "";
  const raw = await g.__redis.get(`fbsettings:${businessId}`);
  if (!raw) return "";
  try { return (JSON.parse(raw) as { verifyToken?: string }).verifyToken ?? ""; }
  catch { return ""; }
}

async function isFbAutoReply(businessId: string): Promise<boolean> {
  const g = globalThis as unknown as { __redis?: import("ioredis").default };
  if (!g.__redis) return true;
  const raw = await g.__redis.get(`fbsettings:${businessId}`);
  if (!raw) return true;
  try { return (JSON.parse(raw) as { autoReply?: boolean }).autoReply !== false; }
  catch { return true; }
}

/* ------------------------------------------------------------------ */
/*  Facebook Graph API helpers                                         */
/* ------------------------------------------------------------------ */

async function sendFbMessage(
  recipientId: string,
  text: string,
  accessToken: string
): Promise<void> {
  const trimmed = text.length > 2000 ? text.slice(0, 1997) + "..." : text;
  await fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: trimmed },
        messaging_type: "RESPONSE",
      }),
    }
  );
}

async function sendFbCarousel(
  recipientId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: any[],
  accessToken: string
): Promise<void> {
  try {
    const carousel = buildFbGenericCarousel(products);
    await fetch(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: carousel,
          messaging_type: "RESPONSE",
        }),
      }
    );
  } catch (err) {
    console.error("[FB webhook] sendFbCarousel error:", err);
  }
}

async function sendTypingIndicator(
  recipientId: string,
  accessToken: string,
  on: boolean
): Promise<void> {
  await fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        sender_action: on ? "typing_on" : "typing_off",
      }),
    }
  ).catch(() => {});
}

async function getFbUserProfile(
  userId: string,
  accessToken: string
): Promise<{ name: string; picture?: string }> {
  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/${userId}?fields=name,profile_pic&access_token=${accessToken}`
    );
    if (!r.ok) return { name: userId };
    const data = await r.json() as { name?: string; profile_pic?: string };
    return { name: data.name ?? userId, picture: data.profile_pic };
  } catch {
    return { name: userId };
  }
}

/* ------------------------------------------------------------------ */
/*  GET — Webhook Verification                                         */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId") || "";
  if (!businessId || !isValidBusinessId(businessId)) {
    return new Response(`Unknown businessId: "${businessId}"`, { status: 400 });
  }
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode !== "subscribe") {
    return new Response("Invalid mode", { status: 403 });
  }

  const verifyToken = await getFbVerifyToken(businessId);
  if (!verifyToken || token !== verifyToken) {
    return new Response("Forbidden — verify_token mismatch", { status: 403 });
  }

  return new Response(challenge ?? "ok", { status: 200 });
}

/* ------------------------------------------------------------------ */
/*  POST — Receive Messages                                            */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId") || "";
  if (!businessId || !isValidBusinessId(businessId)) {
    console.error(`[FB webhook] Rejected unknown businessId: "${businessId}"`);
    // Return 200 to prevent Facebook from retrying forever
    return NextResponse.json({ error: `Unknown businessId: ${businessId}` }, { status: 200 });
  }
  const biz = getBusinessConfig(businessId);

  // Parse body
  let body: FbWebhookBody;
  try {
    body = await req.json() as FbWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Must be page subscription
  if (body.object !== "page") {
    return NextResponse.json({ status: "not_page" }, { status: 200 });
  }

  const accessToken = await getFbPageToken(businessId);
  const autoReply = await isFbAutoReply(businessId);

  // Process each entry + messaging event
  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id;
      if (!senderId) continue;

      // ── Handle postback (Get Started / persistent menu) ──
      if (event.postback) {
        if (!accessToken || !autoReply) continue;
        const fbSettings = await getFbRawSettings(businessId);
        const welcome = fbSettings?.welcomeMessage ?? biz.defaultFallbackMessage;
        await sendFbMessage(senderId, welcome, accessToken);
        continue;
      }

      // ── Handle text/image messages ──
      if (!event.message) continue;
      const msg = event.message;

      // Skip echo messages (sent by the page itself)
      if (msg.is_echo) continue;

      // ── Get/create conversation in chatStore ──
      const profile = accessToken
        ? await getFbUserProfile(senderId, accessToken)
        : { name: senderId };

      const conv = await chatStore.getOrCreateConversation(businessId, senderId, {
        displayName: profile.name,
        pictureUrl: profile.picture,
        source: "facebook",
      });

      // ── Handle image attachment (vision) ──
      if (msg.attachments && msg.attachments.length > 0 && accessToken) {
        const imageAttachment = msg.attachments.find((a) => a.type === "image");
        if (imageAttachment?.payload?.url) {
          await handleFbImage(
            senderId,
            imageAttachment.payload.url,
            businessId,
            biz,
            accessToken,
            conv.botEnabled && autoReply
          );
        }
        continue;
      }

      // ── Text message ──
      const userText = msg.text?.trim();
      if (!userText) continue;

      // Save customer message
      await chatStore.addMessage(businessId, senderId, {
        role: "customer",
        content: userText,
        timestamp: Date.now(),
      });

      // Check bot enabled (per-conversation + global)
      const globalEnabled = await chatStore.isGlobalBotEnabled(businessId);
      if (!conv.botEnabled || !globalEnabled || !autoReply) continue;
      if (!accessToken) continue;

      // Typing indicator
      await sendTypingIndicator(senderId, accessToken, true);

      // Get conversation history
      const history = await chatStore.getMessages(businessId, senderId);
      const chatHistory: ChatMessage[] = history.slice(-10).map((m) => ({
        role: m.role === "customer" ? "user" : "assistant",
        content: m.content,
      }));

      // ── Run pipeline (with auto-learned data) ──
      let learnedData: LearnedData | null = null;
      try { learnedData = await learnedStore.getAllLearnedData(businessId); } catch { /* non-fatal */ }
      const pipelineResult = generatePipelineResponseWithTrace(userText, chatHistory, biz, null, learnedData);

      let replyText: string;

      if (pipelineResult.trace.finalLayer < 14) {
        // Pipeline handled it
        replyText = pipelineResult.content;

        // Handle admin escalation
        if (pipelineResult.isAdminEscalation) {
          await chatStore.pinConversation(businessId, senderId, "Admin escalation via Facebook");
        }
      } else {
        // AI fallback
        replyText = await callAiFallback(userText, chatHistory, businessId, biz);
      }

      // Off-hours suffix (non-blocking)
      try {
        const bhConfig = await getBusinessHours(businessId);
        if (bhConfig.enabled) {
          const bhStatus = checkBusinessHours(bhConfig);
          if (!bhStatus.isOpen && replyText) {
            // Only append if the reply doesn't already mention off-hours
            const mentionsOffHours = replyText.includes("นอกเวลา") || replyText.includes("ปิดทำการ");
            if (!mentionsOffHours) {
              replyText += "\n\n⏰ หมายเหตุ: ขณะนี้อยู่นอกเวลาทำการ ทีมงานจะติดต่อกลับในวันทำการถัดไปครับ";
            }
          }
        }
      } catch { /* non-fatal */ }

      // Save bot reply
      await chatStore.addMessage(businessId, senderId, {
        role: "bot",
        content: replyText,
        timestamp: Date.now(),
        pipelineLayer: pipelineResult.trace.finalLayer,
        pipelineLayerName: pipelineResult.trace.finalLayerName,
      });

      // ── Log Q&A for Admin Review (fire-and-forget) ──
      learnedStore.logQA({
        businessId,
        userId: senderId,
        userQuestion: userText,
        botAnswer: replyText,
        layer: `L${pipelineResult.trace.finalLayer} ${pipelineResult.trace.finalLayerName ?? ""}`.trim(),
        timestamp: Date.now(),
      }).catch(() => {});

      // Send reply
      await sendTypingIndicator(senderId, accessToken, false);
      await sendFbMessage(senderId, replyText, accessToken);

      // Send carousel if pipeline attached product recommendations
      if (pipelineResult.carouselProducts && pipelineResult.carouselProducts.length > 0) {
        await sendFbCarousel(senderId, pipelineResult.carouselProducts, accessToken);
      }
    }
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}

/* ------------------------------------------------------------------ */
/*  Image / Vision handler                                             */
/* ------------------------------------------------------------------ */

async function handleFbImage(
  senderId: string,
  imageUrl: string,
  businessId: string,
  biz: ReturnType<typeof getBusinessConfig>,
  accessToken: string,
  shouldReply: boolean
): Promise<void> {
  // Save image message
  await chatStore.addMessage(businessId, senderId, {
    role: "customer",
    content: "[ส่งรูปภาพ]",
    timestamp: Date.now(),
    imageUrl,
  });

  if (!shouldReply) return;

  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  let replyText = "ขอบคุณสำหรับรูปภาพครับ ผมกำลังวิเคราะห์ให้ครับ...";

  try {
    if (openaiKey) {
      // GPT-4o vision
      const systemPrompt = buildVisionSystemPrompt(biz);
      const userPrompt = buildVisionUserPrompt();

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 800,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
              ],
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json() as {
          choices: { message: { content: string } }[];
          usage?: { prompt_tokens: number; completion_tokens: number };
        };
        replyText = data.choices[0]?.message?.content ?? replyText;
        if (data.usage) {
          logTokenUsage({
            businessId, model: "gpt-4o", callSite: "fb_vision_image",
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          }).catch(() => {});
        }
      }
    } else if (anthropicKey) {
      // Claude vision
      const systemPrompt = buildVisionSystemPrompt(biz);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 800,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "url", url: imageUrl } },
                { type: "text", text: buildVisionUserPrompt() },
              ],
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json() as {
          content: { type: string; text?: string }[];
          usage?: { input_tokens: number; output_tokens: number };
        };
        replyText = data.content.find((c) => c.type === "text")?.text ?? replyText;
        if (data.usage) {
          logTokenUsage({
            businessId, model: "claude-opus-4-5", callSite: "fb_vision_image",
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error("[fb/webhook] vision error:", err);
    replyText = "ขออภัยครับ ไม่สามารถวิเคราะห์รูปภาพได้ในขณะนี้ กรุณาพิมพ์อธิบายปัญหาแทนได้เลยครับ";
  }

  await chatStore.addMessage(businessId, senderId, {
    role: "bot",
    content: replyText,
    timestamp: Date.now(),
  });
  await sendFbMessage(senderId, replyText, accessToken);
}

/* ------------------------------------------------------------------ */
/*  AI fallback (GPT Agent → Claude → GPT-4o-mini)                    */
/* ------------------------------------------------------------------ */

async function callAiFallback(
  userMessage: string,
  chatHistory: ChatMessage[],
  businessId: string,
  biz: ReturnType<typeof getBusinessConfig>
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // Off-hours note
  let offHoursNote: string | undefined;
  try {
    const bhConfig = await getBusinessHours(businessId);
    if (bhConfig.enabled && !checkBusinessHours(bhConfig).isOpen) {
      offHoursNote = bhConfig.offHoursMessage;
    }
  } catch { /* non-fatal */ }

  // Priority 1: GPT-4o Agent
  if (openaiKey) {
    try {
      const { runAgentLoop } = await import("@/lib/agent/agentLoop");
      const result = await runAgentLoop(userMessage, chatHistory, biz, undefined, offHoursNote);
      if (result.content) {
        return result.content;
      }
    } catch (err) {
      console.error("[fb/webhook] agent error:", err);
    }
  }

  // Priority 2: Claude
  if (anthropicKey) {
    try {
      const systemPrompt = buildSystemPrompt(biz, offHoursNote);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: systemPrompt,
          messages: [
            ...chatHistory.slice(-8).map((m) => ({
              role: m.role === "system" ? ("user" as const) : m.role,
              content: m.content,
            })),
            { role: "user", content: userMessage },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json() as {
          content: { type: string; text?: string }[];
          usage?: { input_tokens: number; output_tokens: number };
        };
        const text = data.content.find((c) => c.type === "text")?.text ?? "";
        if (data.usage) {
          logTokenUsage({
            businessId, model: "claude-sonnet-4-20250514", callSite: "fb_claude",
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
          }).catch(() => {});
        }
        if (text) return text;
      }
    } catch (err) {
      console.error("[fb/webhook] claude error:", err);
    }
  }

  // Priority 3: GPT-4o-mini
  if (openaiKey) {
    try {
      const systemPrompt = buildSystemPrompt(biz, offHoursNote);
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 800,
          messages: [
            { role: "system", content: systemPrompt },
            ...chatHistory.slice(-8),
            { role: "user", content: userMessage },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json() as {
          choices: { message: { content: string } }[];
          usage?: { prompt_tokens: number; completion_tokens: number };
        };
        const text = data.choices[0]?.message?.content ?? "";
        if (data.usage) {
          logTokenUsage({
            businessId, model: "gpt-4o-mini", callSite: "fb_openai",
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
          }).catch(() => {});
        }
        if (text) return text;
      }
    } catch (err) {
      console.error("[fb/webhook] openai error:", err);
    }
  }

  return biz.defaultFallbackMessage;
}

/* ------------------------------------------------------------------ */
/*  Helper — raw settings from Redis                                   */
/* ------------------------------------------------------------------ */

async function getFbRawSettings(businessId: string): Promise<{ welcomeMessage?: string } | null> {
  const g = globalThis as unknown as { __redis?: import("ioredis").default };
  if (!g.__redis) return null;
  const raw = await g.__redis.get(`fbsettings:${businessId}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/* ------------------------------------------------------------------ */
/*  Facebook Webhook body types                                        */
/* ------------------------------------------------------------------ */

interface FbWebhookBody {
  object: string;
  entry?: FbEntry[];
}

interface FbEntry {
  id: string;
  time: number;
  messaging?: FbMessagingEvent[];
}

interface FbMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    is_echo?: boolean;
    attachments?: { type: string; payload: { url?: string } }[];
  };
  postback?: { payload: string; title: string };
}
