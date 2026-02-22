/* ------------------------------------------------------------------ */
/*  /api/monitoring — Unified monitoring dashboard API                  */
/*                                                                      */
/*  GET ?view=users      → per-admin stats + conversation breakdown     */
/*  GET ?view=pending    → pending/stuck work items                     */
/*  GET ?view=daily&date=YYYY-MM-DD → daily digest                     */
/*  GET ?view=summaries&date=YYYY-MM-DD → chat summaries for a day     */
/*  GET ?view=user_detail&username=X → full activity for one admin      */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";
import {
  getTokenDailyStats,
  getTokenTotals,
  getTokenStatsByModel,
  getTokenLog,
} from "@/lib/tokenTracker";
import { requireAdminSession, unauthorizedResponse } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

// Thai timezone helper
function toThaiDate(ts: number): string {
  return new Date(ts + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function todayThai(): string {
  return toThaiDate(Date.now());
}

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  // Auth guard
  const session = await requireAdminSession(req, businessId);
  if (!session) return unauthorizedResponse();

  const view = req.nextUrl.searchParams.get("view") || "users";

  // ── VIEW: token usage ──
  if (view === "tokens") {
    const days = parseInt(req.nextUrl.searchParams.get("days") || "30");
    const [daily, totals, byModel, log] = await Promise.all([
      getTokenDailyStats(businessId, days),
      getTokenTotals(businessId),
      getTokenStatsByModel(businessId, days),
      getTokenLog(businessId, 200),
    ]);

    // Aggregate daily totals across all models (for the chart)
    const dailyTotalsMap: Record<string, { date: string; totalTokens: number; costUSD: number; calls: number }> = {};
    for (const row of daily) {
      if (!dailyTotalsMap[row.date]) {
        dailyTotalsMap[row.date] = { date: row.date, totalTokens: 0, costUSD: 0, calls: 0 };
      }
      dailyTotalsMap[row.date].totalTokens += row.totalTokens;
      dailyTotalsMap[row.date].costUSD += row.costUSD;
      dailyTotalsMap[row.date].calls += row.calls;
    }
    const dailyChart = Object.values(dailyTotalsMap).sort((a, b) => a.date.localeCompare(b.date));

    // Call site breakdown from recent log
    const bySite: Record<string, { calls: number; totalTokens: number; costUSD: number }> = {};
    for (const entry of log) {
      if (!bySite[entry.callSite]) bySite[entry.callSite] = { calls: 0, totalTokens: 0, costUSD: 0 };
      bySite[entry.callSite].calls++;
      bySite[entry.callSite].totalTokens += entry.totalTokens;
      bySite[entry.callSite].costUSD += entry.costUSD;
    }

    return NextResponse.json({
      totals,
      byModel,
      dailyChart,
      bySite,
      recentLog: log.slice(0, 50),
      days,
    });
  }

  // ── VIEW: pending work ──
  if (view === "pending") {
    const pending = await chatStore.getPendingWork(businessId);
    return NextResponse.json({ pending });
  }

  // ── VIEW: chat summaries for a date ──
  if (view === "summaries") {
    const date = req.nextUrl.searchParams.get("date") || todayThai();
    const summaries = await chatStore.getChatSummariesByDate(businessId, date);
    // Also get all summaries if date is "all"
    if (date === "all") {
      const all = await chatStore.getAllChatSummaries(businessId, 200);
      return NextResponse.json({ summaries: all, date });
    }
    return NextResponse.json({ summaries, date });
  }

  // ── VIEW: daily digest ──
  if (view === "daily") {
    const date = req.nextUrl.searchParams.get("date") || todayThai();
    let digest = await chatStore.getDailyDigest(businessId, date);

    // If no cached digest, compute it on-the-fly
    if (!digest) {
      digest = await computeDailyDigest(businessId, date);
      if (digest) {
        await chatStore.saveDailyDigest(digest);
      }
    }

    return NextResponse.json({ digest, date });
  }

  // ── VIEW: per-admin user detail ──
  if (view === "user_detail") {
    const username = req.nextUrl.searchParams.get("username");
    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    const since = req.nextUrl.searchParams.get("since")
      ? parseInt(req.nextUrl.searchParams.get("since")!)
      : Date.now() - 7 * 24 * 60 * 60 * 1000; // default: 7 days

    const [entries, convs] = await Promise.all([
      chatStore.getAdminActivityLog(businessId, { limit: 500, username }),
      chatStore.getConversations(businessId),
    ]);

    const filtered = entries.filter((e) => e.timestamp >= since);

    // Find conversations this admin touched
    const touchedUserIds = new Set(filtered.map((e) => e.userId));
    const touchedConvs = convs.filter((c) => touchedUserIds.has(c.userId));

    // Compute per-day activity
    const byDay: Record<string, { sent: number; toggles: number; pins: number }> = {};
    for (const e of filtered) {
      const day = toThaiDate(e.timestamp);
      if (!byDay[day]) byDay[day] = { sent: 0, toggles: 0, pins: 0 };
      if (e.action === "send" || e.action === "sendFollowup") byDay[day].sent++;
      if (e.action === "toggleBot") byDay[day].toggles++;
      if (e.action === "pin" || e.action === "unpin") byDay[day].pins++;
    }

    // Response time analysis (time between customer msg and admin reply)
    const responseTimes: number[] = [];
    for (const conv of touchedConvs) {
      const msgs = await chatStore.getMessages(businessId, conv.userId);
      const adminMsgs = msgs.filter(
        (m) => m.role === "admin" && m.sentBy === username
      );
      for (const am of adminMsgs) {
        // Find the last customer message before this admin message
        const prevCustomer = [...msgs]
          .filter((m) => m.role === "customer" && m.timestamp < am.timestamp)
          .pop();
        if (prevCustomer) {
          const diffMin = (am.timestamp - prevCustomer.timestamp) / (1000 * 60);
          if (diffMin < 1440) responseTimes.push(diffMin); // ignore > 24h outliers
        }
      }
    }

    const avgResponseMin =
      responseTimes.length > 0
        ? Math.round(
            (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10
          ) / 10
        : 0;

    return NextResponse.json({
      username,
      totalMessages: filtered.filter(
        (e) => e.action === "send" || e.action === "sendFollowup"
      ).length,
      totalConversations: touchedUserIds.size,
      avgResponseMin,
      byDay: Object.entries(byDay)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 14)
        .map(([date, stats]) => ({ date, ...stats })),
      recentActivity: filtered.slice(0, 50),
      conversations: touchedConvs.map((c) => ({
        userId: c.userId,
        displayName: c.displayName,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        pinned: c.pinned,
        botEnabled: c.botEnabled,
        source: c.source,
      })),
    });
  }

  // ── VIEW: users (default) — per-admin summary ──
  const since = req.nextUrl.searchParams.get("since")
    ? parseInt(req.nextUrl.searchParams.get("since")!)
    : Date.now() - 7 * 24 * 60 * 60 * 1000;

  const [stats, log, convs, pending] = await Promise.all([
    chatStore.getAdminStats(businessId, since),
    chatStore.getAdminActivityLog(businessId, { limit: 500 }),
    chatStore.getConversations(businessId),
    chatStore.getPendingWork(businessId),
  ]);

  // Enrich stats with conversation counts and response times
  const enriched: Record<
    string,
    {
      sent: number;
      toggleBot: number;
      pin: number;
      lastActive: number;
      conversationsHandled: number;
      avgResponseMin: number;
      todayMessages: number;
    }
  > = {};

  const todayStart = new Date(todayThai() + "T00:00:00+07:00").getTime();
  const userConvMap: Record<string, Set<string>> = {};

  for (const e of log) {
    if (e.timestamp < since) continue;
    if (!userConvMap[e.username]) userConvMap[e.username] = new Set();
    if (e.userId) userConvMap[e.username].add(e.userId);
  }

  for (const [username, s] of Object.entries(stats)) {
    const todayMsgs = log.filter(
      (e) =>
        e.username === username &&
        e.timestamp >= todayStart &&
        (e.action === "send" || e.action === "sendFollowup")
    ).length;

    enriched[username] = {
      ...s,
      conversationsHandled: userConvMap[username]?.size ?? 0,
      avgResponseMin: 0, // computed lazily in user_detail
      todayMessages: todayMsgs,
    };
  }

  return NextResponse.json({
    users: enriched,
    totalConversations: convs.length,
    totalPending: pending.length,
    highPriorityPending: pending.filter((p) => p.priority === "high").length,
    since,
  });
}

// ── Compute daily digest on-the-fly ──

async function computeDailyDigest(
  businessId: string,
  date: string
): Promise<import("@/lib/chatStore").DailyDigest | null> {
  try {
    const dayStart = new Date(date + "T00:00:00+07:00").getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const [convs, log, summaries] = await Promise.all([
      chatStore.getConversations(businessId),
      chatStore.getAdminActivityLog(businessId, { limit: 1000 }),
      chatStore.getChatSummariesByDate(businessId, date),
    ]);

    // Conversations active on this date
    const activeConvs = convs.filter(
      (c) => c.lastMessageAt >= dayStart && c.lastMessageAt < dayEnd
    );
    const newConvs = convs.filter(
      (c) => c.createdAt >= dayStart && c.createdAt < dayEnd
    );

    // Admin activity for this day
    const dayLog = log.filter(
      (e) => e.timestamp >= dayStart && e.timestamp < dayEnd
    );

    const adminMap: Record<
      string,
      { messagesSent: number; conversationsHandled: Set<string> }
    > = {};
    for (const e of dayLog) {
      if (!adminMap[e.username])
        adminMap[e.username] = { messagesSent: 0, conversationsHandled: new Set() };
      if (e.action === "send" || e.action === "sendFollowup") {
        adminMap[e.username].messagesSent++;
        if (e.userId) adminMap[e.username].conversationsHandled.add(e.userId);
      }
    }

    const adminActivity = Object.entries(adminMap).map(([username, a]) => ({
      username,
      messagesSent: a.messagesSent,
      conversationsHandled: a.conversationsHandled.size,
    }));

    // Topic frequency from summaries
    const topicCount: Record<string, number> = {};
    let resolved = 0, escalated = 0;
    for (const s of summaries) {
      if (s.topic) topicCount[s.topic] = (topicCount[s.topic] || 0) + 1;
      if (s.outcome?.toLowerCase().includes("resolved") || s.sentiment === "positive") resolved++;
      if (s.adminHandled) escalated++;
    }

    const topTopics = Object.entries(topicCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));

    // Pending work
    const pending = await chatStore.getPendingWork(businessId);
    const dayPending = pending.filter(
      (p) => p.lastMessageAt >= dayStart && p.lastMessageAt < dayEnd
    );

    return {
      businessId,
      date,
      totalConversations: activeConvs.length,
      newConversations: newConvs.length,
      resolvedConversations: resolved,
      escalatedConversations: escalated,
      pendingConversations: dayPending.length,
      avgResponseTimeMin: 0,
      topTopics,
      adminActivity,
      pendingWork: dayPending,
      generatedAt: Date.now(),
    };
  } catch (err) {
    console.error("[monitoring] computeDailyDigest error:", err);
    return null;
  }
}
