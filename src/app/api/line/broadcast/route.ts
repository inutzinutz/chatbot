/* ------------------------------------------------------------------ */
/*  LINE Broadcast / Multicast                                          */
/*  POST /api/line/broadcast                                            */
/*                                                                      */
/*  Body:                                                               */
/*    {                                                                 */
/*      businessId: string,                                             */
/*      message: string,                                                */
/*      filter?: "all" | "pinned" | "botOff",  // default "all"        */
/*    }                                                                 */
/*                                                                      */
/*  Sends a LINE Push message to every conversation matching filter.   */
/*  Uses the per-business LINE_CHANNEL_ACCESS_TOKEN env var.           */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";
import { requireAdminSession, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60; // Up to 500 users at ~100ms each

function envKey(businessId: string, suffix: string): string {
  return `${businessId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_${suffix}`;
}

function getLineToken(businessId: string): string {
  return (
    (process.env as Record<string, string | undefined>)[
      envKey(businessId, "LINE_CHANNEL_ACCESS_TOKEN")
    ] ||
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    ""
  );
}

export async function POST(req: NextRequest) {
  let body: { businessId?: string; message?: string; filter?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { businessId, message, filter = "all" } = body;

  if (!businessId || !message?.trim()) {
    return NextResponse.json({ error: "Missing businessId or message" }, { status: 400 });
  }

  // Auth guard
  const session = await requireAdminSession(req, businessId);
  if (!session) return unauthorizedResponse();

  const accessToken = getLineToken(businessId);
  if (!accessToken) {
    return NextResponse.json({ error: "LINE access token not configured for this business" }, { status: 500 });
  }

  // Load conversations
  const conversations = await chatStore.getConversations(businessId);

  // Filter to LINE users only (web users don't have LINE push)
  let targets = conversations.filter((c) => c.source === "line");

  if (filter === "pinned") {
    targets = targets.filter((c) => c.pinned);
  } else if (filter === "botOff") {
    targets = targets.filter((c) => !c.botEnabled);
  }

  if (targets.length === 0) {
    return NextResponse.json({ success: true, sent: 0, failed: 0, skipped: 0, message: "No matching users" });
  }

  const trimmedMsg = message.trim().slice(0, 5000);
  let sent = 0;
  let failed = 0;

  // LINE Multicast API supports up to 500 recipients per call
  const CHUNK = 500;
  for (let i = 0; i < targets.length; i += CHUNK) {
    const chunk = targets.slice(i, i + CHUNK);
    const to = chunk.map((c) => c.userId);

    try {
      const res = await fetch("https://api.line.me/v2/bot/message/multicast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to,
          messages: [{ type: "text", text: trimmedMsg }],
        }),
      });

      if (res.ok) {
        sent += chunk.length;
      } else {
        const errBody = await res.text().catch(() => "");
        console.error(`[broadcast] Multicast failed: ${res.status} ${errBody}`);
        failed += chunk.length;
      }
    } catch (err) {
      console.error("[broadcast] Multicast error:", err);
      failed += chunk.length;
    }
  }

  // Log broadcast as admin activity for each sent user (batch)
  // Just log a single entry for the broadcast action
  try {
    await chatStore.logAdminActivity({
      businessId,
      username: session.username,
      action: "send",
      userId: "",
      detail: `[Broadcast] ${filter} · ${sent} ราย: ${trimmedMsg.slice(0, 60)}`,
      timestamp: Date.now(),
    });
  } catch { /* non-critical */ }

  return NextResponse.json({
    success: failed === 0,
    sent,
    failed,
    total: targets.length,
  });
}

// GET — preview target count (no message sent)
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const filter = req.nextUrl.searchParams.get("filter") || "all";

  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });

  const session = await requireAdminSession(req, businessId);
  if (!session) return unauthorizedResponse();

  const conversations = await chatStore.getConversations(businessId);
  let targets = conversations.filter((c) => c.source === "line");

  if (filter === "pinned") targets = targets.filter((c) => c.pinned);
  else if (filter === "botOff") targets = targets.filter((c) => !c.botEnabled);

  return NextResponse.json({ count: targets.length, filter });
}
