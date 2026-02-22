/* ------------------------------------------------------------------ */
/*  POST /api/chat/web-save                                             */
/*  Node.js runtime — saves web chat messages to chatStore (Redis)     */
/*  Called fire-and-forget from ChatWindow after each exchange         */
/*                                                                      */
/*  Body: {                                                             */
/*    businessId: string                                                */
/*    sessionId:  string   (UUID stored in localStorage)               */
/*    displayName: string  (from pre-chat form)                        */
/*    phone: string        (from pre-chat form)                        */
/*    userMessage: string                                               */
/*    botMessage: string                                                */
/*    userTs: number       (ms)                                         */
/*    botTs: number        (ms)                                         */
/*  }                                                                   */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      businessId: string;
      sessionId: string;
      displayName: string;
      phone?: string;
      userMessage: string;
      botMessage: string;
      userTs: number;
      botTs: number;
    };

    const { businessId, sessionId, displayName, phone, userMessage, botMessage, userTs, botTs } = body;

    if (!businessId || !sessionId || !userMessage || !botMessage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Prefix sessionId so web users never collide with LINE/Facebook userIds
    // If sessionId starts with "phone_" the same user across devices maps to same userId
    const userId = `web_${sessionId}`;

    // Ensure conversation exists — always update displayName in case user re-submitted form
    await chatStore.getOrCreateConversation(businessId, userId, {
      displayName: displayName || "Web User",
      source: "web",
    });

    // Save user message
    await chatStore.addMessage(businessId, userId, {
      role: "customer",
      content: userMessage,
      timestamp: userTs,
    });

    // Save bot reply
    await chatStore.addMessage(businessId, userId, {
      role: "bot",
      content: botMessage,
      timestamp: botTs,
    });

    // Save phone to CRM profile if provided
    if (phone) {
      try {
        const existing = await chatStore.getCRMProfile(businessId, userId);
        await chatStore.saveCRMProfile({
          userId,
          businessId,
          name: displayName || undefined,
          phone,
          createdAt: existing?.createdAt ?? Date.now(),
          updatedAt: Date.now(),
          updatedBy: "web_prechat",
        });
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[web-save]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
