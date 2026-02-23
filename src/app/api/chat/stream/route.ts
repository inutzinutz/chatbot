import { NextRequest } from "next/server";
import { requireAdminSession, unauthorizedResponse } from "@/lib/auth";
import { chatStore } from "@/lib/chatStore";

export const runtime = "nodejs";
export const maxDuration = 60;

/* ------------------------------------------------------------------ */
/*  SSE Real-time Stream                                               */
/*  GET /api/chat/stream?businessId=xxx&userId=xxx                     */
/*                                                                     */
/*  Pushes live updates to admin panel instead of polling:            */
/*    - "convs"  — full conversation list (every ~2s or on event)     */
/*    - "msgs"   — messages for active userId (every ~1.5s)           */
/*    - "ping"   — keepalive every 15s                                */
/*                                                                     */
/*  Client connects once and receives a stream of SSE events.         */
/*  On reconnect (EventSource auto-reconnects), it re-subscribes.     */
/* ------------------------------------------------------------------ */

/**
 * Serialize data as an SSE event string.
 */
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const businessId = searchParams.get("businessId");
  const userId = searchParams.get("userId") ?? null; // optional: stream msgs for this user

  if (!businessId) {
    return new Response("Missing businessId", { status: 400 });
  }

  // Auth guard
  const session = await requireAdminSession(req, businessId);
  if (!session) return unauthorizedResponse();

  // Build a ReadableStream that pushes SSE events
  const encoder = new TextEncoder();

  let closed = false;
  let convInterval: ReturnType<typeof setInterval> | null = null;
  let msgInterval: ReturnType<typeof setInterval> | null = null;
  let pingInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const push = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // ── Initial data burst ──
      const sendConvs = async () => {
        try {
          const conversations = await chatStore.getConversations(businessId);
          const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);
          const globalBotEnabled = await chatStore.isGlobalBotEnabled(businessId);
          push(sseEvent("convs", { conversations, totalUnread, globalBotEnabled }));
        } catch (err) {
          console.error("[SSE] sendConvs error:", err);
        }
      };

      const sendMsgs = async (uid: string) => {
        try {
          const messages = await chatStore.getMessages(businessId, uid);
          const followup = await chatStore.getFollowUp(businessId, uid);
          push(sseEvent("msgs", { userId: uid, messages, followup }));
        } catch (err) {
          console.error("[SSE] sendMsgs error:", err);
        }
      };

      // Fire initial data immediately
      sendConvs();
      if (userId) sendMsgs(userId);

      // ── Polling intervals (push model to client) ──
      // Conversations: every 2s
      convInterval = setInterval(() => {
        if (closed) return;
        sendConvs();
      }, 2000);

      // Messages (if userId provided): every 1.5s
      if (userId) {
        msgInterval = setInterval(() => {
          if (closed || !userId) return;
          sendMsgs(userId);
        }, 1500);
      }

      // Keepalive ping every 15s (prevents proxy/Vercel timeout)
      pingInterval = setInterval(() => {
        if (closed) return;
        push(sseEvent("ping", { ts: Date.now() }));
      }, 15000);
    },

    cancel() {
      closed = true;
      if (convInterval) clearInterval(convInterval);
      if (msgInterval) clearInterval(msgInterval);
      if (pingInterval) clearInterval(pingInterval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering on Vercel
    },
  });
}
