"use client";

import { useState, useEffect, useCallback } from "react";
import type { RealAnalyticsData } from "@/app/api/analytics/route";
import {
  Users,
  MessageSquare,
  Flame,
  TrendingUp,
  BarChart3,
  Globe,
  Clock,
  Layers,
  RefreshCw,
  Pin,
  BotOff,
  CalendarDays,
  Activity,
} from "lucide-react";

// ── Sub-components ──────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-600",
    green: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600",
    purple: "from-purple-50 to-purple-100 border-purple-200 text-purple-600",
    orange: "from-orange-50 to-orange-100 border-orange-200 text-orange-600",
    indigo: "from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-600",
    violet: "from-violet-50 to-violet-100 border-violet-200 text-violet-600",
    rose: "from-rose-50 to-rose-100 border-rose-200 text-rose-600",
    amber: "from-amber-50 to-amber-100 border-amber-200 text-amber-600",
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`bg-gradient-to-br ${c} rounded-xl p-5 border transition-transform hover:scale-[1.02]`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-[11px] opacity-70 mt-0.5">{sub}</p>
        </div>
        <Icon className="h-5 w-5 opacity-60" />
      </div>
    </div>
  );
}

function BarChartSimple({
  data,
  labelKey,
  valueKey,
  color = "#6366f1",
  maxBars = 10,
}: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  color?: string;
  maxBars?: number;
}) {
  const sliced = data.slice(0, maxBars);
  const max = Math.max(...sliced.map((d) => Number(d[valueKey]) || 0));

  return (
    <div className="space-y-2">
      {sliced.map((item, i) => {
        const val = Number(item[valueKey]) || 0;
        const pct = max > 0 ? (val / max) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-32 truncate text-right shrink-0">
              {String(item[labelKey])}
            </span>
            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-12 text-right">
              {val.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HourlyChart({ data }: { data: { hour: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-[3px] h-32">
      {data.map((d, i) => {
        const pct = max > 0 ? (d.count / max) * 100 : 0;
        return (
          <div
            key={i}
            className="flex-1 group relative flex flex-col items-center"
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {d.hour}: {d.count}
            </div>
            <div
              className="w-full rounded-t-sm bg-blue-400 hover:bg-blue-500 transition-colors cursor-default"
              style={{ height: `${pct}%`, minHeight: "2px" }}
            />
          </div>
        );
      })}
    </div>
  );
}

function PlatformPills({
  data,
}: {
  data: { platform: string; count: number }[];
}) {
  const total = data.reduce((a, b) => a + b.count, 0);
  const colors: Record<string, string> = {
    LINE: "bg-green-500",
    "Web Chat": "bg-indigo-500",
    FACEBOOK: "bg-blue-500",
    WHATS_APP: "bg-emerald-500",
  };

  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : "0";
        return (
          <div key={d.platform} className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${colors[d.platform] || "bg-gray-400"}`}
            />
            <span className="text-sm font-medium text-gray-700 flex-1">
              {d.platform}
            </span>
            <span className="text-sm text-gray-500">
              {d.count.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 w-12 text-right">
              {pct}%
            </span>
          </div>
        );
      })}
      {data.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">ไม่มีข้อมูล</p>
      )}
    </div>
  );
}

// ── Skeleton loader ──────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className ?? ""}`} />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export default function AnalyticsDashboard({ businessId }: { businessId: string }) {
  const [data, setData] = useState<RealAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/analytics?businessId=${encodeURIComponent(businessId)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json as RealAnalyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId]);

  // Initial load
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchAnalytics(), 60_000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const lastUpdated = data
    ? new Date(data.computedAt).toLocaleTimeString("th-TH")
    : null;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              ข้อมูลจริงจาก Redis
              {lastUpdated && (
                <span className="ml-2 text-gray-400">· อัปเดต {lastUpdated}</span>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            เกิดข้อผิดพลาด: {error} —{" "}
            <button
              onClick={() => fetchAnalytics(true)}
              className="underline font-medium"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && <DashboardSkeleton />}

        {/* Data */}
        {data && (
          <>
            {/* ── Row 1: Stat Cards (8 cards, 2 rows on mobile, 4 cols on desktop) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Users}
                label="บทสนทนาทั้งหมด"
                value={data.totalConversations.toLocaleString()}
                sub="unique users"
                color="blue"
              />
              <StatCard
                icon={MessageSquare}
                label="ข้อความทั้งหมด"
                value={data.totalMessages.toLocaleString()}
                sub="รวมทุก conversation"
                color="indigo"
              />
              <StatCard
                icon={TrendingUp}
                label="เฉลี่ยต่อการสนทนา"
                value={data.avgMessagesPerConv}
                sub="ข้อความ / บทสนทนา"
                color="green"
              />
              <StatCard
                icon={Flame}
                label="สูงสุด"
                value={data.maxMessagesPerConv.toLocaleString()}
                sub="ข้อความในบทสนทนาเดียว"
                color="orange"
              />
              <StatCard
                icon={Activity}
                label="Active วันนี้"
                value={data.activeToday.toLocaleString()}
                sub="ใน 24 ชั่วโมงที่ผ่านมา"
                color="emerald"
              />
              <StatCard
                icon={CalendarDays}
                label="Active สัปดาห์นี้"
                value={data.activeThisWeek.toLocaleString()}
                sub="ใน 7 วันที่ผ่านมา"
                color="violet"
              />
              <StatCard
                icon={Pin}
                label="Pinned (Escalated)"
                value={data.pinnedCount.toLocaleString()}
                sub="รอ admin ตอบ"
                color="rose"
              />
              <StatCard
                icon={BotOff}
                label="Bot ปิดอยู่"
                value={data.botDisabledCount.toLocaleString()}
                sub="บทสนทนาที่ปิด bot"
                color="amber"
              />
            </div>

            {/* ── Row 2: Hourly Contact Pattern ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  รูปแบบเวลาติดต่อ (เวลาไทย UTC+7)
                </h3>
              </div>
              <HourlyChart data={data.hourlyContacts} />
              <div className="flex justify-between mt-2 text-[9px] text-gray-400 px-1">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>
            </div>

            {/* ── Row 3: Platform + Pipeline Layer ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Platform Distribution
                  </h3>
                </div>
                <PlatformPills data={data.platforms} />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Pipeline Layer ที่ตอบ
                  </h3>
                  <span className="text-[10px] text-gray-400 ml-auto">
                    จาก sample ข้อความล่าสุด
                  </span>
                </div>
                {data.pipelineLayerDist.length > 0 ? (
                  <BarChartSimple
                    data={data.pipelineLayerDist as unknown as Record<string, unknown>[]}
                    labelKey="layer"
                    valueKey="count"
                    color="#6366f1"
                  />
                ) : (
                  <p className="text-xs text-gray-400 text-center py-8">
                    ยังไม่มีข้อมูล pipeline layer
                    <br />
                    (ต้องมีข้อความที่บันทึก pipelineLayerName)
                  </p>
                )}
              </div>
            </div>

            {/* ── Row 4: New Conversations Today ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-semibold text-gray-900">
                    บทสนทนาใหม่วันนี้
                  </span>
                </div>
                <span className="text-2xl font-bold text-orange-600">
                  {data.newConversationsToday.toLocaleString()}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
