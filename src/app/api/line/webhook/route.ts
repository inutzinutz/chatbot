import { NextRequest, NextResponse } from "next/server";
import { getBusinessConfig, isValidBusinessId } from "@/lib/businessUnits";
import {
  generatePipelineResponseWithTrace,
  buildSystemPrompt,
  type ChatMessage,
  type LearnedData,
} from "@/lib/pipeline";
import { learnedStore } from "@/lib/learnedStore";
import { buildLineFlexCarousel } from "@/lib/carouselBuilder";
import { chatStore, type LineChannelSettings } from "@/lib/chatStore";
import {
  buildVisionSystemPrompt,
  buildVisionUserPrompt,
  buildPdfUserPrompt,
} from "@/lib/visionPrompt";
import { logTokenUsage } from "@/lib/tokenTracker";
import { autoExtractCRM } from "@/lib/crmExtract";
import { isUserRateLimited, isReplyTokenProcessed } from "@/lib/rateLimit";
import { trackFunnelEvent } from "@/lib/funnelTracker";

export const runtime = "nodejs";
export const maxDuration = 25; // seconds (Vercel Hobby limit)

/* ------------------------------------------------------------------ */
/*  LINE Webhook — shared endpoint for all businesses                  */
/*  Usage: POST /api/line/webhook?businessId=evlifethailand            */
/*                                                                     */
/*  Env vars (per business):                                           */
/*    EVLIFETHAILAND_LINE_CHANNEL_SECRET                               */
/*    EVLIFETHAILAND_LINE_CHANNEL_ACCESS_TOKEN                         */
/*    DJI13STORE_LINE_CHANNEL_SECRET                                   */
/*    DJI13STORE_LINE_CHANNEL_ACCESS_TOKEN                             */
/*    DJI13SUPPORT_LINE_CHANNEL_SECRET       (businessId=dji13support) */
/*    DJI13SUPPORT_LINE_CHANNEL_ACCESS_TOKEN (businessId=dji13support) */
/*  Or fallback:                                                       */
/*    LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN                  */
/* ------------------------------------------------------------------ */

// ── Env helpers ──

// Override map: businessId → env var prefix
// Use this when the env var prefix differs from the auto-derived businessId prefix.
const ENV_PREFIX_OVERRIDE: Record<string, string> = {
  dji13support: "DJI13SUPPORT",
};

function envKey(businessId: string, suffix: string): string {
  const prefix =
    ENV_PREFIX_OVERRIDE[businessId] ??
    businessId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return `${prefix}_${suffix}`;
}

function getLineSecret(businessId: string): string {
  const key = envKey(businessId, "LINE_CHANNEL_SECRET");
  const val = (process.env as Record<string, string | undefined>)[key];
  if (!val) console.error(`[LINE webhook] Missing env var: ${key}`);
  return val || "";
}

function getLineAccessToken(businessId: string): string {
  const key = envKey(businessId, "LINE_CHANNEL_ACCESS_TOKEN");
  const val = (process.env as Record<string, string | undefined>)[key];
  if (!val) console.error(`[LINE webhook] Missing env var: ${key}`);
  return val || "";
}

// ── HMAC-SHA256 signature verification (Web Crypto for Edge) ──

async function verifySignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  // Constant-time comparison to prevent timing attacks
  const expected = Buffer.from(sig);
  let decoded: Buffer;
  try {
    decoded = Buffer.from(signature, "base64");
  } catch {
    return false;
  }
  if (expected.length !== decoded.length) return false;
  const { timingSafeEqual } = await import("crypto");
  return timingSafeEqual(expected, decoded);
}

// ── Reply to LINE via Reply API ──

async function replyToLine(
  replyToken: string,
  text: string,
  accessToken: string
): Promise<void> {
  // LINE text message max is 5000 chars
  const trimmed = text.length > 5000 ? text.slice(0, 4997) + "..." : text;

  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: trimmed }],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error(`[LINE webhook] Reply API failed: ${res.status} ${res.statusText} — ${errorBody}`);
  }
}

// ── Push message to LINE user (used for welcome/offline messages) ──

async function pushToLine(
  userId: string,
  text: string,
  accessToken: string
): Promise<void> {
  const trimmed = text.length > 5000 ? text.slice(0, 4997) + "..." : text;
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text: trimmed }],
    }),
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error(`[LINE webhook] Push API failed: ${res.status} — ${errorBody}`);
  }
}

// ── Check if current time is within business hours ──

function isWithinBusinessHours(bh: LineChannelSettings["businessHours"]): boolean {
  if (!bh.enabled) return true; // hours check disabled → always online

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: bh.timezone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  const hourPart = parts.find((p) => p.type === "hour")?.value || "0";
  const minPart = parts.find((p) => p.type === "minute")?.value || "0";
  const currentMinutes = parseInt(hourPart) * 60 + parseInt(minPart);

  const day = bh.schedule.find((s) => s.day === weekday);
  if (!day || !day.active) return false;

  const [oh, om] = day.open.split(":").map(Number);
  const [ch, cm] = day.close.split(":").map(Number);
  const openMinutes = oh * 60 + om;
  const closeMinutes = ch * 60 + cm;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

// ── Strip markdown for LINE plain-text ──

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold -> plain
    .replace(/__(.+?)__/g, "$1") // bold alt
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/_(.+?)_/g, "$1") // italic alt
    .replace(/~~(.+?)~~/g, "$1") // strikethrough
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links -> text only
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/^[-*]\s+/gm, "• ") // list items -> bullet
    .replace(/^\d+\.\s+/gm, "") // numbered list (keep number via text)
    .trim();
}

