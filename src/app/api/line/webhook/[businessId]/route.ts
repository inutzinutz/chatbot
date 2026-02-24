import { NextRequest, NextResponse } from "next/server";
import { getBusinessConfig, isValidBusinessId } from "@/lib/businessUnits";
import {
  generatePipelineResponseWithTrace,
  buildSystemPrompt,
  type ChatMessage,
} from "@/lib/pipeline";
import { chatStore, type LineChannelSettings } from "@/lib/chatStore";
import { isUserRateLimited, isReplyTokenProcessed } from "@/lib/rateLimit";
import { buildLineFlexCarousel } from "@/lib/carouselBuilder";
import { logTokenUsage } from "@/lib/tokenTracker";
import { autoExtractCRM } from "@/lib/crmExtract";
import { trackFunnelEvent } from "@/lib/funnelTracker";

export const runtime = "nodejs";
export const maxDuration = 25; // seconds (Vercel Hobby limit)

/* ------------------------------------------------------------------ */
/*  LINE Webhook — path-based routing (no query params)                */
/*  Usage: POST /api/line/webhook/evlifethailand                       */
/*                                                                     */
/*  This eliminates query-param issues that some LINE OA configs may   */
/*  have.  The businessId is embedded directly in the URL path.        */
/* ------------------------------------------------------------------ */

// ── Env helpers ──

// Override map: businessId → env var prefix
// Must stay in sync with the query-param webhook route.ts
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
  return (
    (process.env as Record<string, string | undefined>)[
      envKey(businessId, "LINE_CHANNEL_SECRET")
    ] ||
    process.env.LINE_CHANNEL_SECRET ||
    ""
  );
}

function getLineAccessToken(businessId: string): string {
  return (
    (process.env as Record<string, string | undefined>)[
      envKey(businessId, "LINE_CHANNEL_ACCESS_TOKEN")
    ] ||
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    ""
  );
}

// ── HMAC-SHA256 signature verification ──

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
  return require("crypto").timingSafeEqual(expected, decoded);
}

// ── Reply to LINE via Reply API ──

async function replyToLine(
  replyToken: string,
  text: string,
  accessToken: string
): Promise<void> {
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
    console.error(`[LINE webhook/path] Reply API failed: ${res.status} — ${errorBody}`);
  }
}

// ── Push message to LINE user ──

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
    console.error(`[LINE webhook/path] Push API failed: ${res.status} — ${errorBody}`);
  }
}

// ── Check if current time is within business hours ──

function isWithinBusinessHours(bh: LineChannelSettings["businessHours"]): boolean {
  if (!bh.enabled) return true;

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
  return currentMinutes >= (oh * 60 + om) && currentMinutes < (ch * 60 + cm);
}

// ── Strip markdown for LINE plain-text ──

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/^\d+\.\s+/gm, "")
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

  // Priority 1: Anthropic Claude
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
      console.error("[LINE webhook/path] Claude API error:", err);
    }
  }

  // Priority 2: OpenAI
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
      console.error("[LINE webhook/path] OpenAI API error:", err);
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
    type: string;
    text?: string;
  };
  source?: {
    type: string;
    userId?: string;
  };
}

// ── Route params type ──

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

// ── POST handler ──

