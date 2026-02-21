import { NextRequest, NextResponse } from "next/server";
import { getBusinessConfig } from "@/lib/businessUnits";
import {
  generatePipelineResponseWithTrace,
  buildSystemPrompt,
  type ChatMessage,
} from "@/lib/pipeline";
import { chatStore } from "@/lib/chatStore";

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

function envKey(businessId: string, suffix: string): string {
  const prefix = businessId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
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
  const digest = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return digest === signature;
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
  systemPrompt: string
): Promise<string | null> {
  const messages: { role: string; content: string }[] = [
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
        const data = await response.json();
        const text = data.content?.[0]?.text;
        if (text) return text;
      }
    } catch (err) {
      console.error("[LINE webhook] Claude API error:", err);
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
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
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

  // Process each event
  const results: Record<string, unknown>[] = [];

  for (const event of events) {
    const diag: Record<string, unknown> = {
      eventType: event.type,
      msgType: event.message?.type,
      hasReplyToken: !!event.replyToken,
    };

    // Only handle text messages
    if (event.type !== "message" || event.message?.type !== "text") {
      diag.skipped = true;
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

    const lineUserId = event.source?.userId || "";
    diag.userText = userText;
    diag.userId = lineUserId;

    try {
      // ── Fetch user profile (first time) & ensure conversation exists ──
      let profile: { displayName: string; pictureUrl?: string; statusMessage?: string } | null = null;
      if (lineUserId) {
        profile = await fetchLineProfile(lineUserId, accessToken);
      }
      await chatStore.getOrCreateConversation(businessId, lineUserId, {
        displayName: profile?.displayName,
        pictureUrl: profile?.pictureUrl,
        statusMessage: profile?.statusMessage,
        source: "line",
      });

      // ── Store customer message ──
      await chatStore.addMessage(businessId, lineUserId, {
        role: "customer",
        content: userText,
        timestamp: Date.now(),
      });

      // ── Check if bot is enabled for this conversation ──
      const botEnabled = await chatStore.isBotEnabled(businessId, lineUserId);
      diag.botEnabled = botEnabled;

      if (!botEnabled) {
        // Bot disabled — admin will reply manually. Don't auto-reply.
        diag.skippedReason = "bot_disabled";
        results.push(diag);
        continue;
      }

      // ── Run pipeline ──
      const chatMessages: ChatMessage[] = [
        { role: "user", content: userText },
      ];

      const { content: pipelineContent, trace: pipelineTrace } =
        generatePipelineResponseWithTrace(userText, chatMessages, biz);

      diag.pipelineLayer = pipelineTrace.finalLayer;
      diag.pipelineLayerName = pipelineTrace.finalLayerName;

      let replyText = "";

      if (pipelineTrace.finalLayer < 14) {
        replyText = pipelineContent;
      } else {
        const systemPrompt = buildSystemPrompt(biz);
        const gptResponse = await callGptFallback(userText, systemPrompt);
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

      // ── Store bot reply message ──
      await chatStore.addMessage(businessId, lineUserId, {
        role: "bot",
        content: replyText,
        timestamp: Date.now(),
        pipelineLayer: pipelineTrace.finalLayer,
        pipelineLayerName: pipelineTrace.finalLayerName,
      });

      // ── Send reply via LINE ──
      const replyRes = await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: [
            {
              type: "text",
              text:
                replyText.length > 5000
                  ? replyText.slice(0, 4997) + "..."
                  : replyText,
            },
          ],
        }),
      });

      diag.replyApiStatus = replyRes.status;
      if (!replyRes.ok) {
        diag.replyApiError = await replyRes.text().catch(() => "");
      } else {
        diag.replyApiOk = true;
      }
    } catch (err) {
      diag.error = String(err);

      // Best-effort reply on error
      try {
        if (event.replyToken) {
          await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              replyToken: event.replyToken,
              messages: [
                {
                  type: "text",
                  text: "ขออภัยครับ ระบบขัดข้อง กรุณาลองใหม่อีกครั้งครับ",
                },
              ],
            }),
          });
        }
      } catch {
        // Reply token may have expired
      }
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