// ── GPT fallback for LINE (non-streaming) ──

async function callGptFallback(
  userMessage: string,
  systemPrompt: string,
  businessId: string,
  history: { role: string; content: string }[] = []
): Promise<string | null> {
  const messages: { role: string; content: string }[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  // Priority 1: Anthropic Claude (non-streaming for LINE)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages,
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json() as { content?: { text: string }[]; usage?: { input_tokens: number; output_tokens: number } };
        const text = data.content?.[0]?.text;
        if (text) {
          logTokenUsage({ businessId, model: "claude-sonnet-4-20250514", callSite: "line_claude", promptTokens: data.usage?.input_tokens ?? 0, completionTokens: data.usage?.output_tokens ?? 0 }).catch(() => {});
          return text;
        }
      }
    } catch (err) {
      console.error("[LINE webhook] Claude API error:", err);
    }
  }

  // Priority 2: OpenAI (non-streaming for LINE)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages,
            ],
            temperature: 0.7,
            max_tokens: 1000,
            stream: false,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json() as { choices?: { message: { content: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          logTokenUsage({ businessId, model: "gpt-4o-mini", callSite: "line_openai", promptTokens: data.usage?.prompt_tokens ?? 0, completionTokens: data.usage?.completion_tokens ?? 0 }).catch(() => {});
          return text;
        }
      }
    } catch (err) {
      console.error("[LINE webhook] OpenAI API error:", err);
    }
  }

  return null;
}

// ── Fetch LINE user profile ──

async function fetchLineProfile(
  userId: string,
  accessToken: string
): Promise<{ displayName: string; pictureUrl?: string; statusMessage?: string } | null> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        displayName: data.displayName || userId.slice(0, 12),
        pictureUrl: data.pictureUrl,
        statusMessage: data.statusMessage,
      };
    }
  } catch {
    // Ignore profile fetch errors
  }
  return null;
}

// ── LINE event types ──

interface LineEvent {
  type: string;
  replyToken?: string;
  message?: {
    type: string;         // "text" | "image" | "video" | "audio" | "file" | "sticker" | "location"
    id?: string;          // message ID (for content fetch)
    text?: string;
    fileName?: string;    // for file messages
    fileSize?: number;    // for file messages (bytes)
    duration?: number;    // for video/audio (ms)
  };
  source?: {
    type: string;
    userId?: string;
  };
}

// ── Fetch LINE message content as base64 ──

async function fetchLineContent(
  messageId: string,
  accessToken: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    // Strip parameters like "; boundary=..."
    const mimeType = contentType.split(";")[0].trim();

    const arrayBuf = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString("base64");
    return { base64, mimeType };
  } catch (err) {
    console.error("[LINE webhook] fetchLineContent error:", err);
    return null;
  }
}

// ── Analyze image/file via Vision API (internal call) ──

