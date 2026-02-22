/* ------------------------------------------------------------------ */
/*  Conversation Search                                                  */
/*  GET /api/search?businessId=xxx&q=keyword&limit=20                  */
/*                                                                      */
/*  Searches:                                                           */
/*    1. Conversation displayName (fast, in-memory)                    */
/*    2. Last message text                                              */
/*    3. Recent message content (last 20 msgs per conv, up to 50 convs */
/*       that haven't matched yet) — more expensive                    */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";
import { requireAdminSession, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const businessId = searchParams.get("businessId");
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  // Auth guard
  const session = await requireAdminSession(req, businessId);
  if (!session) return unauthorizedResponse();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], q });
  }

  const conversations = await chatStore.getConversations(businessId);

  // ── Pass 1: Match on displayName, lastMessage, pinnedReason ──
  const matched = new Map<string, { score: number; snippet?: string }>();

  for (const conv of conversations) {
    let score = 0;
    let snippet: string | undefined;

    const name = (conv.displayName || "").toLowerCase();
    const lastMsg = (conv.lastMessage || "").toLowerCase();

    if (name.includes(q)) { score += 10; }
    if (lastMsg.includes(q)) {
      score += 5;
      snippet = conv.lastMessage.slice(0, 120);
    }

    if (score > 0) {
      matched.set(conv.userId, { score, snippet });
    }
  }

  // ── Pass 2: Full-text message search (up to 50 unmatched conversations) ──
  const unmatched = conversations
    .filter((c) => !matched.has(c.userId))
    .slice(0, 50);

  await Promise.all(
    unmatched.map(async (conv) => {
      try {
        const msgs = await chatStore.getMessages(businessId, conv.userId);
        const recent = msgs.slice(-30); // last 30 messages
        for (const msg of recent) {
          if (msg.content?.toLowerCase().includes(q)) {
            matched.set(conv.userId, {
              score: 3,
              snippet: msg.content.slice(0, 120),
            });
            break;
          }
        }
      } catch { /* skip on error */ }
    })
  );

  // ── Build results ──
  const results = conversations
    .filter((c) => matched.has(c.userId))
    .sort((a, b) => {
      const sa = matched.get(a.userId)!.score;
      const sb = matched.get(b.userId)!.score;
      if (sb !== sa) return sb - sa;
      return b.lastMessageAt - a.lastMessageAt; // newer first
    })
    .slice(0, limit)
    .map((c) => ({
      userId: c.userId,
      displayName: c.displayName,
      pictureUrl: c.pictureUrl,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      source: c.source,
      pinned: c.pinned,
      botEnabled: c.botEnabled,
      assignedAdmin: c.assignedAdmin,
      snippet: matched.get(c.userId)!.snippet,
      score: matched.get(c.userId)!.score,
    }));

  return NextResponse.json({ results, q, total: results.length });
}
