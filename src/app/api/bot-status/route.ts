/* ------------------------------------------------------------------ */
/*  /api/bot-status — Lightweight botEnabled check for edge runtime     */
/*                                                                      */
/*  Called by /api/chat (edge) to check if bot is allowed to reply      */
/*  for a given conversation.                                           */
/*                                                                      */
/*  GET ?businessId=xxx&userId=yyy → { botEnabled: boolean }            */
/*                                                                      */
/*  Handoff State Machine:                                              */
/*  If bot is disabled AND admin has not replied in 30 minutes →        */
/*  auto re-enable bot and write back to Redis.                         */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";

export const runtime = "nodejs";

const ADMIN_INACTIVE_MS = 30 * 60 * 1000; // 30 minutes

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const userId = req.nextUrl.searchParams.get("userId");

  if (!businessId || !userId) {
    return NextResponse.json({ botEnabled: true }); // default: allow
  }

  const [globalEnabled, conv] = await Promise.all([
    chatStore.isGlobalBotEnabled(businessId),
    chatStore.getConversation(businessId, userId),
  ]);

  if (!globalEnabled) {
    return NextResponse.json({ botEnabled: false });
  }

  const convEnabled = conv?.botEnabled ?? true;

  // ── Handoff State Machine: auto re-enable after admin inactivity ──
  if (!convEnabled && conv) {
    const lastAdminAt = conv.adminLastReplyAt ?? conv.assignedAt ?? 0;
    const inactiveDuration = Date.now() - lastAdminAt;

    if (lastAdminAt > 0 && inactiveDuration > ADMIN_INACTIVE_MS) {
      // Admin has been inactive 30+ min → re-enable bot
      await chatStore.toggleBot(businessId, userId, true).catch(() => {});
      return NextResponse.json({ botEnabled: true, autoReEnabled: true });
    }
  }

  return NextResponse.json({ botEnabled: convEnabled });
}