async function analyzeViaVision(
  base64: string,
  mimeType: string,
  fileName: string,
  businessId: string,
  userPrompt?: string
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!openaiKey && !anthropicKey) {
    return "ขออภัยครับ ระบบยังไม่ได้ตั้งค่า AI Key สำหรับวิเคราะห์รูปภาพ";
  }

  const biz = getBusinessConfig(businessId);
  const systemPrompt = buildVisionSystemPrompt(biz);

  const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const isImage = SUPPORTED_IMAGE_TYPES.includes(mimeType);
  const isPDF = mimeType === "application/pdf";

  if (isImage) {
    const userMsg = buildVisionUserPrompt(userPrompt);

    if (openaiKey) {
      try {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o",
            max_tokens: 700,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" } },
                  { type: "text", text: userMsg },
                ],
              },
            ],
          }),
        });
        if (resp.ok) {
          const data = await resp.json() as { choices: { message: { content: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
          logTokenUsage({ businessId, model: "gpt-4o", callSite: "line_vision_image", promptTokens: data.usage?.prompt_tokens ?? 0, completionTokens: data.usage?.completion_tokens ?? 0 }).catch(() => {});
          return data.choices?.[0]?.message?.content || "ไม่สามารถวิเคราะห์รูปได้";
        }
      } catch { /* fallthrough */ }
    }

    if (anthropicKey) {
      try {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-opus-4-5",
            max_tokens: 700,
            system: systemPrompt,
            messages: [{
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
                { type: "text", text: userMsg },
              ],
            }],
          }),
        });
        if (resp.ok) {
          const data = await resp.json() as { content: { type: string; text: string }[]; usage?: { input_tokens: number; output_tokens: number } };
          logTokenUsage({ businessId, model: "claude-opus-4-5", callSite: "line_vision_image", promptTokens: data.usage?.input_tokens ?? 0, completionTokens: data.usage?.output_tokens ?? 0 }).catch(() => {});
          return data.content?.find((c) => c.type === "text")?.text || "ไม่สามารถวิเคราะห์รูปได้";
        }
      } catch { /* fallthrough */ }
    }

    return "ขออภัยครับ ไม่สามารถวิเคราะห์รูปภาพได้ในขณะนี้";
  }

  if (isPDF) {
    try {
      const pdfParseModule = await import("pdf-parse");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParse: (buf: Buffer) => Promise<{ text: string }> =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (pdfParseModule as any).default ?? (pdfParseModule as any);
      const buffer = Buffer.from(base64, "base64");
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text?.trim() || "";

      if (!text) return `ไฟล์ PDF "${fileName}" ไม่มีข้อความที่อ่านได้ครับ (อาจเป็น PDF รูปภาพ) กรุณาส่งเป็นรูปภาพแทนครับ`;

      const prompt = buildPdfUserPrompt(fileName, text, userPrompt);

      if (openaiKey) {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 700,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
          }),
        });
        if (resp.ok) {
          const data = await resp.json() as { choices: { message: { content: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
          logTokenUsage({ businessId, model: "gpt-4o-mini", callSite: "line_vision_pdf", promptTokens: data.usage?.prompt_tokens ?? 0, completionTokens: data.usage?.completion_tokens ?? 0 }).catch(() => {});
          return data.choices?.[0]?.message?.content || "ไม่สามารถสรุป PDF ได้";
        }
      }

      if (anthropicKey) {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            max_tokens: 700,
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (resp.ok) {
          const data = await resp.json() as { content: { type: string; text: string }[]; usage?: { input_tokens: number; output_tokens: number } };
          logTokenUsage({ businessId, model: "claude-haiku-4-5", callSite: "line_vision_pdf", promptTokens: data.usage?.input_tokens ?? 0, completionTokens: data.usage?.output_tokens ?? 0 }).catch(() => {});
          return data.content?.find((c) => c.type === "text")?.text || "ไม่สามารถสรุป PDF ได้";
        }
      }
    } catch (err) {
      console.error("[LINE webhook] PDF parse error:", err);
      return "ขออภัยครับ ไม่สามารถอ่าน PDF ได้ในขณะนี้";
    }
  }

  return `ขออภัยครับ ประเภทไฟล์ "${mimeType}" ยังไม่รองรับการวิเคราะห์อัตโนมัติ`;
}

// ── Main handler ──

