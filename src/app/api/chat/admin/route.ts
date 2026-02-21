import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";

export const runtime = "nodejs";

/* ------------------------------------------------------------------ */
/*  Admin Chat API                                                      */
/*  GET  — list conversations or get messages for a user                */
/*  POST — send message, toggle bot, mark read                          */
/* ------------------------------------------------------------------ */

// ── Env helpers (same pattern as webhook) ──

function envKey(businessId: string, suffix: string): string {
  const prefix = businessId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return `${prefix}_${suffix}`;
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

// ── GET: List conversations or get messages ──

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json(
      { error: "Missing businessId query parameter" },
      { status: 400 }
    );
  }

  const userId = req.nextUrl.searchParams.get("userId");

  if (userId) {
    // Get messages for a specific conversation
    const messages = await chatStore.getMessages(businessId, userId);
    const conversations = await chatStore.getConversations(businessId);
    const conversation = conversations.find((c) => c.userId === userId) || null;
    return NextResponse.json({ conversation, messages });
  }

  // List all conversations
  const conversations = await chatStore.getConversations(businessId);
  const totalUnread = await chatStore.getTotalUnread(businessId);
  return NextResponse.json({ conversations, totalUnread });
}

// ── POST: Actions (send, toggleBot, markRead) ──

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action as string;
  const businessId = body.businessId as string;
  const userId = body.userId as string;

  if (!action || !businessId) {
    return NextResponse.json(
      { error: "Missing required fields: action, businessId" },
      { status: 400 }
    );
  }

  switch (action) {
    // ── Send message to customer via LINE Push API ──
    case "send": {
      const message = body.message as string;
      if (!userId || !message) {
        return NextResponse.json(
          { error: "Missing userId or message" },
          { status: 400 }
        );
      }

      // Store admin message
      const stored = await chatStore.addMessage(businessId, userId, {
        role: "admin",
        content: message,
        timestamp: Date.now(),
      });

      // Send via LINE Push API
      const accessToken = getLineAccessToken(businessId);
      if (!accessToken) {
        return NextResponse.json(
          { success: false, error: "No LINE access token configured", messageId: stored.id },
          { status: 500 }
        );
      }

      try {
        const pushRes = await fetch(
          "https://api.line.me/v2/bot/message/push",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              to: userId,
              messages: [{ type: "text", text: message }],
            }),
          }
        );

        if (!pushRes.ok) {
          const errBody = await pushRes.text().catch(() => "");
          console.error(
            `[Admin] Push failed: ${pushRes.status} ${errBody}`
          );
          return NextResponse.json({
            success: false,
            error: `LINE Push API: ${pushRes.status}`,
            detail: errBody,
            messageId: stored.id,
          });
        }
      } catch (err) {
        console.error("[Admin] Push error:", err);
        return NextResponse.json({
          success: false,
          error: String(err),
          messageId: stored.id,
        });
      }

      return NextResponse.json({ success: true, messageId: stored.id });
    }

    // ── Toggle bot auto-reply ──
    case "toggleBot": {
      if (!userId) {
        return NextResponse.json(
          { error: "Missing userId" },
          { status: 400 }
        );
      }
      const enabled = !!body.enabled;
      await chatStore.toggleBot(businessId, userId, enabled);

      // Also store a system-like message noting the change
      await chatStore.addMessage(businessId, userId, {
        role: "admin",
        content: enabled
          ? "[ระบบ] เปิด Bot ตอบอัตโนมัติแล้ว"
          : "[ระบบ] ปิด Bot — แอดมินตอบเอง",
        timestamp: Date.now(),
      });

      return NextResponse.json({ success: true, botEnabled: enabled });
    }

    // ── Mark conversation as read ──
    case "markRead": {
      if (!userId) {
        return NextResponse.json(
          { error: "Missing userId" },
          { status: 400 }
        );
      }
      await chatStore.markRead(businessId, userId);
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}
