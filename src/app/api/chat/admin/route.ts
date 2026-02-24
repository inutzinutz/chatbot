import { NextRequest, NextResponse } from "next/server";
import { chatStore, type QuickReplyTemplate, type CRMNote, type CorrectionEntry } from "@/lib/chatStore";
import { analyzeConversation } from "@/lib/followupAgent";
import { getBusinessConfig } from "@/lib/businessUnits";
import { verifySessionToken, SESSION_COOKIE, requireAdminSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { buildLineFlexCarousel, buildFbGenericCarousel } from "@/lib/carouselBuilder";
import { products as dji13products } from "@/lib/products";
import { products as evlifeProducts } from "@/lib/evlife/products";
import { products as dji13supportProducts } from "@/lib/dji13support/products";
import { products as dji13serviceProducts } from "@/lib/dji13service/products";

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

function getFbAccessToken(businessId: string): string {
  return (
    (process.env as Record<string, string | undefined>)[
      envKey(businessId, "FB_PAGE_ACCESS_TOKEN")
    ] ||
    process.env.FB_PAGE_ACCESS_TOKEN ||
    ""
  );
}

function getProductsForBusiness(businessId: string) {
  switch (businessId) {
    case "evlifethailand": return evlifeProducts;
    case "dji13support":   return dji13supportProducts;
    case "dji13service":   return dji13serviceProducts;
    default:               return dji13products;
  }
}

// ── Extract authenticated username from session cookie ──

async function getSessionUsername(req: NextRequest): Promise<string> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return "admin";
  const session = await verifySessionToken(token);
  return session?.username || "admin";
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

  // Auth guard — must have a valid session for this business
  const session = await requireAdminSession(req, businessId);
  if (!session) return unauthorizedResponse();

  const userId = req.nextUrl.searchParams.get("userId");
  const view = req.nextUrl.searchParams.get("view");

  // View follow-ups
  if (view === "followups") {
    const followups = await chatStore.getAllFollowUps(businessId);
    return NextResponse.json({ followups });
  }

  // View quick reply templates
  if (view === "templates") {
    const templates = await chatStore.getTemplates(businessId);
    return NextResponse.json({ templates });
  }

  // View CRM notes for a user
  if (view === "notes") {
    const noteUserId = req.nextUrl.searchParams.get("userId");
    if (!noteUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    const notes = await chatStore.getCRMNotes(businessId, noteUserId);
    return NextResponse.json({ notes });
  }

  // View admin activity log
  if (view === "adminlog") {
    const username = req.nextUrl.searchParams.get("username") || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100");
    const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
    const entries = await chatStore.getAdminActivityLog(businessId, { limit, offset, username });
    return NextResponse.json({ entries });
  }

  // View customer journey timeline (C2)
  if (view === "journey") {
    const journeyUserId = req.nextUrl.searchParams.get("userId");
    if (!journeyUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    const events = await chatStore.getCustomerJourney(businessId, journeyUserId);
    return NextResponse.json({ events });
  }

  // View correction log (B3)
  if (view === "corrections") {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
    const corrections = await chatStore.getCorrections(businessId, limit);
    return NextResponse.json({ corrections });
  }

  // View admin stats (per-user summary)
  if (view === "adminstats") {
    const since = req.nextUrl.searchParams.get("since")
      ? parseInt(req.nextUrl.searchParams.get("since")!)
      : Date.now() - 30 * 24 * 60 * 60 * 1000; // default: last 30 days
    const stats = await chatStore.getAdminStats(businessId, since);
    return NextResponse.json({ stats });
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

  // Auth guard — must have a valid session for this business
  const postSession = await requireAdminSession(req, businessId);
  if (!postSession) return unauthorizedResponse();

  // Extract who is performing this action
  const sentBy = await getSessionUsername(req);

  // Helper: get customer display name for logging
  const getDisplayName = async (uid: string) => {
    if (!uid) return undefined;
    const convs = await chatStore.getConversations(businessId);
    return convs.find((c) => c.userId === uid)?.displayName;
  };

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

      // Store admin message with sentBy
      const stored = await chatStore.addMessage(businessId, userId, {
        role: "admin",
        content: message,
        timestamp: Date.now(),
        sentBy,
      });

      // Log activity
      await chatStore.logAdminActivity({
        businessId,
        username: sentBy,
        action: "send",
        userId,
        displayName: await getDisplayName(userId),
        detail: message.slice(0, 100),
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

      // Auto-disable bot: admin is now handling this conversation manually
      const wasEnabled = await chatStore.isBotEnabled(businessId, userId);
      if (wasEnabled) {
        await chatStore.toggleBot(businessId, userId, false);
        await chatStore.addMessage(businessId, userId, {
          role: "admin",
          content: `[ระบบ] บอทหยุดตอบอัตโนมัติ — ${sentBy} กำลังดูแลอยู่`,
          timestamp: Date.now(),
          sentBy,
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

      const toggleMsg = enabled
        ? `[ระบบ] เปิด Bot — โดย ${sentBy}`
        : `[ระบบ] ปิด Bot — ${sentBy} จะตอบเอง`;
      await chatStore.addMessage(businessId, userId, {
        role: "admin",
        content: toggleMsg,
        timestamp: Date.now(),
        sentBy,
      });
      await chatStore.logAdminActivity({
        businessId,
        username: sentBy,
        action: "toggleBot",
        userId,
        displayName: await getDisplayName(userId),
        detail: enabled ? "เปิด Bot" : "ปิด Bot",
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
      await chatStore.logAdminActivity({
        businessId,
        username: sentBy,
        action: "globalToggleBot",
        userId: "",
        detail: globalEnabled ? "เปิด Global Bot" : "ปิด Global Bot",
        timestamp: Date.now(),
      });
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

      // Paginate to avoid Vercel timeout: max 20 convs per call
      const PAGE_SIZE = 20;
      const CONCURRENCY = 5;
      const page = typeof body.page === "number" ? body.page : 0;
      const slice = recent.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
      const hasMore = recent.length > (page + 1) * PAGE_SIZE;

      let analyzed = 0;
      let flagged = 0;

      // Process in batches of CONCURRENCY to limit parallel AI calls
      for (let i = 0; i < slice.length; i += CONCURRENCY) {
        const batch = slice.slice(i, i + CONCURRENCY);
        await Promise.all(
          batch.map(async (conv) => {
            const msgs = await chatStore.getMessages(businessId, conv.userId);
            const result = await analyzeConversation(msgs, conv, bizConfig.name);
            await chatStore.setFollowUp(businessId, conv.userId, result);
            analyzed++;
            if (result.needsFollowup) flagged++;
          })
        );
      }

      return NextResponse.json({
        success: true,
        analyzed,
        flagged,
        page,
        hasMore,
        total: recent.length,
      });
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

      // Store admin message with sentBy
      const stored = await chatStore.addMessage(businessId, userId, {
        role: "admin",
        content: message,
        timestamp: Date.now(),
        sentBy,
      });
      await chatStore.logAdminActivity({
        businessId,
        username: sentBy,
        action: "sendFollowup",
        userId,
        displayName: await getDisplayName(userId),
        detail: message.slice(0, 100),
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

      // Auto-disable bot: admin is now handling this conversation manually
      const wasEnabledFU = await chatStore.isBotEnabled(businessId, userId);
      if (wasEnabledFU) {
        await chatStore.toggleBot(businessId, userId, false);
        await chatStore.addMessage(businessId, userId, {
          role: "admin",
          content: `[ระบบ] บอทหยุดตอบอัตโนมัติ — ${sentBy} กำลังดูแลอยู่`,
          timestamp: Date.now(),
          sentBy,
        });
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
        content: `[ระบบ] ปักหมุดแล้ว — ${reason} (โดย ${sentBy})`,
        timestamp: Date.now(),
        sentBy,
      });
      await chatStore.logAdminActivity({
        businessId,
        username: sentBy,
        action: "pin",
        userId,
        displayName: await getDisplayName(userId),
        detail: reason,
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
        content: `[ระบบ] ถอดหมุดแล้ว (โดย ${sentBy})`,
        timestamp: Date.now(),
        sentBy,
      });
      await chatStore.logAdminActivity({
        businessId,
        username: sentBy,
        action: "unpin",
        userId,
        displayName: await getDisplayName(userId),
        detail: "ถอดหมุด",
        timestamp: Date.now(),
      });
      return NextResponse.json({ success: true });
    }

    // ── Assign conversation to admin ──
    case "assign": {
      if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      }
      await chatStore.assignConversation(businessId, userId, sentBy);
      await chatStore.addMessage(businessId, userId, {
        role: "admin",
        content: `[ระบบ] ${sentBy} รับงานสนทนานี้แล้ว`,
        timestamp: Date.now(),
        sentBy,
      });
      await chatStore.logAdminActivity({
        businessId,
        username: sentBy,
        action: "pin", // closest semantic match for "taking ownership of conversation"
        userId,
        displayName: await getDisplayName(userId),
        detail: `รับงาน (assign) โดย ${sentBy}`,
        timestamp: Date.now(),
      });
      return NextResponse.json({ success: true, assignedAdmin: sentBy });
    }

    // ── Unassign conversation ──
    case "unassign": {
      if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      }
      await chatStore.unassignConversation(businessId, userId);
      await chatStore.addMessage(businessId, userId, {
        role: "admin",
        content: `[ระบบ] ${sentBy} คืนงานสนทนาแล้ว`,
        timestamp: Date.now(),
        sentBy,
      });
      return NextResponse.json({ success: true });
    }

    // ── Add CRM note ──
    case "addNote": {
      if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      const noteText = body.text as string;
      if (!noteText?.trim()) return NextResponse.json({ error: "Missing note text" }, { status: 400 });
      const note = await chatStore.addCRMNote(businessId, userId, noteText.trim(), sentBy);
      return NextResponse.json({ success: true, note });
    }

    // ── Delete CRM note ──
    case "deleteNote": {
      if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      const noteId = body.noteId as string;
      if (!noteId) return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
      await chatStore.deleteCRMNote(businessId, userId, noteId);
      return NextResponse.json({ success: true });
    }

    // ── Save quick reply template ──
    case "saveTemplate": {
      const title = body.title as string;
      const text = body.text as string;
      if (!title || !text) {
        return NextResponse.json({ error: "Missing title or text" }, { status: 400 });
      }
      const template = await chatStore.saveTemplate(businessId, { title, text });
      return NextResponse.json({ success: true, template });
    }

    // ── Delete quick reply template ──
    case "deleteTemplate": {
      const templateId = body.templateId as string;
      if (!templateId) {
        return NextResponse.json({ error: "Missing templateId" }, { status: 400 });
      }
      await chatStore.deleteTemplate(businessId, templateId);
      return NextResponse.json({ success: true });
    }

    // ── Update quick reply template ──
    case "updateTemplate": {
      const templateId = body.templateId as string;
      const updates: Partial<Pick<QuickReplyTemplate, "title" | "text">> = {};
      if (body.title) updates.title = body.title as string;
      if (body.text) updates.text = body.text as string;
      if (!templateId) {
        return NextResponse.json({ error: "Missing templateId" }, { status: 400 });
      }
      await chatStore.updateTemplate(businessId, templateId, updates);
      return NextResponse.json({ success: true });
    }

    // ── B3: Log admin correction of bot response ──
    case "logCorrection": {
      if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      const { botMessage, adminCorrection, userQuestion } = body as Partial<CorrectionEntry>;
      if (!botMessage || !adminCorrection || !userQuestion) {
        return NextResponse.json({ error: "Missing botMessage, adminCorrection, or userQuestion" }, { status: 400 });
      }
      const displayName = await getDisplayName(userId);
      const entry = await chatStore.logCorrection({
        businessId,
        userId,
        displayName,
        botMessage,
        adminCorrection,
        userQuestion,
        correctedBy: sentBy,
        timestamp: Date.now(),
        suggestedForKB: false,
      });
      return NextResponse.json({ success: true, entry });
    }

    // ── B3: Mark correction as reviewed / added to KB ──
    case "markCorrectionReviewed": {
      const correctionId = body.correctionId as string;
      if (!correctionId) return NextResponse.json({ error: "Missing correctionId" }, { status: 400 });
      await chatStore.markCorrectionReviewed(businessId, correctionId);
      return NextResponse.json({ success: true });
    }

    // ── Send Product Carousel to customer ──
    case "sendCarousel": {
      if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      }
      const productIds = body.productIds as number[] | undefined;
      if (!productIds || productIds.length === 0) {
        return NextResponse.json({ error: "Missing productIds" }, { status: 400 });
      }

      const allProducts = getProductsForBusiness(businessId);
      const selected = allProducts.filter((p) => productIds.includes(p.id));
      if (selected.length === 0) {
        return NextResponse.json({ error: "No matching products found" }, { status: 404 });
      }

      // Determine customer platform (LINE vs Facebook) by userId prefix
      const isLinePsid = userId.startsWith("U"); // LINE user IDs start with "U"
      const accessToken = getLineAccessToken(businessId);
      const fbToken = getFbAccessToken(businessId);

      const results: { line?: string; facebook?: string } = {};

      // ── LINE Push ──
      if (accessToken) {
        try {
          const flexMsg = buildLineFlexCarousel(selected, `สินค้าแนะนำ (${selected.length} รายการ)`);
          const lineMessages: object[] = [flexMsg];

          const pushRes = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ to: userId, messages: lineMessages }),
          });
          results.line = pushRes.ok ? "ok" : `${pushRes.status}`;
        } catch (err) {
          results.line = String(err);
        }
      }

      // ── Facebook Push (only if userId looks like a FB PSID = numeric string) ──
      if (!isLinePsid && fbToken) {
        try {
          const fbCarousel = buildFbGenericCarousel(selected);
          const fbRes = await fetch(
            `https://graph.facebook.com/v19.0/me/messages?access_token=${fbToken}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipient: { id: userId },
                message: fbCarousel,
              }),
            }
          );
          results.facebook = fbRes.ok ? "ok" : `${fbRes.status}`;
        } catch (err) {
          results.facebook = String(err);
        }
      }

      // Store as admin message in chat history
      const productNames = selected.map((p) => p.name).join(", ");
      await chatStore.addMessage(businessId, userId, {
        role: "admin",
        content: `[Carousel] ส่งสินค้าแนะนำ: ${productNames}`,
        timestamp: Date.now(),
        sentBy,
      });
      await chatStore.logAdminActivity({
        businessId,
        username: sentBy,
        action: "send",
        userId,
        displayName: await getDisplayName(userId),
        detail: `Carousel: ${productNames.slice(0, 100)}`,
        timestamp: Date.now(),
      });

      return NextResponse.json({ success: true, sent: selected.length, results });
    }

    // ── Send Media (image / video / file) to customer ──
    case "sendMedia": {
      if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      }
      const mediaUrl = body.mediaUrl as string;
      const mediaType = (body.mediaType as string) || "image"; // "image" | "video" | "file"
      const fileName = (body.fileName as string) || "";
      const mimeType = (body.mimeType as string) || "";

      if (!mediaUrl) {
        return NextResponse.json({ error: "Missing mediaUrl" }, { status: 400 });
      }

      // Store message in chat history
      const stored = await chatStore.addMessage(businessId, userId, {
        role: "admin",
        content: fileName ? `[ไฟล์แนบ] ${fileName}` : `[${mediaType === "image" ? "รูปภาพ" : mediaType === "video" ? "วีดีโอ" : "ไฟล์"}]`,
        timestamp: Date.now(),
        sentBy,
        imageUrl: mediaType === "image" ? mediaUrl : undefined,
        videoUrl: mediaType === "video" ? mediaUrl : undefined,
        fileUrl: mediaType === "file" ? mediaUrl : undefined,
        fileName: fileName || undefined,
        fileMimeType: mimeType || undefined,
      });

      await chatStore.logAdminActivity({
        businessId,
        username: sentBy,
        action: "send",
        userId,
        displayName: await getDisplayName(userId),
        detail: `[${mediaType}] ${fileName || mediaUrl.slice(0, 60)}`,
        timestamp: Date.now(),
      });

      const isLineUser = userId.startsWith("U");
      const accessToken = getLineAccessToken(businessId);
      const fbToken = getFbAccessToken(businessId);

      // ── Send via LINE Push ──
      if (accessToken) {
        try {
          let lineMessage: object;

          if (mediaType === "image") {
            lineMessage = {
              type: "image",
              originalContentUrl: mediaUrl,
              previewImageUrl: mediaUrl,
            };
          } else if (mediaType === "video") {
            lineMessage = {
              type: "video",
              originalContentUrl: mediaUrl,
              previewImageUrl: mediaUrl, // Cloudinary auto-generates thumbnail
            };
          } else {
            // For files/PDFs — send as text with link (LINE doesn't support raw file push)
            lineMessage = {
              type: "text",
              text: `📎 ไฟล์แนบ: ${fileName || "ไฟล์"}\n${mediaUrl}`,
            };
          }

          const pushRes = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ to: userId, messages: [lineMessage] }),
          });

          if (!pushRes.ok) {
            const errBody = await pushRes.text().catch(() => "");
            console.error(`[Admin/sendMedia] LINE push failed: ${pushRes.status} ${errBody}`);
          }
        } catch (err) {
          console.error("[Admin/sendMedia] LINE push error:", err);
        }
      }

      // ── Send via Facebook Messenger (non-LINE users) ──
      if (!isLineUser && fbToken) {
        try {
          let fbMessage: object;

          if (mediaType === "image") {
            fbMessage = {
              attachment: {
                type: "image",
                payload: { url: mediaUrl, is_reusable: true },
              },
            };
          } else if (mediaType === "video") {
            fbMessage = {
              attachment: {
                type: "video",
                payload: { url: mediaUrl, is_reusable: true },
              },
            };
          } else {
            fbMessage = {
              attachment: {
                type: "file",
                payload: { url: mediaUrl, is_reusable: true },
              },
            };
          }

          const fbRes = await fetch(
            `https://graph.facebook.com/v19.0/me/messages?access_token=${fbToken}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recipient: { id: userId }, message: fbMessage }),
            }
          );

          if (!fbRes.ok) {
            const errBody = await fbRes.text().catch(() => "");
            console.error(`[Admin/sendMedia] FB send failed: ${fbRes.status} ${errBody}`);
          }
        } catch (err) {
          console.error("[Admin/sendMedia] FB send error:", err);
        }
      }

      // Auto-disable bot when admin sends media
      const wasEnabled = await chatStore.isBotEnabled(businessId, userId);
      if (wasEnabled) {
        await chatStore.toggleBot(businessId, userId, false);
        await chatStore.addMessage(businessId, userId, {
          role: "admin",
          content: `[ระบบ] บอทหยุดตอบอัตโนมัติ — ${sentBy} กำลังดูแลอยู่`,
          timestamp: Date.now(),
          sentBy,
        });
      }

      return NextResponse.json({ success: true, messageId: stored.id });
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}
