"use client";

import { useState, useEffect, useCallback } from "react";
import type { RealAnalyticsData } from "@/app/api/analytics/route";
import {
  Users, MessageSquare, Flame, TrendingUp, BarChart3,
  Globe, Clock, Layers, RefreshCw, Pin, BotOff,
  CalendarDays, Activity, Target,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    blue:   "from-blue-50 to-blue-100 border-blue-200 text-blue-600",
    green:  "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600",
    purple: "from-purple-50 to-purple-100 border-purple-200 text-purple-600",
    orange: "from-orange-50 to-orange-100 border-orange-200 text-orange-600",
    indigo: "from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-600",
    violet: "from-violet-50 to-violet-100 border-violet-200 text-violet-600",
    rose:   "from-rose-50 to-rose-100 border-rose-200 text-rose-600",
    amber:  "from-amber-50 to-amber-100 border-amber-200 text-amber-600",
    emerald:"from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600",
    teal:   "from-teal-50 to-teal-100 border-teal-200 text-teal-600",
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`bg-gradient-to-br ${c} rounded-xl p-5 border transition-transform hover:scale-[1.02]`}>
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

function HbarChart({ data, labelKey, valueKey, color = "#6366f1", maxBars = 10 }: {
  data: Record<string, unknown>[]; labelKey: string; valueKey: string;
  color?: string; maxBars?: number;
}) {
  const sliced = data.slice(0, maxBars);
  const max = Math.max(...sliced.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="space-y-2">
      {sliced.map((item, i) => {
        const val = Number(item[valueKey]) || 0;
        const pct = (val / max) * 100;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-36 truncate text-right shrink-0">
              {String(item[labelKey])}
            </span>
            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-10 text-right">
              {val.toLocaleString()}
            </span>
          </div>
        );
      })}
      {sliced.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-6">ยังไม่มีข้อมูล</p>
      )}
    </div>
  );
}

function HourlyChart({ data }: { data: { hour: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-[3px] h-32">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        return (
          <div key={i} className="flex-1 group relative flex flex-col items-center">
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

function DailyTrendChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        return (
          <div key={i} className="flex-1 group relative flex flex-col items-center gap-1">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {d.date}: {d.count}
            </div>
            <div
              className="w-full rounded-t bg-emerald-400 hover:bg-emerald-500 transition-colors cursor-default"
              style={{ height: `${pct}%`, minHeight: "4px" }}
            />
            <span className="text-[9px] text-gray-400">{d.date.slice(-2)}</span>
          </div>
        );
      })}
    </div>
  );
}

