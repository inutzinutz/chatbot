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
/*  LINE Webhook — shared endpoint for all businesses                  */
/*  Usage: POST /api/line/webhook?businessId=evlifethailand            */
/*                                                                     */
/*  Env vars (per business):                                           */
/*    EVLIFETHAILAND_LINE_CHANNEL_SECRET                               */
/*    EVLIFETHAILAND_LINE_CHANNEL_ACCESS_TOKEN                         */
/*    DJI13STORE_LINE_CHANNEL_SECRET                                   */
/*    DJI13STORE_LINE_CHANNEL_ACCESS_TOKEN                             */
/*  Or fallback:                                                       */
/*    LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN                  */
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
  const digest = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return digest === signature;
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
  systemPrompt: string
): Promise<string | null> {
  const messages: { role: string; content: string }[] = [
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
        const data = await response.json();
        const text = data.content?.[0]?.text;
        if (text) return text;
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

// ── Main handler ──

export async function POST(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId") || "";
  if (!businessId) {
    return NextResponse.json(
      { error: "Missing businessId query parameter" },
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

  // Process each event — collect all diagnostics into one log
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
      // ── Fetch user profile & ensure conversation exists ──
      let profile: { displayName: string; pictureUrl?: string; statusMessage?: string } | null = null;
      if (lineUserId) {
        profile = await fetchLineProfile(lineUserId, accessToken);
      }
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

      // ── Check global bot toggle (entire business) ──
      const globalBotEnabled = await chatStore.isGlobalBotEnabled(businessId);
      diag.globalBotEnabled = globalBotEnabled;

      if (!globalBotEnabled) {
        diag.skippedReason = "global_bot_disabled";
        results.push(diag);
        continue;
      }

      // ── Check if bot is enabled ──
      const botEnabled = await chatStore.isBotEnabled(businessId, lineUserId);
      diag.botEnabled = botEnabled;

      if (!botEnabled) {
        diag.skippedReason = "bot_disabled";
        results.push(diag);
        continue;
      }

      // ── Run pipeline ──
      const chatMessages: ChatMessage[] = [
        { role: "user", content: userText },
      ];

      const { content: pipelineContent, trace: pipelineTrace, isAdminEscalation } =
        generatePipelineResponseWithTrace(userText, chatMessages, biz);

      diag.pipelineLayer = pipelineTrace.finalLayer;
      diag.pipelineLayerName = pipelineTrace.finalLayerName;

      // ── Admin Escalation (Layer 1): pin + disable bot + notify admin ──
      if (isAdminEscalation) {
        await chatStore.pinConversation(
          businessId,
          lineUserId,
          `ลูกค้าขอคุยกับเจ้าหน้าที่ (L1 escalation)`
        );

        // Notify admin via LINE Push (send to admin LINE userId if configured)
        const adminNotifyUserId = (process.env as Record<string, string | undefined>)[
          envKey(businessId, "ADMIN_LINE_USER_ID")
        ] || process.env.ADMIN_LINE_USER_ID;

        if (adminNotifyUserId && accessToken) {
          try {
            await fetch("https://api.line.me/v2/bot/message/push", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                to: adminNotifyUserId,
                messages: [
                  {
                    type: "text",
                    text: `[แจ้งเตือน] ลูกค้าขอคุยกับเจ้าหน้าที่\nBusiness: ${biz.name}\nUser: ${lineUserId}\nข้อความ: "${userText}"`,
                  },
                ],
              }),
            });
          } catch {
            // Non-critical: notification failure should not block reply
          }
        }

        // Send escalation reply to customer, then stop bot
        const escalationReply = stripMarkdown(pipelineContent);
        try {
          await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              replyToken,
              messages: [{ type: "text", text: escalationReply }],
            }),
          });
        } catch { /* reply token may expire */ }

        await chatStore.addMessage(businessId, lineUserId, {
          role: "bot",
          content: escalationReply,
          timestamp: Date.now(),
          pipelineLayer: 1,
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
          await fetch("https://api.line.me/v2/bot/message/reply", {
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
                  text: "สวัสดีครับ ข้อความของท่านได้รับแล้ว รอสักครู่ แอดมินจะติดต่อกลับครับ",
                },
              ],
            }),
          });
        } catch { /* reply token may expire */ }
        diag.autoPinned = true;
        diag.skippedReason = "auto_pinned_discontinuous";
        results.push(diag);
        continue;
      }

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

      // ── Store bot reply ──
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
          messages: [{ type: "text", text: replyText.length > 5000 ? replyText.slice(0, 4997) + "..." : replyText }],
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
              messages: [{ type: "text", text: "ขออภัยครับ ระบบขัดข้อง กรุณาลองใหม่อีกครั้งครับ" }],
            }),
          });
        }
      } catch {
        // Reply token may have expired
      }
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
          messages: [{ type: "text", text: "ทดสอบจาก EV Life Thailand Bot - ระบบทำงานปกติครับ!" }],
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
