import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";

export const runtime = "nodejs";

/**
 * GET /api/chat-summary?businessId=xxx&userId=yyy
 *
 * Returns the stored ChatSummary for a conversation, or null if none exists.
 * Used by the edge /api/chat route to inject prior conversation context into
 * the AI system prompt for long-running conversations.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  const userId = searchParams.get("userId");

  if (!businessId || !userId) {
    return NextResponse.json({ summary: null }, { status: 400 });
  }

  try {
    const summary = await chatStore.getChatSummary(businessId, userId);
    return NextResponse.json({ summary: summary ?? null });
  } catch {
    return NextResponse.json({ summary: null });
  }
}