export async function POST(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId") || "";
  if (!businessId) {
    return NextResponse.json(
      { error: "Missing businessId query parameter" },
      { status: 400 }
    );
  }
  if (!isValidBusinessId(businessId)) {
    console.error(`[LINE webhook] Rejected unknown businessId: "${businessId}"`);
    return NextResponse.json(
      { error: `Unknown businessId: ${businessId}` },
      { status: 400 }
    );
  }

  const secret = getLineSecret(businessId);
  const accessToken = getLineAccessToken(businessId);

  if (!secret || !accessToken) {
    console.error(
      `[LINE webhook] Missing credentials for business: ${businessId}. ` +
        `Expected env: ${envKey(businessId, "LINE_CHANNEL_SECRET")} and ${envKey(businessId, "LINE_CHANNEL_ACCESS_TOKEN")}`
    );
    return NextResponse.json(
      { error: "LINE credentials not configured for this business" },
      { status: 500 }
    );
  }

  // Read raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") || "";

  // Verify signature
  const valid = await verifySignature(rawBody, signature, secret);
  if (!valid) {
    console.warn(`[LINE webhook] Invalid signature for business: ${businessId}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // Parse events
  let events: LineEvent[] = [];
  try {
    const body = JSON.parse(rawBody);
    events = body.events || [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Webhook verification request (empty events)
  if (events.length === 0) {
    console.log(JSON.stringify({ step: "verify", businessId, events: 0 }));
    return NextResponse.json({ status: "ok" });
  }

  // Get business config for pipeline
  const biz = getBusinessConfig(businessId);

  // Load LINE settings from Redis (welcome message, delay, offline message, etc.)
  const lineSettings = await chatStore.getLineSettings(businessId);

  // Process each event — collect all diagnostics into one log
  const results: Record<string, unknown>[] = [];

  for (const event of events) {
    const diag: Record<string, unknown> = {
      eventType: event.type,
      msgType: event.message?.type,
      hasReplyToken: !!event.replyToken,
    };

    // ── Handle LINE "follow" event (user adds the OA as a friend) ──
    if (event.type === "follow") {
      const followUserId = event.source?.userId || "";
      diag.userId = followUserId;
      if (followUserId && lineSettings?.welcomeMessage) {
        try {
          // Only send welcome if global bot is on
          const globalBotOnFollow = await chatStore.isGlobalBotEnabled(businessId);
          if (globalBotOnFollow) {
            const profile = await fetchLineProfile(followUserId, accessToken);
            await chatStore.getOrCreateConversation(businessId, followUserId, {
              displayName: profile?.displayName,
              pictureUrl: profile?.pictureUrl,
              statusMessage: profile?.statusMessage,
              source: "line",
            });
            const welcomeText = stripMarkdown(lineSettings.welcomeMessage);
            await pushToLine(followUserId, welcomeText, accessToken);
            await chatStore.addMessage(businessId, followUserId, {
              role: "bot",
              content: welcomeText,
              timestamp: Date.now(),
              pipelineLayer: 0,
              pipelineLayerName: "Welcome Message",
            });
            diag.sentWelcome = true;
          } else {
            diag.skipped = "follow_global_bot_disabled";
          }
        } catch (err) {
          diag.welcomeError = String(err);
        }
      } else {
        diag.skipped = "follow_no_welcome_msg";
      }
      results.push(diag);
      continue;
    }

    // Only handle message events
    if (event.type !== "message") {
      diag.skipped = "non-message event";
      results.push(diag);
      continue;
    }

    const msgType = event.message?.type || "";
    const replyToken = event.replyToken;

    // ── Idempotency: skip if this replyToken was already processed ──
    // LINE may retry webhook delivery — guard against duplicate bot replies
    if (replyToken) {
      const alreadyDone = await isReplyTokenProcessed(businessId, replyToken);
      if (alreadyDone) {
        diag.skipped = "duplicate_reply_token";
        results.push(diag);
        continue;
      }
    }

    // ── Handle sticker / audio / location — polite acknowledgement ──
    if (["sticker", "audio", "location"].includes(msgType)) {
      // Respect bot toggles before replying
      const globalBotEnabledForSticker = await chatStore.isGlobalBotEnabled(businessId);
      if (globalBotEnabledForSticker) {
        const lineUserIdForSticker = event.source?.userId || "";
        const convForSticker = lineUserIdForSticker
          ? await chatStore.getOrCreateConversation(businessId, lineUserIdForSticker, { source: "line" })
          : null;
        if (convForSticker?.botEnabled && replyToken) {
          const stickerReplies: Record<string, string> = {
            sticker: "ขอบคุณสติ๊กเกอร์น่ารักๆ ครับ! มีอะไรให้ผมช่วยไหมครับ?",
            audio: "ขอบคุณครับ! ขณะนี้ผมยังไม่รองรับข้อความเสียง กรุณาพิมพ์ข้อความครับ",
            location: "ขอบคุณที่แชร์ตำแหน่งครับ! มีอะไรให้ผมช่วยเรื่องพื้นที่ใกล้เคียงไหมครับ?",
          };
          await replyToLine(replyToken, stickerReplies[msgType] || "ขอบคุณครับ!", accessToken);
        }
      }
      diag.skipped = `handled_${msgType}`;
      results.push(diag);
      continue;
    }

    // ── Handle video messages ──
    if (msgType === "video") {
      if (replyToken && biz.features.videoReplyEnabled) {
        // Check bot toggles before replying
        const globalBotForVideo = await chatStore.isGlobalBotEnabled(businessId);
        if (globalBotForVideo) {
          const videoUserId = event.source?.userId || "";
          const videoConv = videoUserId
            ? await chatStore.getOrCreateConversation(businessId, videoUserId, { source: "line" })
            : null;
          if (videoConv?.botEnabled) {
            const visionOn = await chatStore.isVisionEnabled(businessId, biz.features.visionEnabled);
            if (visionOn) {
              await replyToLine(
                replyToken,
                "ขอบคุณที่ส่งวิดีโอมาครับ!\n\nขออภัยครับ ระบบยังไม่รองรับการวิเคราะห์วิดีโออัตโนมัติ\n\nกรุณาส่งเป็น รูปภาพ (screenshot จากวิดีโอ) แทนได้เลยครับ แล้ว AI จะวิเคราะห์ให้ทันที!",
                accessToken
              );
            }
          }
        }
      }
      diag.skipped = "video_not_analyzed";
      results.push(diag);
      continue;
    }

    // ── Handle image / file messages via Vision AI ──
    if (msgType === "image" || msgType === "file") {
      const messageId = event.message?.id;
      const lineUserId = event.source?.userId || "";
      diag.userId = lineUserId;
      diag.messageId = messageId;

      if (!messageId || !replyToken) {
        diag.skipped = "no_message_id_or_token";
        results.push(diag);
        continue;
      }

      // If BU has vision disabled at config level → silently accept (no reply)
      if (!biz.features.visionEnabled) {
        diag.skipped = "vision_disabled_by_config";
        results.push(diag);
        continue;
      }

      // Check global bot + per-conversation bot enabled
      const globalBotEnabled = await chatStore.isGlobalBotEnabled(businessId);
      if (!globalBotEnabled) {
        diag.skipped = "global_bot_disabled";
        results.push(diag);
        continue;
      }

      const conv = await chatStore.getOrCreateConversation(businessId, lineUserId, { source: "line" });
      if (!conv.botEnabled) {
        diag.skipped = "bot_disabled";
        results.push(diag);
        continue;
      }

      // Check vision toggle (Redis overrides config default) — after bot checks
      const visionOn = await chatStore.isVisionEnabled(businessId, biz.features.visionEnabled);
      diag.visionEnabled = visionOn;

      if (!visionOn) {
        await replyToLine(
          replyToken,
          "ขอบคุณที่ส่งไฟล์มาครับ! ขณะนี้ระบบวิเคราะห์รูปภาพปิดอยู่ชั่วคราว กรุณาพิมพ์คำถามเป็นข้อความครับ",
          accessToken
        );
        diag.skipped = "vision_disabled";
        results.push(diag);
        continue;
      }

      // Check business hours
      const withinHours = lineSettings?.businessHours
        ? isWithinBusinessHours(lineSettings.businessHours)
        : true;
      if (!withinHours) {
        diag.skipped = "outside_business_hours";
        results.push(diag);
        continue;
      }

      // Fetch content from LINE
      const content = await fetchLineContent(messageId, accessToken);
      if (!content) {
        await replyToLine(replyToken, "ขออภัยครับ ไม่สามารถดาวน์โหลดไฟล์ได้ กรุณาลองส่งใหม่ครับ", accessToken);
        diag.error = "content_fetch_failed";
        results.push(diag);
        continue;
      }

      const approxMB = Math.ceil(content.base64.length * 0.75 / (1024 * 1024));
      const maxMB = biz.features.visionMaxMB;
      if (approxMB > maxMB) {
        await replyToLine(replyToken, `ขออภัยครับ ไฟล์ใหญ่เกิน ${maxMB}MB กรุณาลดขนาดไฟล์ก่อนส่งครับ`, accessToken);
        diag.skipped = `file_too_large_${approxMB}MB`;
        results.push(diag);
        continue;
      }

      const fileName = event.message?.fileName || (msgType === "image" ? "image.jpg" : "file");
      diag.mimeType = content.mimeType;
      diag.fileName = fileName;

      // Store customer message — include imageUrl so admin panel can render it
      const isImageMsg = content.mimeType.startsWith("image/");
      await chatStore.addMessage(businessId, lineUserId, {
        role: "customer",
        content: isImageMsg ? "" : `[ส่งไฟล์: ${fileName}]`,
        timestamp: Date.now(),
        fileName,
        fileMimeType: content.mimeType,
        // Store as data URL for persistent rendering (LINE CDN URLs expire in 24h)
        imageUrl: isImageMsg
          ? `data:${content.mimeType};base64,${content.base64}`
          : undefined,
      });

      // Call vision analysis
      let analysisResult: string;
      try {
        analysisResult = await analyzeViaVision(content.base64, content.mimeType, fileName, businessId);
      } catch (err) {
        analysisResult = "ขออภัยครับ เกิดข้อผิดพลาดในการวิเคราะห์ไฟล์ กรุณาลองใหม่ครับ";
        diag.visionError = String(err);
      }

      const replyText = stripMarkdown(analysisResult);
      await replyToLine(replyToken, replyText, accessToken);
      await chatStore.addMessage(businessId, lineUserId, {
        role: "bot",
        content: replyText,
        timestamp: Date.now(),
        pipelineLayer: 0,
        pipelineLayerName: "Vision AI",
      });

      diag.visionAnalyzed = true;
      diag.replyPreview = replyText.slice(0, 80);
      results.push(diag);
      continue;
    }

    // ── Text messages only beyond this point ──
    if (msgType !== "text") {
      diag.skipped = `unhandled_type_${msgType}`;
      results.push(diag);
      continue;
    }

    const userText = event.message?.text || "";
    if (!userText || !replyToken) {
      diag.skipped = "no text or token";
      results.push(diag);
      continue;
    }

    const lineUserId = event.source?.userId || "";
    diag.userText = userText;
    diag.userId = lineUserId;

    // Guard: skip anonymous events (group/room without userId)
    if (!lineUserId) {
      diag.skipped = "no_user_id";
      results.push(diag);
      continue;
    }

    // ── A2: Per-userId rate limiting (20 msgs/min) ──
    const limited = await isUserRateLimited(businessId, lineUserId, 20, 60);
    if (limited) {
      diag.skipped = "rate_limited";
      // Don't reply — silently drop to avoid giving bots a signal
      results.push(diag);
      continue;
    }

    try {
      // ── Fetch user profile & ensure conversation exists ──
      const profile = await fetchLineProfile(lineUserId, accessToken);
      const conv = await chatStore.getOrCreateConversation(businessId, lineUserId, {
        displayName: profile?.displayName,
        pictureUrl: profile?.pictureUrl,
        statusMessage: profile?.statusMessage,
        source: "line",
      });

      // ── Detect returning user (2hr+ gap) for auto-pin ──
      const isReturningUser =
        conv.lastMessage !== "" &&
        Date.now() - conv.lastMessageAt > 2 * 60 * 60 * 1000;
      const previousLastMessageAt = conv.lastMessageAt;
      diag.isReturningUser = isReturningUser;

      // ── Store customer message ──
      await chatStore.addMessage(businessId, lineUserId, {
        role: "customer",
        content: userText,
        timestamp: Date.now(),
      });

      // ── Cancel Escalation: re-enable bot if customer wants bot back ──
      // Must run BEFORE the bot-enabled check so the subsequent reply goes through.
      const CANCEL_ESCALATION_TRIGGERS = [
        "ไม่ต้องแล้ว", "คุยกับบอทก่อน", "คุยกับบอท", "ไม่ต้องการแอดมิน",
        "บอทก็ได้", "ยกเลิก", "nevermind", "never mind",
        "bot ก็ได้", "ai ก็ได้", "ถามบอทก่อน", "ถามบอท",
      ];
      const isCancelMsg = CANCEL_ESCALATION_TRIGGERS.some((t) =>
        userText.toLowerCase().includes(t.toLowerCase())
      );
      if (isCancelMsg && !conv.botEnabled) {
        await chatStore.toggleBot(businessId, lineUserId, true);
        await chatStore.unpinConversation(businessId, lineUserId);
        diag.cancelledEscalation = true;
      }

      // ── Check business hours (if configured) ──
      const withinHours = lineSettings?.businessHours
        ? isWithinBusinessHours(lineSettings.businessHours)
        : true;
      diag.withinBusinessHours = withinHours;

      if (!withinHours) {
        // Send offline message if configured, then stop
        if (replyToken && lineSettings?.offlineMessage) {
          try {
            await replyToLine(replyToken, stripMarkdown(lineSettings.offlineMessage), accessToken);
          } catch { /* non-fatal */ }
        }
        diag.skippedReason = "outside_business_hours";
        results.push(diag);
        continue;
      }

      // ── Check global bot toggle (entire business) ──
      const globalBotEnabled = await chatStore.isGlobalBotEnabled(businessId);
      diag.globalBotEnabled = globalBotEnabled;

      if (!globalBotEnabled) {
        diag.skippedReason = "global_bot_disabled";
        results.push(diag);
        continue;
      }

      // ── Check if bot is enabled for this conversation ──
      const botEnabled = await chatStore.isBotEnabled(businessId, lineUserId);
      diag.botEnabled = botEnabled;

      if (!botEnabled) {
        // Bot disabled per conversation — admin will reply manually
        diag.skippedReason = "bot_disabled";
        results.push(diag);
        continue;
      }

      // ── Run pipeline — load history for context ──
      const recentMsgs = await chatStore.getMessages(businessId, lineUserId);
      // Map stored messages → ChatMessage format (last 20 turns, skip system/admin msgs)
      // Exclude the just-stored customer message (last item) to avoid double-counting
      const historyMessages: ChatMessage[] = recentMsgs
        .filter((m) => m.role === "customer" || m.role === "bot")
        .slice(-21, -1) // take up to 20 prior messages, excluding the just-stored one
        .map((m) => ({
          role: m.role === "customer" ? "user" : "assistant",
          content: m.content,
        }));
      // Append current user message once
      const chatMessages: ChatMessage[] = [
        ...historyMessages,
        { role: "user", content: userText },
      ];

      // Load pending form state (for multi-turn quotation collection)
      const convForForm = await chatStore.getConversation(businessId, lineUserId);
      const pendingForm = convForForm?.pendingForm ?? null;

      // Load auto-learned data (fire-and-forget safe: empty on Redis failure)
      let learnedData: LearnedData | null = null;
      try { learnedData = await learnedStore.getAllLearnedData(businessId); } catch { /* non-fatal */ }

      const { content: pipelineContent, trace: pipelineTrace, isAdminEscalation, isCancelEscalation, carouselProducts, pendingFormUpdate } =
        generatePipelineResponseWithTrace(userText, chatMessages, biz, pendingForm, learnedData);

      diag.pipelineLayer = pipelineTrace.finalLayer;
      diag.pipelineLayerName = pipelineTrace.finalLayerName;

      // ── Pending Form Update (multi-turn quotation) ──
      if (pendingFormUpdate !== undefined) {
        await chatStore.setPendingForm(businessId, lineUserId, pendingFormUpdate);
      }

      // ── Funnel tracking (fire-and-forget) ──
      // Track conversion stage based on matched intent (layer 6 = Intent Engine)
      if (pipelineTrace.finalLayer === 6 && pipelineTrace.finalLayerName) {
        const intentIdMatch = pipelineTrace.steps.find((s) => s.layer === 6)?.details?.intentId;
        if (intentIdMatch) {
          try {
            const Redis = (await import("ioredis")).default;
            const g = globalThis as unknown as { __redis?: InstanceType<typeof Redis> };
            if (g.__redis) {
              trackFunnelEvent(businessId, lineUserId, intentIdMatch as string, g.__redis).catch(() => {});
            }
          } catch {
            // Non-fatal: funnel tracking should never crash the webhook
          }
        }
      }

      // ── Cancel Escalation confirmed by pipeline — log system message ──
      if (isCancelEscalation) {
        await chatStore.addMessage(businessId, lineUserId, {
          role: "admin",
          content: "[ระบบ] ลูกค้าขอคุยกับบอทต่อ — ปลดหมุดและเปิดบอทอัตโนมัติแล้ว",
          timestamp: Date.now(),
        });
        diag.cancelEscalationConfirmed = true;
      }

      // ── Admin Escalation (Layer 1): pin + disable bot + notify admin ──
      if (isAdminEscalation) {
        const isQuotationComplete = pendingFormUpdate === null && pipelineTrace.finalLayerName?.includes("quotation");
        await chatStore.pinConversation(
          businessId,
          lineUserId,
          isQuotationComplete
            ? "ลูกค้าขอใบเสนอราคา — ข้อมูลครบแล้ว รอเจ้าหน้าที่จัดทำ"
            : "ลูกค้าขอคุยกับเจ้าหน้าที่ (L1 escalation)"
        );

        // Notify admin via LINE Push (send to admin LINE userId if configured)
        const adminNotifyUserId = (process.env as Record<string, string | undefined>)[
          envKey(businessId, "ADMIN_LINE_USER_ID")
        ] || process.env.ADMIN_LINE_USER_ID;

        if (adminNotifyUserId && accessToken) {
          const adminNotifyText = isQuotationComplete
            ? `[ใบเสนอราคา] ลูกค้าส่งข้อมูลครบแล้ว\nBusiness: ${biz.name}\nUser: ${lineUserId}\n\n${pipelineContent}`
            : `[แจ้งเตือน] ลูกค้าขอคุยกับเจ้าหน้าที่\nBusiness: ${biz.name}\nUser: ${lineUserId}\nข้อความ: "${userText}"`;
          try {
            await fetch("https://api.line.me/v2/bot/message/push", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                to: adminNotifyUserId,
                messages: [{ type: "text", text: adminNotifyText }],
              }),
            });
          } catch {
            // Non-critical: notification failure should not block reply
          }
        }

        // Send escalation reply to customer, then stop bot
        const escalationReply = stripMarkdown(pipelineContent);
        await replyToLine(replyToken, escalationReply, accessToken);

        await chatStore.addMessage(businessId, lineUserId, {
          role: "bot",
          content: escalationReply,
          timestamp: Date.now(),
          pipelineLayer: pipelineTrace.finalLayer,
          pipelineLayerName: "Safety: Admin Escalation",
        });
        await chatStore.addMessage(businessId, lineUserId, {
          role: "admin",
          content: `[ระบบ] ปักหมุดอัตโนมัติ — ลูกค้าขอคุยกับเจ้าหน้าที่ บอทหยุดตอบแล้ว`,
          timestamp: Date.now(),
        });

        diag.escalated = true;
        diag.autoPinned = true;
        diag.skippedReason = "admin_escalation_bot_disabled";
        results.push(diag);
        continue;
      }

      // ── Auto-pin: returning user (2hr+ gap) + deep fallback (L12+) ──
      if (isReturningUser && pipelineTrace.finalLayer >= 12) {
        const gapHours = Math.round(
          (Date.now() - previousLastMessageAt) / (1000 * 60 * 60)
        );
        await chatStore.pinConversation(
          businessId,
          lineUserId,
          `ข้อความไม่ต่อเนื่อง (L${pipelineTrace.finalLayer}, gap: ${gapHours}h)`
        );
        await chatStore.addMessage(businessId, lineUserId, {
          role: "admin",
          content: `[ระบบ] ปักหมุดอัตโนมัติ — ข้อความไม่ต่อเนื่อง (gap: ${gapHours}h, L${pipelineTrace.finalLayer}) รอแอดมินตอบ`,
          timestamp: Date.now(),
        });
        // Send brief acknowledgment to customer
        try {
          await replyToLine(
            replyToken,
            "สวัสดีครับ ข้อความของท่านได้รับแล้ว รอสักครู่ แอดมินจะติดต่อกลับครับ",
            accessToken
          );
        } catch { /* reply token may expire */ }
        diag.autoPinned = true;
        diag.skippedReason = "auto_pinned_discontinuous";
        results.push(diag);
        continue;
      }

      let replyText = "";

      if (pipelineTrace.finalLayer <= 14) {
        replyText = pipelineContent;
      } else {
        // Load prior conversation summary to inject as context into AI system prompt
        const chatSummary = await chatStore.getChatSummary(businessId, lineUserId).catch(() => null);
        const systemPrompt = buildSystemPrompt(biz, undefined, chatSummary);
        const gptResponse = await callGptFallback(userText, systemPrompt, businessId, historyMessages);
        replyText = gptResponse || pipelineContent;
        diag.gptUsed = !!gptResponse;
      }

      if (!replyText) {
        replyText = "ขออภัยครับ ไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้งครับ";
      }

      // Strip markdown for plain-text LINE
      replyText = stripMarkdown(replyText);
      diag.replyLength = replyText.length;
      diag.replyPreview = replyText.slice(0, 80);

      // ── Response Delay (if configured) ──
      const delaySec = lineSettings?.responseDelaySec ?? 0;
      if (delaySec > 0) {
        diag.responseDelaySec = delaySec;
        await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
      }

      // ── Build messages array (text + optional Flex carousel) ──
      // LINE Reply API allows up to 5 messages per reply
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lineMessages: any[] = [
        { type: "text", text: replyText.length > 5000 ? replyText.slice(0, 4997) + "..." : replyText },
      ];
      if (carouselProducts && carouselProducts.length > 0) {
        try {
          const flexMsg = buildLineFlexCarousel(
            carouselProducts,
            `แนะนำสินค้า ${carouselProducts.length} รายการ`
          );
          lineMessages.push(flexMsg);
          diag.sentCarousel = true;
          diag.carouselCount = carouselProducts.length;
        } catch (flexErr) {
          console.error("[LINE webhook] buildLineFlexCarousel error:", flexErr);
        }
      }

      // ── Send reply via LINE ──
      const replyRes = await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: lineMessages,
        }),
      });

      diag.replyApiStatus = replyRes.status;
      if (!replyRes.ok) {
        diag.replyApiError = await replyRes.text().catch(() => "");
      } else {
        diag.replyApiOk = true;
        // ── Store bot reply only after confirmed delivery ──
        await chatStore.addMessage(businessId, lineUserId, {
          role: "bot",
          content: replyText,
          timestamp: Date.now(),
          pipelineLayer: pipelineTrace.finalLayer,
          pipelineLayerName: pipelineTrace.finalLayerName,
        });
        // ── CRM auto-extract (fire-and-forget) — only after successful reply ──
        autoExtractCRM(businessId, lineUserId).catch(() => {});
      }
    } catch (err) {
      diag.error = String(err);
      console.error(`[LINE webhook] Error processing event for ${businessId}:`, err);
      // Do NOT send error reply — avoids replying when bot toggles may be off
    }

    results.push(diag);
  }

  // Single consolidated log with all diagnostics
  console.log(JSON.stringify({ webhook: businessId, events: events.length, results }));

  return NextResponse.json({ status: "ok" });
}

// ── GET handler for health check + debug ──

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId") || "none";
  const debug = req.nextUrl.searchParams.get("debug") === "1";

  if (!debug) {
    return NextResponse.json({
      status: "ok",
      endpoint: "LINE Webhook",
      businessId,
      usage: "POST /api/line/webhook?businessId=evlifethailand",
    });
  }

  // Debug mode requires admin session
  const { requireAdminSession, unauthorizedResponse } = await import("@/lib/auth");
  const session = await requireAdminSession(req, businessId === "none" ? undefined : businessId);
  if (!session) return unauthorizedResponse();

  // Debug mode: test pipeline + LINE API token
  const diagnostics: Record<string, unknown> = {
    businessId,
    timestamp: new Date().toISOString(),
  };

  // 1. Check env vars
  const secret = getLineSecret(businessId);
  const accessToken = getLineAccessToken(businessId);
  diagnostics.hasSecret = !!secret;
  diagnostics.hasAccessToken = !!accessToken;
  diagnostics.secretLength = secret.length;
  diagnostics.tokenLength = accessToken.length;

  // 2. Test pipeline
  try {
    const biz = getBusinessConfig(businessId);
    diagnostics.businessName = biz.name;
    diagnostics.productsCount = biz.products.length;

    const testMessages: ChatMessage[] = [{ role: "user", content: "สวัสดี" }];
    const { content, trace } = generatePipelineResponseWithTrace("สวัสดี", testMessages, biz);
    diagnostics.pipelineResult = {
      layer: trace.finalLayer,
      layerName: trace.finalLayerName,
      contentLength: content.length,
      contentPreview: content.slice(0, 200),
    };
  } catch (err) {
    diagnostics.pipelineError = String(err);
  }

  // 3. Test LINE API token validity (with 8s timeout)
  if (accessToken) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("https://api.line.me/v2/bot/info", {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const body = await res.text();
      diagnostics.lineApiTest = {
        status: res.status,
        ok: res.ok,
        body: body.slice(0, 500),
      };
    } catch (err) {
      diagnostics.lineApiError = String(err);
    }
  }

  // 4. Check message quota
  if (accessToken) {
    try {
      const [quotaRes, usageRes] = await Promise.all([
        fetch("https://api.line.me/v2/bot/message/quota", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch("https://api.line.me/v2/bot/message/quota/consumption", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);
      diagnostics.quota = {
        status: quotaRes.status,
        data: await quotaRes.json().catch(() => null),
      };
      diagnostics.usage = {
        status: usageRes.status,
        data: await usageRes.json().catch(() => null),
      };
    } catch (err) {
      diagnostics.quotaError = String(err);
    }
  }

  // 5. Test Push API — send a message to a specific user
  const pushTo = req.nextUrl.searchParams.get("push");
  if (pushTo && accessToken) {
    try {
      const pushRes = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to: pushTo,
          messages: [{ type: "text", text: `ทดสอบจาก ${getBusinessConfig(businessId).name} Bot - ระบบทำงานปกติครับ!` }],
        }),
      });
      const pushBody = await pushRes.text().catch(() => "");
      diagnostics.pushTest = {
        status: pushRes.status,
        ok: pushRes.ok,
        body: pushBody.slice(0, 500),
      };
    } catch (err) {
      diagnostics.pushError = String(err);
    }
  }

  return NextResponse.json(diagnostics);
}
