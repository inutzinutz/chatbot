import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";
import { analyzeConversation } from "@/lib/followupAgent";
import { getBusinessConfig } from "@/lib/businessUnits";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow longer for AI analysis

/* ------------------------------------------------------------------ */
/*  Admin Chat API                                                      */
/*  GET  — list conversations, messages, or follow-ups                  */
/*  POST — send message, toggle bot, mark read, analyze follow-ups     */
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
  const view = req.nextUrl.searchParams.get("view");

  // View follow-ups
  if (view === "followups") {
    const followups = await chatStore.getAllFollowUps(businessId);
    return NextResponse.json({ followups });
  }

  if (userId) {
    // Get messages for a specific conversation
    const messages = await chatStore.getMessages(businessId, userId);
    const conversations = await chatStore.getConversations(businessId);
    const conversation = conversations.find((c) => c.userId === userId) || null;
    const followup = await chatStore.getFollowUp(businessId, userId);
    return NextResponse.json({ conversation, messages, followup });
  }

  // List all conversations + global bot status
  const conversations = await chatStore.getConversations(businessId);
  const totalUnread = await chatStore.getTotalUnread(businessId);
  const globalBotEnabled = await chatStore.isGlobalBotEnabled(businessId);
  return NextResponse.json({ conversations, totalUnread, globalBotEnabled });
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

    // ── Global bot toggle (entire business) ──
    case "globalToggleBot": {
      const globalEnabled = !!body.enabled;
      await chatStore.setGlobalBotEnabled(businessId, globalEnabled);
      return NextResponse.json({
        success: true,
        globalBotEnabled: globalEnabled,
      });
    }

    // ── Analyze all conversations for follow-up ──
    case "analyzeFollowups": {
      const bizConfig = getBusinessConfig(businessId);
      const allConversations = await chatStore.getConversations(businessId);

      // Only analyze conversations active in last 7 days
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recent = allConversations.filter(
        (c) => c.lastMessageAt > sevenDaysAgo
      );

      let analyzed = 0;
      let flagged = 0;

      for (const conv of recent) {
        const msgs = await chatStore.getMessages(businessId, conv.userId);
        const result = await analyzeConversation(msgs, conv, bizConfig.name);
        await chatStore.setFollowUp(businessId, conv.userId, result);
        analyzed++;
        if (result.needsFollowup) flagged++;
      }

      return NextResponse.json({ success: true, analyzed, flagged });
    }

    // ── Send follow-up message to customer ──
    case "sendFollowup": {
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
      if (accessToken) {
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
            console.error(`[Admin] Follow-up push failed: ${pushRes.status} ${errBody}`);
          }
        } catch (err) {
          console.error("[Admin] Follow-up push error:", err);
        }
      }

      // Clear follow-up flag
      await chatStore.clearFollowUp(businessId, userId);
      return NextResponse.json({ success: true, messageId: stored.id });
    }

    // ── Dismiss follow-up (clear flag without sending) ──
    case "dismissFollowup": {
      if (!userId) {
        return NextResponse.json(
          { error: "Missing userId" },
          { status: 400 }
        );
      }
      await chatStore.clearFollowUp(businessId, userId);
      return NextResponse.json({ success: true });
    }

    // ── Pin conversation ──
    case "pin": {
      if (!userId) {
        return NextResponse.json(
          { error: "Missing userId" },
          { status: 400 }
        );
      }
      const reason = (body.reason as string) || "ปักหมุดโดยแอดมิน";
      await chatStore.pinConversation(businessId, userId, reason);
      await chatStore.addMessage(businessId, userId, {
        role: "admin",
        content: `[ระบบ] ปักหมุดแล้ว — ${reason}`,
        timestamp: Date.now(),
      });
      return NextResponse.json({ success: true });
    }

    // ── Unpin conversation ──
    case "unpin": {
      if (!userId) {
        return NextResponse.json(
          { error: "Missing userId" },
          { status: 400 }
        );
      }
      await chatStore.unpinConversation(businessId, userId);
      await chatStore.addMessage(businessId, userId, {
        role: "admin",
        content: "[ระบบ] ถอดหมุดแล้ว",
        timestamp: Date.now(),
      });
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}
