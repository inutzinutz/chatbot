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
  hourlyContacts: { hour: string; count: number }[];
  platforms: { platform: string; count: number }[];
  pipelineLayerDist: { layer: string; count: number }[];
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

    for (const conv of convs) {
      if (conv.pinned) pinnedCount++;
      if (!conv.botEnabled) botDisabledCount++;
      if (now - conv.lastMessageAt < DAY_MS) activeToday++;
      if (now - conv.lastMessageAt < WEEK_MS) activeThisWeek++;
      if (conv.createdAt && now - conv.createdAt < DAY_MS) newConversationsToday++;

      // Hourly distribution (Thai time, UTC+7)
      const hour = thaiHour(conv.lastMessageAt);
      hourlyCounts[hour]++;

      // Platform
      const platform = conv.source === "line" ? "LINE" : "Web Chat";
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    }

    // ── 3. Sample message counts (up to 200 convs to avoid timeout) ──
    const SAMPLE_LIMIT = 200;
    const sampleConvs = convs.slice(0, SAMPLE_LIMIT);

    // Use Redis pipeline to get LLEN for sampled conversations
    const Redis = (await import("ioredis")).default;
    const g = globalThis as unknown as { __redis?: InstanceType<typeof Redis> };
    const redis = g.__redis;

    let totalMessages = 0;
    let maxMessagesPerConv = 0;
    const layerCounts: Record<string, number> = {};

    if (redis) {
      // Batch LLEN for all sampled convs
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

      // Scale up if we sampled fewer than all convs
      if (totalConversations > SAMPLE_LIMIT) {
        const scaleFactor = totalConversations / SAMPLE_LIMIT;
        totalMessages = Math.round(totalMessages * scaleFactor);
      }

      // ── 4. Sample pipeline layer distribution (up to 50 convs, last 20 msgs each) ──
      const LAYER_SAMPLE = Math.min(50, sampleConvs.length);
      const msgPipeline = redis.pipeline();
      for (let i = 0; i < LAYER_SAMPLE; i++) {
        const conv = sampleConvs[i];
        // Get last 20 messages
        msgPipeline.lrange(`msgs:${businessId}:${conv.userId}`, -20, -1);
      }
      const msgResults = await msgPipeline.exec();

      if (msgResults) {
        for (const [err, rawList] of msgResults) {
          if (err || !Array.isArray(rawList)) continue;
          for (const raw of rawList) {
            try {
              const msg = JSON.parse(raw as string) as ChatMessage;
              if (msg.pipelineLayerName) {
                layerCounts[msg.pipelineLayerName] =
                  (layerCounts[msg.pipelineLayerName] || 0) + 1;
              }
            } catch { /* skip malformed */ }
          }
        }
      }
    }

    const avgMessagesPerConv =
      totalConversations > 0
        ? Math.round((totalMessages / totalConversations) * 10) / 10
        : 0;

    // ── 5. Format output ──
    const hourlyContacts = HOUR_LABELS.map((label, i) => ({
      hour: label,
      count: hourlyCounts[i],
    }));

    const platforms = Object.entries(platformCounts)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);

    const pipelineLayerDist = Object.entries(layerCounts)
      .map(([layer, count]) => ({ layer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

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
      hourlyContacts,
      platforms,
      pipelineLayerDist,
      computedAt: Date.now(),
    };

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[analytics] Error:", err);
    return NextResponse.json(
      { error: "Failed to compute analytics" },
      { status: 500 }
    );
  }
}
