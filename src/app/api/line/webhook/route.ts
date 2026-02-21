import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

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

  await fetch("https://api.line.me/v2/bot/message/reply", {
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
}

// ── Collect full text from SSE stream ──

async function collectStreamedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let buffer = "";
  let result = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            result += parsed.content;
          }
        } catch {
          // skip non-JSON (trace events, etc.)
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return result;
}

// ── Strip markdown for LINE plain-text ──

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold → plain
    .replace(/__(.+?)__/g, "$1") // bold alt
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/_(.+?)_/g, "$1") // italic alt
    .replace(/~~(.+?)~~/g, "$1") // strikethrough
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links → text only
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/^[-*]\s+/gm, "• ") // list items → bullet
    .replace(/^\d+\.\s+/gm, "") // numbered list (keep number via text)
    .trim();
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
    return NextResponse.json({ status: "ok" });
  }

  // Build internal chat API URL
  const chatUrl = new URL("/api/chat", req.url);

  // Process each event
  for (const event of events) {
    // Only handle text messages
    if (event.type !== "message" || event.message?.type !== "text") continue;

    const userText = event.message.text || "";
    const replyToken = event.replyToken;
    if (!userText || !replyToken) continue;

    try {
      // Call our chat pipeline internally
      const chatResponse = await fetch(chatUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userText }],
          businessId,
        }),
      });

      let replyText = "";

      const contentType = chatResponse.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        // Pipeline resolved (layers 0-14) or fallback JSON
        const data = await chatResponse.json();
        replyText = data.content || "";
      } else if (contentType.includes("text/event-stream")) {
        // Claude/OpenAI streamed response — collect all chunks
        replyText = await collectStreamedText(chatResponse);
      }

      if (!replyText) {
        replyText = "ขออภัยครับ ไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้งครับ";
      }

      // Strip markdown for plain-text LINE
      replyText = stripMarkdown(replyText);

      await replyToLine(replyToken, replyText, accessToken);
    } catch (err) {
      console.error(`[LINE webhook] Error processing message:`, err);

      // Best-effort reply on error
      try {
        await replyToLine(
          replyToken,
          "ขออภัยครับ ระบบขัดข้อง กรุณาลองใหม่อีกครั้งครับ",
          accessToken
        );
      } catch {
        // Reply token may have expired
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}

// ── GET handler for quick health check ──

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId") || "none";
  return NextResponse.json({
    status: "ok",
    endpoint: "LINE Webhook",
    businessId,
    usage: "POST /api/line/webhook?businessId=evlifethailand",
  });
}
