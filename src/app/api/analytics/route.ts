/* ------------------------------------------------------------------ */
/*  Analytics API — reads real data from Redis                          */
/*  Node.js runtime (not Edge) so we can use ioredis                   */
/* ------------------------------------------------------------------ */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";
import type { ChatConversation, ChatMessage, ChatSummary } from "@/lib/chatStore";
import { requireAdminSession, unauthorizedResponse } from "@/lib/auth";

// Thai timezone offset: UTC+7
const TH_OFFSET_MS = 7 * 60 * 60 * 1000;

function thaiHour(ts: number): number {
  return new Date(ts + TH_OFFSET_MS).getUTCHours();
}

function thaiDayKey(ts: number): string {
  const d = new Date(ts + TH_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

const HOUR_LABELS = [
  "12 AM","1 AM","2 AM","3 AM","4 AM","5 AM","6 AM","7 AM",
  "8 AM","9 AM","10 AM","11 AM","12 PM","1 PM","2 PM","3 PM",
  "4 PM","5 PM","6 PM","7 PM","8 PM","9 PM","10 PM","11 PM",
];

export interface RealAnalyticsData {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConv: number;
  maxMessagesPerConv: number;
  activeToday: number;
  activeThisWeek: number;
  newConversationsToday: number;
  pinnedCount: number;
  botDisabledCount: number;
  /** Average first response time in seconds (bot or admin, whichever replied first) */
  avgFirstResponseSec: number;
  /** Number of conversations handled by bot only (no admin messages) */
  botHandledCount: number;
  /** Number of conversations where at least one admin message was sent */
  adminHandledCount: number;
  /** Sentiment breakdown from ChatSummary data */
  sentimentDist: { sentiment: string; count: number }[];
  hourlyContacts: { hour: string; count: number }[];
  platforms: { platform: string; count: number }[];
  pipelineLayerDist: { layer: string; count: number }[];
  intentDist: { intent: string; count: number }[];
  dailyNewConvs: { date: string; count: number }[];
  computedAt: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  const view = searchParams.get("view") || "overview";

  // Auth guard
  if (businessId) {
    const session = await requireAdminSession(req, businessId);
    if (!session) return unauthorizedResponse();
  }

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  // ── Redis helper ──
  const Redis = (await import("ioredis")).default;
  const g = globalThis as unknown as { __redis?: InstanceType<typeof Redis> };
  const redis = g.__redis;

  // ════════════════════════════════════════════════
  // VIEW: topics — Conversation topic analysis
  // ════════════════════════════════════════════════
  if (view === "topics") {
    const summaries = await chatStore.getAllChatSummaries(businessId, 300);
    const topicCounts: Record<string, number> = {};
    const keywordCounts: Record<string, number> = {};
    const customerTopics: Record<string, { userId: string; displayName: string; topic: string; count: number }> = {};
    const topicByDay: Record<string, Record<string, number>> = {};

    for (const s of summaries) {
      // Count topics
      const topic = s.topic || "ไม่ระบุ";
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;

      // Extract keywords from keyPoints
      for (const kp of s.keyPoints || []) {
        const words = kp.split(/[\s,\/]+/).filter((w) => w.length > 3);
        for (const w of words) {
          keywordCounts[w] = (keywordCounts[w] || 0) + 1;
        }
      }

      // Customer → most-discussed topic
      if (s.userId) {
        if (!customerTopics[s.userId]) {
          customerTopics[s.userId] = { userId: s.userId, displayName: s.displayName, topic, count: 0 };
        }
        customerTopics[s.userId].count++;
      }

      // Topic by day
      const day = s.conversationDate || "unknown";
      if (!topicByDay[day]) topicByDay[day] = {};
      topicByDay[day][topic] = (topicByDay[day][topic] || 0) + 1;
    }

    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([topic, count]) => ({ topic, count }));

    const topKeywords = Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    const topCustomers = Object.values(customerTopics)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Daily topic trend (last 14 days)
    const now = Date.now();
    const days14: string[] = [];
    for (let i = 13; i >= 0; i--) {
      days14.push(thaiDayKey(now - i * 24 * 60 * 60 * 1000));
    }
    const topicTrend = days14.map((date) => ({
      date: date.slice(5),
      topics: topicByDay[date] || {},
      total: Object.values(topicByDay[date] || {}).reduce((a, b) => a + b, 0),
    }));

    return NextResponse.json({ topTopics, topKeywords, topCustomers, topicTrend, total: summaries.length });
  }

  // ════════════════════════════════════════════════
  // VIEW: sentiment — Customer sentiment tracking
  // ════════════════════════════════════════════════
  if (view === "sentiment") {
    const days = parseInt(searchParams.get("days") || "30");
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const summaries = await chatStore.getAllChatSummaries(businessId, 500);

    const sentCounts = { positive: 0, neutral: 0, negative: 0 };
    const sentByDay: Record<string, { positive: number; neutral: number; negative: number }> = {};
    const negativeCustomers: { userId: string; displayName: string; topic: string; pendingAction?: string; date: string }[] = [];
    const positiveCustomers: { userId: string; displayName: string; topic: string; date: string }[] = [];

    for (const s of summaries) {
      const ts = new Date(s.conversationDate + "T00:00:00+07:00").getTime();
      if (ts < since) continue;

      const sent = (s.sentiment as "positive" | "neutral" | "negative") || "neutral";
      sentCounts[sent]++;

      const day = s.conversationDate;
      if (!sentByDay[day]) sentByDay[day] = { positive: 0, neutral: 0, negative: 0 };
      sentByDay[day][sent]++;

      if (sent === "negative") {
        negativeCustomers.push({ userId: s.userId, displayName: s.displayName, topic: s.topic, pendingAction: s.pendingAction, date: s.conversationDate });
      }
      if (sent === "positive") {
        positiveCustomers.push({ userId: s.userId, displayName: s.displayName, topic: s.topic, date: s.conversationDate });
      }
    }

    // Build daily trend
    const now2 = Date.now();
    const trendDays: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      trendDays.push(thaiDayKey(now2 - i * 24 * 60 * 60 * 1000));
    }
    const sentimentTrend = trendDays.map((date) => ({
      date: date.slice(5),
      ...( sentByDay[date] || { positive: 0, neutral: 0, negative: 0 }),
    }));

    // Sentiment score: (positive - negative) / total * 100
    const total = sentCounts.positive + sentCounts.neutral + sentCounts.negative;
    const score = total > 0 ? Math.round(((sentCounts.positive - sentCounts.negative) / total) * 100) : 0;

    return NextResponse.json({
      sentCounts,
      total,
      score,
      sentimentTrend,
      negativeCustomers: negativeCustomers.slice(0, 30),
      positiveCustomers: positiveCustomers.slice(0, 20),
      days,
    });
  }

  // ════════════════════════════════════════════════
  // VIEW: team — Team performance metrics
  // ════════════════════════════════════════════════
  if (view === "team") {
    const days = parseInt(searchParams.get("days") || "30");
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get admin activity log
    const adminLog = await chatStore.getAdminActivityLog(businessId, { limit: 5000 });
    const convs2: ChatConversation[] = await chatStore.getConversations(businessId);

    // Per-admin stats
    interface AdminPerf {
      username: string;
      messagesSent: number;
      followupsSent: number;
      botToggles: number;
      pins: number;
      conversationsHandled: Set<string>;
      responseTimes: number[]; // ms between customer msg and admin reply
      lastActive: number;
      dailyActivity: Record<string, number>;
    }
    const adminMap: Record<string, AdminPerf> = {};

    for (const entry of adminLog) {
      if (entry.timestamp < since) continue;
      if (!adminMap[entry.username]) {
        adminMap[entry.username] = {
          username: entry.username,
          messagesSent: 0,
          followupsSent: 0,
          botToggles: 0,
          pins: 0,
          conversationsHandled: new Set(),
          responseTimes: [],
          lastActive: 0,
          dailyActivity: {},
        };
      }
      const a = adminMap[entry.username];
      if (entry.action === "send") { a.messagesSent++; a.conversationsHandled.add(entry.userId); }
      if (entry.action === "sendFollowup") { a.followupsSent++; a.conversationsHandled.add(entry.userId); }
      if (entry.action === "toggleBot" || entry.action === "globalToggleBot") a.botToggles++;
      if (entry.action === "pin") a.pins++;
      if (entry.timestamp > a.lastActive) a.lastActive = entry.timestamp;
      const day = thaiDayKey(entry.timestamp);
      a.dailyActivity[day] = (a.dailyActivity[day] || 0) + 1;
    }

    // Calculate response times: for each admin-handled conv, compare customer msg ts vs admin reply ts
    if (redis) {
      const handledConvIds = [...new Set(adminLog.filter(e => e.timestamp >= since && e.action === "send").map(e => e.userId))].slice(0, 80);
      const msgPipeline = redis.pipeline();
      for (const uid of handledConvIds) {
        msgPipeline.lrange(`msgs:${businessId}:${uid}`, 0, 49);
      }
      const msgResults = await msgPipeline.exec();
      if (msgResults) {
        for (let i = 0; i < msgResults.length; i++) {
          const [err, rawList] = msgResults[i];
          if (err || !Array.isArray(rawList)) continue;
          const msgs: ChatMessage[] = rawList.map((r: unknown) => { try { return JSON.parse(r as string) as ChatMessage; } catch { return null; } }).filter(Boolean) as ChatMessage[];
          // Find admin messages and match with preceding customer messages
          for (let j = 1; j < msgs.length; j++) {
            const m = msgs[j];
            if (m.role !== "admin") continue;
            const prev = msgs.slice(0, j).reverse().find(p => p.role === "customer");
            if (!prev) continue;
            const diffMs = m.timestamp - prev.timestamp;
            if (diffMs > 0 && diffMs < 24 * 3600 * 1000) {
              // Associate with admin who sent it (from adminLog)
              const matchEntry = adminLog.find(e => e.userId === handledConvIds[i] && Math.abs(e.timestamp - m.timestamp) < 30000 && e.action === "send");
              if (matchEntry && adminMap[matchEntry.username]) {
                adminMap[matchEntry.username].responseTimes.push(diffMs);
              }
            }
          }
        }
      }
    }

    // Bot-only vs admin-handled conv counts
    let botOnly = 0, adminHandled = 0;
    for (const conv of convs2) {
      const hasAdminEntry = adminLog.some(e => e.userId === conv.userId && e.timestamp >= since);
      if (hasAdminEntry) adminHandled++; else botOnly++;
    }

    // Format team output
    const team = Object.values(adminMap).map((a) => {
      const avgResponseMs = a.responseTimes.length > 0
        ? a.responseTimes.reduce((s, v) => s + v, 0) / a.responseTimes.length
        : null;
      // Build last 14 days activity array
      const now3 = Date.now();
      const activityDays = Array.from({ length: 14 }, (_, i) => {
        const d = thaiDayKey(now3 - (13 - i) * 24 * 60 * 60 * 1000);
        return { date: d.slice(5), count: a.dailyActivity[d] || 0 };
      });
      return {
        username: a.username,
        messagesSent: a.messagesSent,
        followupsSent: a.followupsSent,
        botToggles: a.botToggles,
        pins: a.pins,
        conversationsHandled: a.conversationsHandled.size,
        avgResponseMinutes: avgResponseMs !== null ? Math.round(avgResponseMs / 60000 * 10) / 10 : null,
        lastActive: a.lastActive,
        activityDays,
      };
    }).sort((a, b) => b.messagesSent - a.messagesSent);

    // Daily team total messages
    const now4 = Date.now();
    const teamDailyTrend = Array.from({ length: 14 }, (_, i) => {
      const d = thaiDayKey(now4 - (13 - i) * 24 * 60 * 60 * 1000);
      const total = Object.values(adminMap).reduce((s, a) => s + (a.dailyActivity[d] || 0), 0);
      return { date: d.slice(5), total };
    });

    return NextResponse.json({ team, botOnly, adminHandled, teamDailyTrend, days });
  }

  try {
    // ── 1. Get all conversations ──
    const convs: ChatConversation[] = await chatStore.getConversations(businessId);
    const totalConversations = convs.length;

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const WEEK_MS = 7 * DAY_MS;

    // ── 2. Aggregate conversation-level stats ──
    let pinnedCount = 0;
    let botDisabledCount = 0;
    let activeToday = 0;
    let activeThisWeek = 0;
    let newConversationsToday = 0;

    const hourlyCounts = new Array(24).fill(0);
    const platformCounts: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};

    // Pre-fill last 7 days
    for (let i = 6; i >= 0; i--) {
      const key = thaiDayKey(now - i * DAY_MS);
      dailyCounts[key] = 0;
    }

    for (const conv of convs) {
      if (conv.pinned) pinnedCount++;
      if (!conv.botEnabled) botDisabledCount++;
      if (now - conv.lastMessageAt < DAY_MS) activeToday++;
      if (now - conv.lastMessageAt < WEEK_MS) activeThisWeek++;

      const createdAt = conv.createdAt ?? conv.lastMessageAt;
      if (now - createdAt < DAY_MS) newConversationsToday++;

      // Daily new conversations (last 7 days)
      const dayKey = thaiDayKey(createdAt);
      if (dayKey in dailyCounts) dailyCounts[dayKey]++;

      // Hourly distribution (Thai time, UTC+7)
      const hour = thaiHour(conv.lastMessageAt);
      hourlyCounts[hour]++;

      // Platform
      const platform = conv.source === "line" ? "LINE" : "Web Chat";
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    }

    // ── 3. Sample message counts + intent/layer/response-time/bot-vs-admin data ──
    const SAMPLE_LIMIT = 200;
    const sampleConvs = convs.slice(0, SAMPLE_LIMIT);

    let totalMessages = 0;
    let maxMessagesPerConv = 0;
    const layerCounts: Record<string, number> = {};
    const intentCounts: Record<string, number> = {};

    // Response time + bot-vs-admin tracking
    let firstResponseSumSec = 0;
    let firstResponseCount = 0;
    let botHandledCount = 0;
    let adminHandledCount = 0;

    // Sentiment from ChatSummary (sample up to 100 most recent)
    const sentimentCounts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };

    if (redis) {
      // Batch LLEN
      const llenPipeline = redis.pipeline();
      for (const conv of sampleConvs) {
        llenPipeline.llen(`msgs:${businessId}:${conv.userId}`);
      }
      const llenResults = await llenPipeline.exec();
      if (llenResults) {
        for (const [err, count] of llenResults) {
          if (!err && typeof count === "number") {
            totalMessages += count;
            if (count > maxMessagesPerConv) maxMessagesPerConv = count;
          }
        }
      }
      if (totalConversations > SAMPLE_LIMIT) {
        totalMessages = Math.round(totalMessages * (totalConversations / SAMPLE_LIMIT));
      }

      // Sample first 30 messages per conv for layer/intent/response-time/bot-vs-admin
      // Use LRANGE 0..29 (first messages) to get response time context
      const LAYER_SAMPLE = Math.min(50, sampleConvs.length);
      const msgPipeline = redis.pipeline();
      for (let i = 0; i < LAYER_SAMPLE; i++) {
        msgPipeline.lrange(`msgs:${businessId}:${sampleConvs[i].userId}`, 0, 29);
      }
      const msgResults = await msgPipeline.exec();
      if (msgResults) {
        for (const [err, rawList] of msgResults) {
          if (err || !Array.isArray(rawList)) continue;
          const msgs: ChatMessage[] = [];
          for (const raw of rawList) {
            try {
              msgs.push(JSON.parse(raw as string) as ChatMessage);
            } catch { /* skip */ }
          }

          // Pipeline layer + intent from bot messages
          for (const msg of msgs) {
            if (msg.pipelineLayerName) {
              layerCounts[msg.pipelineLayerName] = (layerCounts[msg.pipelineLayerName] || 0) + 1;
            }
            if (msg.pipelineLayerName?.startsWith("Intent:")) {
              const intentName = msg.pipelineLayerName.replace("Intent:", "").trim();
              intentCounts[intentName] = (intentCounts[intentName] || 0) + 1;
            }
          }

          // First response time: time between first customer msg and first bot/admin reply
          const firstCustomer = msgs.find((m) => m.role === "customer");
          const firstReply = msgs.find(
            (m) => m.role !== "customer" && m.timestamp > (firstCustomer?.timestamp ?? 0)
          );
          if (firstCustomer && firstReply) {
            const diffSec = (firstReply.timestamp - firstCustomer.timestamp) / 1000;
            if (diffSec >= 0 && diffSec < 3600) {
              // ignore outliers > 1h (likely stale conversations)
              firstResponseSumSec += diffSec;
              firstResponseCount++;
            }
          }

          // Bot vs admin: any admin role message → admin handled
          const hasAdmin = msgs.some((m) => m.role === "admin");
          if (hasAdmin) {
            adminHandledCount++;
          } else {
            botHandledCount++;
          }
        }
      }

      // Scale bot/admin counts to full dataset
      if (LAYER_SAMPLE > 0 && totalConversations > LAYER_SAMPLE) {
        const scale = totalConversations / LAYER_SAMPLE;
        botHandledCount = Math.round(botHandledCount * scale);
        adminHandledCount = Math.round(adminHandledCount * scale);
      }

      // Sentiment: read ChatSummaries for last 100 conversations
      const summaryPipeline = redis.pipeline();
      const sumSample = convs.slice(0, 100);
      for (const conv of sumSample) {
        summaryPipeline.get(`chatsum:${businessId}:${conv.userId}`);
      }
      const summaryResults = await summaryPipeline.exec();
      if (summaryResults) {
        for (const [err, raw] of summaryResults) {
          if (err || !raw || typeof raw !== "string") continue;
          try {
            const s = JSON.parse(raw) as { sentiment?: string };
            if (s.sentiment === "positive" || s.sentiment === "neutral" || s.sentiment === "negative") {
              sentimentCounts[s.sentiment]++;
            }
          } catch { /* skip */ }
        }
      }
    }

    const avgMessagesPerConv =
      totalConversations > 0 ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0;
    const avgFirstResponseSec =
      firstResponseCount > 0
        ? Math.round((firstResponseSumSec / firstResponseCount) * 10) / 10
        : 0;

    // ── 4. Format output ──
    const hourlyContacts = HOUR_LABELS.map((label, i) => ({ hour: label, count: hourlyCounts[i] }));
    const platforms = Object.entries(platformCounts)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);
    const pipelineLayerDist = Object.entries(layerCounts)
      .map(([layer, count]) => ({ layer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
    const intentDist = Object.entries(intentCounts)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const dailyNewConvs = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count })); // "MM-DD"

    const sentimentDist = Object.entries(sentimentCounts)
      .map(([sentiment, count]) => ({ sentiment, count }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);

    const result: RealAnalyticsData = {
      totalConversations,
      totalMessages,
      avgMessagesPerConv,
      maxMessagesPerConv,
      activeToday,
      activeThisWeek,
      newConversationsToday,
      pinnedCount,
      botDisabledCount,
      avgFirstResponseSec,
      botHandledCount,
      adminHandledCount,
      sentimentDist,
      hourlyContacts,
      platforms,
      pipelineLayerDist,
      intentDist,
      dailyNewConvs,
      computedAt: Date.now(),
    };

    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[analytics] Error:", err);
    return NextResponse.json({ error: "Failed to compute analytics" }, { status: 500 });
  }
}