function PlatformPills({ data }: { data: { platform: string; count: number }[] }) {
  const total = data.reduce((a, b) => a + b.count, 0);
  const colors: Record<string, string> = {
    LINE: "bg-green-500",
    "Web Chat": "bg-indigo-500",
    FACEBOOK: "bg-blue-600",
  };
  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : "0";
        return (
          <div key={d.platform} className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${colors[d.platform] || "bg-gray-400"}`} />
            <span className="text-sm font-medium text-gray-700 flex-1">{d.platform}</span>
            <span className="text-sm text-gray-500">{d.count.toLocaleString()}</span>
            <span className="text-xs text-gray-400 w-12 text-right">{pct}%</span>
          </div>
        );
      })}
      {data.length === 0 && <p className="text-xs text-gray-400 text-center py-4">ไม่มีข้อมูล</p>}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ""}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-48" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────

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
      const res = await fetch(`/api/analytics?businessId=${encodeURIComponent(businessId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json() as RealAnalyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
  useEffect(() => {
    const t = setInterval(() => fetchAnalytics(), 60_000);
    return () => clearInterval(t);
  }, [fetchAnalytics]);

  const lastUpdated = data
    ? new Date(data.computedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : null;

  // Escalation rate = botDisabled / total
  const escalationRate = data && data.totalConversations > 0
    ? ((data.botDisabledCount / data.totalConversations) * 100).toFixed(1)
    : "0";
  const activeRate = data && data.totalConversations > 0
    ? ((data.activeThisWeek / data.totalConversations) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Analytics Dashboard
          </h2>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">อัพเดตล่าสุด {lastUpdated} น.</p>
          )}
        </div>
        <button
          onClick={() => fetchAnalytics(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          รีเฟรช
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          เกิดข้อผิดพลาด: {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && <DashboardSkeleton />}

      {/* Content */}
      {!loading && data && (
        <>
          {/* Row 1: 8 stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users}         label="Conversations ทั้งหมด" value={data.totalConversations.toLocaleString()} sub="ทุกเวลา" color="blue" />
            <StatCard icon={MessageSquare} label="Messages ทั้งหมด"      value={data.totalMessages.toLocaleString()}    sub={`เฉลี่ย ${data.avgMessagesPerConv} msg/conv`} color="indigo" />
            <StatCard icon={Flame}         label="Active วันนี้"          value={data.activeToday.toLocaleString()}      sub="ใน 24 ชั่วโมงล่าสุด" color="orange" />
            <StatCard icon={TrendingUp}    label="Active สัปดาห์นี้"       value={data.activeThisWeek.toLocaleString()}   sub="ใน 7 วันล่าสุด" color="green" />
            <StatCard icon={CalendarDays}  label="บทสนทนาใหม่วันนี้"      value={data.newConversationsToday.toLocaleString()} sub="เริ่มวันนี้" color="teal" />
            <StatCard icon={Pin}           label="Pinned"                 value={data.pinnedCount.toLocaleString()}      sub="ถูก pin ไว้" color="amber" />
            <StatCard icon={BotOff}        label="Bot Disabled"           value={data.botDisabledCount.toLocaleString()} sub={`${escalationRate}% ของทั้งหมด`} color="rose" />
            <StatCard icon={Activity}      label="Active Rate (7d)"       value={`${activeRate}%`}                       sub="สัดส่วน active ต่อทั้งหมด" color="violet" />
          </div>

          {/* Row 2: Daily trend + Hourly pattern */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-emerald-500" />
                บทสนทนาใหม่ 7 วันล่าสุด
              </h3>
              <DailyTrendChart data={data.dailyNewConvs} />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                การติดต่อรายชั่วโมง (Thai Time)
              </h3>
              <HourlyChart data={data.hourlyContacts} />
              <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
              </div>
            </div>
          </div>

          {/* Row 3: Intent breakdown + Pipeline layer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                Top Intents (จาก {Math.min(50, data.totalConversations)} conv ล่าสุด)
              </h3>
              <HbarChart
                data={data.intentDist as Record<string, unknown>[]}
                labelKey="intent"
                valueKey="count"
                color="#a855f7"
                maxBars={8}
              />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-500" />
                Pipeline Layer Distribution
              </h3>
              <HbarChart
                data={data.pipelineLayerDist as Record<string, unknown>[]}
                labelKey="layer"
                valueKey="count"
                color="#6366f1"
                maxBars={8}
              />
            </div>
          </div>

          {/* Row 4: Platform + Quick summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Globe className="h-4 w-4 text-green-500" />
                แพลตฟอร์ม
              </h3>
              <PlatformPills data={data.platforms} />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-orange-500" />
                Quick Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">อัตรา Escalation</span>
                  <span className="text-sm font-bold text-rose-600">{escalationRate}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Bot Disabled</span>
                  <span className="text-sm font-bold text-gray-800">{data.botDisabledCount} conv</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Active Rate (7d)</span>
                  <span className="text-sm font-bold text-emerald-600">{activeRate}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Pinned Conversations</span>
                  <span className="text-sm font-bold text-amber-600">{data.pinnedCount}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Max msg/conv</span>
                  <span className="text-sm font-bold text-indigo-600">{data.maxMessagesPerConv}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