export async function POST(req: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;

  if (!businessId) {
    return NextResponse.json(
      { error: "Missing businessId in path" },
      { status: 400 }
    );
  }
  if (!isValidBusinessId(businessId)) {
    console.error(`[LINE webhook/path] Rejected unknown businessId: "${businessId}"`);
    return NextResponse.json(
      { error: `Unknown businessId: ${businessId}` },
      { status: 400 }
    );
  }

  const secret = getLineSecret(businessId);
  const accessToken = getLineAccessToken(businessId);

  if (!secret || !accessToken) {
    console.error(
      `[LINE webhook/${businessId}] Missing credentials. ` +
        `Expected: ${envKey(businessId, "LINE_CHANNEL_SECRET")} and ${envKey(businessId, "LINE_CHANNEL_ACCESS_TOKEN")}`
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
    console.warn(`[LINE webhook/${businessId}] Invalid signature`);
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
    console.log(JSON.stringify({ step: "verify", businessId, events: 0, route: "path-based" }));
    return NextResponse.json({ status: "ok" });
  }

  // Get business config for pipeline
  const biz = getBusinessConfig(businessId);

  // Load LINE settings from Redis
  const lineSettings = await chatStore.getLineSettings(businessId);

  // Process each event
  const results: Record<string, unknown>[] = [];

  for (const event of events) {
    const diag: Record<string, unknown> = {
      eventType: event.type,
      msgType: event.message?.type,
      hasReplyToken: !!event.replyToken,
    };

    // ── Handle LINE "follow" event ──
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

    // Only handle text messages (path-based route handles text only)
    if (event.type !== "message" || event.message?.type !== "text") {
      diag.skipped = `unhandled_${event.type}_${event.message?.type ?? ""}`;
      results.push(diag);
      continue;
    }

    const userText = event.message.text || "";
    const replyToken = event.replyToken;
    if (!userText || !replyToken) {
      diag.skipped = "no text or token";
      results.push(diag);
      continue;
    }

    // ── Idempotency: skip if this replyToken was already processed ──
    const alreadyDone = await isReplyTokenProcessed(replyToken);
    if (alreadyDone) {
      diag.skipped = "duplicate_reply_token";
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

    // ── Per-userId rate limiting (20 msgs/min) ──
    const limited = await isUserRateLimited(businessId, lineUserId, 20, 60);
    if (limited) {
      diag.skipped = "rate_limited";
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

      // ── Check business hours ──
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
        diag.skippedReason = "bot_disabled";
        results.push(diag);
        continue;
      }

      // ── Run pipeline — load history for context ──
      const recentMsgs = await chatStore.getMessages(businessId, lineUserId);
      // slice(-21, -1): take up to 20 prior messages, excluding the just-stored current message
      const historyMessages: ChatMessage[] = recentMsgs
        .filter((m) => m.role === "customer" || m.role === "bot")
        .slice(-21, -1)
        .map((m) => ({
          role: m.role === "customer" ? "user" : "assistant",
          content: m.content,
        }));
      const chatMessages: ChatMessage[] = [
        ...historyMessages,
        { role: "user", content: userText },
      ];

      const { content: pipelineContent, trace: pipelineTrace, isAdminEscalation, isCancelEscalation, carouselProducts } =
        generatePipelineResponseWithTrace(userText, chatMessages, biz);

      diag.pipelineLayer = pipelineTrace.finalLayer;
      diag.pipelineLayerName = pipelineTrace.finalLayerName;

      // ── Funnel tracking (fire-and-forget) ──
      if (pipelineTrace.finalLayer === 6 && pipelineTrace.finalLayerName) {
        const intentIdMatch = pipelineTrace.steps.find((s) => s.layer === 6)?.details?.intentId;
        if (intentIdMatch) {
          try {
            const Redis = (await import("ioredis")).default;
            const g = globalThis as unknown as { __redis?: InstanceType<typeof Redis> };
            if (g.__redis) {
              trackFunnelEvent(businessId, lineUserId, intentIdMatch as string, g.__redis).catch(() => {});
            }
          } catch { /* Non-fatal */ }
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

      // ── Admin Escalation: pin + disable bot + notify admin ──
      if (isAdminEscalation) {
        await chatStore.pinConversation(
          businessId,
          lineUserId,
          `ลูกค้าขอคุยกับเจ้าหน้าที่ (escalation)`
        );

        const adminNotifyUserId = (process.env as Record<string, string | undefined>)[
          envKey(businessId, "ADMIN_LINE_USER_ID")
        ] || process.env.ADMIN_LINE_USER_ID;

        if (adminNotifyUserId && accessToken) {
          try {
            await fetch("https://api.line.me/v2/bot/message/push", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({
                to: adminNotifyUserId,
                messages: [{ type: "text", text: `[แจ้งเตือน] ลูกค้าขอคุยกับเจ้าหน้าที่\nBusiness: ${biz.name}\nUser: ${lineUserId}\nข้อความ: "${userText}"` }],
              }),
            });
          } catch { /* Non-critical */ }
        }

        const escalationReply = stripMarkdown(pipelineContent);
        let escalSent = false;
        try {
          await replyToLine(replyToken, escalationReply, accessToken);
          escalSent = true;
        } catch { /* non-critical */ }

        if (escalSent) {
          await chatStore.addMessage(businessId, lineUserId, {
            role: "bot", content: escalationReply, timestamp: Date.now(),
            pipelineLayer: pipelineTrace.finalLayer, pipelineLayerName: "Safety: Admin Escalation",
          });
        }
        await chatStore.addMessage(businessId, lineUserId, {
          role: "admin", content: `[ระบบ] ปักหมุดอัตโนมัติ — ลูกค้าขอคุยกับเจ้าหน้าที่ บอทหยุดตอบแล้ว`, timestamp: Date.now(),
        });

        diag.escalated = true;
        diag.autoPinned = true;
        diag.skippedReason = "admin_escalation_bot_disabled";
        results.push(diag);
        continue;
      }

      // ── Auto-pin: returning user (2hr+ gap) + deep fallback (L12+) ──
      if (isReturningUser && pipelineTrace.finalLayer >= 12) {
        const gapHours = Math.round((Date.now() - previousLastMessageAt) / (1000 * 60 * 60));
        await chatStore.pinConversation(businessId, lineUserId, `ข้อความไม่ต่อเนื่อง (L${pipelineTrace.finalLayer}, gap: ${gapHours}h)`);
        await chatStore.addMessage(businessId, lineUserId, {
          role: "admin", content: `[ระบบ] ปักหมุดอัตโนมัติ — ข้อความไม่ต่อเนื่อง (gap: ${gapHours}h, L${pipelineTrace.finalLayer}) รอแอดมินตอบ`, timestamp: Date.now(),
        });
        try {
          await replyToLine(replyToken, "สวัสดีครับ ข้อความของท่านได้รับแล้ว รอสักครู่ แอดมินจะติดต่อกลับครับ", accessToken);
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
        const chatSummary = await chatStore.getChatSummary(businessId, lineUserId).catch(() => null);
        const systemPrompt = buildSystemPrompt(biz, undefined, chatSummary);
        const gptResponse = await callGptFallback(userText, systemPrompt, businessId, historyMessages);
        replyText = gptResponse || pipelineContent;
        diag.gptUsed = !!gptResponse;
      }

      if (!replyText) {
        replyText = "ขออภัยครับ ไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้งครับ";
      }

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lineMessages: any[] = [
        { type: "text", text: replyText.length > 5000 ? replyText.slice(0, 4997) + "..." : replyText },
      ];
      if (carouselProducts && carouselProducts.length > 0) {
        try {
          const flexMsg = buildLineFlexCarousel(carouselProducts, `แนะนำสินค้า ${carouselProducts.length} รายการ`);
          lineMessages.push(flexMsg);
          diag.sentCarousel = true;
          diag.carouselCount = carouselProducts.length;
        } catch (flexErr) {
          console.error("[LINE webhook/path] buildLineFlexCarousel error:", flexErr);
        }
      }

      // ── Send reply via LINE ──
      const replyRes = await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ replyToken, messages: lineMessages }),
      });

      diag.replyApiStatus = replyRes.status;
      if (!replyRes.ok) {
        diag.replyApiError = await replyRes.text().catch(() => "");
      } else {
        // ── Store bot reply only after confirmed sent ──
        await chatStore.addMessage(businessId, lineUserId, {
          role: "bot",
          content: replyText,
          timestamp: Date.now(),
          pipelineLayer: pipelineTrace.finalLayer,
          pipelineLayerName: pipelineTrace.finalLayerName,
        });
        diag.replyApiOk = true;

        // ── CRM auto-extract (fire-and-forget) ──
        autoExtractCRM(businessId, lineUserId).catch(() => {});
      }
    } catch (err) {
      diag.error = String(err);
      console.error(`[LINE webhook/path] Error processing event for ${businessId}:`, err);
      // Do NOT send error reply — avoids replying when bot toggles may be off
    }

    results.push(diag);
  }

  // Single consolidated log
  console.log(
    JSON.stringify({
      webhook: businessId,
      route: "path-based",
      events: events.length,
      results,
    })
  );

  return NextResponse.json({ status: "ok" });
}

