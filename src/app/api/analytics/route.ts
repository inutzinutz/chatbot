/* ------------------------------------------------------------------ */
/*  Analytics API — reads real data from Redis                          */
/*  Node.js runtime (not Edge) so we can use ioredis                   */
/* ------------------------------------------------------------------ */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";
import type { ChatConversation, ChatMessage } from "@/lib/chatStore";

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

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
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

    const Redis = (await import("ioredis")).default;
    const g = globalThis as unknown as { __redis?: InstanceType<typeof Redis> };
    const redis = g.__redis;

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
