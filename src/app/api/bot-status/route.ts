/* ------------------------------------------------------------------ */
/*  /api/bot-status — Lightweight botEnabled check for edge runtime     */
/*                                                                      */
/*  Called by /api/chat (edge) to check if bot is allowed to reply      */
/*  for a given conversation.                                           */
/*                                                                      */
/*  GET ?businessId=xxx&userId=yyy → { botEnabled: boolean }            */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const userId = req.nextUrl.searchParams.get("userId");

  if (!businessId || !userId) {
    return NextResponse.json({ botEnabled: true }); // default: allow
  }

  const [globalEnabled, convEnabled] = await Promise.all([
    chatStore.isGlobalBotEnabled(businessId),
    chatStore.isBotEnabled(businessId, userId),
  ]);

  return NextResponse.json({ botEnabled: globalEnabled && convEnabled });
}