// ── GET handler for health check + debug ──

export async function GET(req: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;
  const debug = req.nextUrl.searchParams.get("debug") === "1";

  if (!debug) {
    return NextResponse.json({
      status: "ok",
      endpoint: "LINE Webhook (path-based)",
      businessId,
      usage: `POST /api/line/webhook/${businessId}`,
    });
  }

  // Debug mode requires admin session
  const { requireAdminSession, unauthorizedResponse } = await import("@/lib/auth");
  const session = await requireAdminSession(req, businessId);
  if (!session) return unauthorizedResponse();

  // Debug mode: test pipeline + LINE API token
  const diagnostics: Record<string, unknown> = {
    businessId,
    route: "path-based",
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
    const { content, trace } = generatePipelineResponseWithTrace(
      "สวัสดี",
      testMessages,
      biz
    );
    diagnostics.pipelineResult = {
      layer: trace.finalLayer,
      layerName: trace.finalLayerName,
      contentLength: content.length,
      contentPreview: content.slice(0, 200),
    };
  } catch (err) {
    diagnostics.pipelineError = String(err);
  }

  // 3. Test LINE API token validity
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

  // 5. Test webhook endpoint via LINE API
  if (accessToken) {
    try {
      const testRes = await fetch(
        "https://api.line.me/v2/bot/channel/webhook/endpoint",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      diagnostics.webhookEndpointInfo = {
        status: testRes.status,
        data: await testRes.json().catch(() => null),
      };
    } catch (err) {
      diagnostics.webhookEndpointError = String(err);
    }
  }

  // 6. Test webhook delivery via LINE API
  if (accessToken) {
    try {
      const testRes = await fetch(
        "https://api.line.me/v2/bot/channel/webhook/test",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({}),
        }
      );
      diagnostics.webhookTest = {
        status: testRes.status,
        data: await testRes.json().catch(() => null),
      };
    } catch (err) {
      diagnostics.webhookTestError = String(err);
    }
  }

  // 7. Push test
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
          messages: [
            {
              type: "text",
              text: `[Path-based webhook] ทดสอบจาก EV Life Thailand Bot - ระบบทำงานปกติครับ! Route: /api/line/webhook/${businessId}`,
            },
          ],
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

  // 8. Set webhook URL via API (if requested)
  const setWebhook = req.nextUrl.searchParams.get("setWebhook");
  if (setWebhook && accessToken) {
    try {
      const setRes = await fetch(
        "https://api.line.me/v2/bot/channel/webhook/endpoint",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            endpoint: setWebhook,
          }),
        }
      );
      diagnostics.setWebhook = {
        status: setRes.status,
        ok: setRes.ok,
        data: await setRes.json().catch(() => null),
        newUrl: setWebhook,
      };
    } catch (err) {
      diagnostics.setWebhookError = String(err);
    }
  }

  return NextResponse.json(diagnostics);
}
