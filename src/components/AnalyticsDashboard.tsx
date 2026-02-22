"use client";

import { useState, useEffect, useCallback } from "react";
import type { RealAnalyticsData } from "@/app/api/analytics/route";
import { Spinner } from "@/components/ui";
import {
  Users, MessageSquare, Flame, TrendingUp, BarChart3,
  Globe, Clock, Layers, RefreshCw, Pin, BotOff,
  CalendarDays, Activity, Target, Hash, Smile, Frown,
  Meh, Trophy, Timer, CheckCircle, UserCheck, Zap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────
// Shared chart/card primitives
// ─────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    blue:    "from-blue-50 to-blue-100 border-blue-200 text-blue-600",
    green:   "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600",
    purple:  "from-purple-50 to-purple-100 border-purple-200 text-purple-600",
    orange:  "from-orange-50 to-orange-100 border-orange-200 text-orange-600",
    indigo:  "from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-600",
    violet:  "from-violet-50 to-violet-100 border-violet-200 text-violet-600",
    rose:    "from-rose-50 to-rose-100 border-rose-200 text-rose-600",
    amber:   "from-amber-50 to-amber-100 border-amber-200 text-amber-600",
    emerald: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600",
    teal:    "from-teal-50 to-teal-100 border-teal-200 text-teal-600",
    cyan:    "from-cyan-50 to-cyan-100 border-cyan-200 text-cyan-600",
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
            <span className="text-xs text-gray-500 w-36 truncate text-right shrink-0">{String(item[labelKey])}</span>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-10 text-right">{val.toLocaleString()}</span>
          </div>
        );
      })}
      {sliced.length === 0 && <p className="text-xs text-gray-400 text-center py-6">ยังไม่มีข้อมูล</p>}
    </div>
  );
}

function HourlyChart({ data }: { data: { hour: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-[3px] h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 group relative flex flex-col items-center">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            {d.hour}: {d.count}
          </div>
          <div className="w-full rounded-t-sm bg-blue-400 hover:bg-blue-500 transition-colors cursor-default"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: "2px" }} />
        </div>
      ))}
    </div>
  );
}

function DailyTrendChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex-1 group relative flex flex-col items-center gap-1">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
            {d.date}: {d.count}
          </div>
          <div className="w-full rounded-t bg-emerald-400 hover:bg-emerald-500 transition-colors cursor-default"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: "4px" }} />
          <span className="text-[9px] text-gray-400">{d.date.slice(-2)}</span>
        </div>
      ))}
    </div>
  );
}

function SentimentBar({ data }: { data: { date: string; positive: number; neutral: number; negative: number }[] }) {
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((d, i) => {
        const total = d.positive + d.neutral + d.negative || 1;
        const pp = (d.positive / total) * 100;
        const np = (d.neutral / total) * 100;
        const neg = (d.negative / total) * 100;
        return (
          <div key={i} className="flex-1 group relative flex flex-col items-center gap-0.5">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
              {d.date} +{d.positive} ~{d.neutral} -{d.negative}
            </div>
            <div className="w-full flex flex-col gap-px" style={{ height: 96 }}>
              <div className="bg-green-400 rounded-t" style={{ height: `${pp}%` }} />
              <div className="bg-gray-300" style={{ height: `${np}%` }} />
              <div className="bg-red-400 rounded-b" style={{ height: `${neg}%` }} />
            </div>
            <span className="text-[8px] text-gray-400">{d.date.slice(-2)}</span>
          </div>
        );
      })}
    </div>
  );
}

function TeamSparkline({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(...days.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-px h-8 w-24">
      {days.map((d, i) => (
        <div key={i} className="flex-1 bg-indigo-300 rounded-sm" style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }} />
      ))}
    </div>
  );
}

function PlatformPills({ data }: { data: { platform: string; count: number }[] }) {
  const total = data.reduce((a, b) => a + b.count, 0);
  const colors: Record<string, string> = { LINE: "bg-green-500", "Web Chat": "bg-indigo-500", FACEBOOK: "bg-blue-600" };
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.platform} className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${colors[d.platform] || "bg-gray-400"}`} />
          <span className="text-sm font-medium text-gray-700 flex-1">{d.platform}</span>
          <span className="text-sm text-gray-500">{d.count.toLocaleString()}</span>
          <span className="text-xs text-gray-400 w-12 text-right">
            {total > 0 ? ((d.count / total) * 100).toFixed(1) : "0"}%
          </span>
        </div>
      ))}
      {data.length === 0 && <p className="text-xs text-gray-400 text-center py-4">ไม่มีข้อมูล</p>}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ""}`} />;
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">{icon}{title}</h3>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: RealAnalyticsData }) {
  const escalationRate = data.totalConversations > 0
    ? ((data.botDisabledCount / data.totalConversations) * 100).toFixed(1) : "0";
  const activeRate = data.totalConversations > 0
    ? ((data.activeThisWeek / data.totalConversations) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}         label="Conversations ทั้งหมด" value={data.totalConversations.toLocaleString()} sub="ทุกเวลา" color="blue" />
        <StatCard icon={MessageSquare} label="Messages ทั้งหมด"      value={data.totalMessages.toLocaleString()} sub={`เฉลี่ย ${data.avgMessagesPerConv} msg/conv`} color="indigo" />
        <StatCard icon={Flame}         label="Active วันนี้"          value={data.activeToday.toLocaleString()} sub="24 ชั่วโมงล่าสุด" color="orange" />
        <StatCard icon={TrendingUp}    label="Active สัปดาห์นี้"       value={data.activeThisWeek.toLocaleString()} sub="7 วันล่าสุด" color="green" />
        <StatCard icon={CalendarDays}  label="บทสนทนาใหม่วันนี้"      value={data.newConversationsToday.toLocaleString()} sub="เริ่มวันนี้" color="teal" />
        <StatCard icon={Pin}           label="Pinned"                 value={data.pinnedCount.toLocaleString()} sub="ถูก pin ไว้" color="amber" />
        <StatCard icon={BotOff}        label="Bot Disabled"           value={data.botDisabledCount.toLocaleString()} sub={`${escalationRate}% ของทั้งหมด`} color="rose" />
        <StatCard icon={Activity}      label="Active Rate (7d)"       value={`${activeRate}%`} sub="สัดส่วน active" color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="บทสนทนาใหม่ 7 วันล่าสุด" icon={<CalendarDays className="h-4 w-4 text-emerald-500" />}>
          <DailyTrendChart data={data.dailyNewConvs} />
        </Card>
        <Card title="การติดต่อรายชั่วโมง (Thai Time)" icon={<Clock className="h-4 w-4 text-blue-500" />}>
          <HourlyChart data={data.hourlyContacts} />
          <div className="flex justify-between text-[9px] text-gray-400 mt-1">
            <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title={`Top Intents (จาก ${Math.min(50, data.totalConversations)} conv ล่าสุด)`} icon={<Target className="h-4 w-4 text-purple-500" />}>
          <HbarChart data={data.intentDist as Record<string, unknown>[]} labelKey="intent" valueKey="count" color="#a855f7" maxBars={8} />
        </Card>
        <Card title="Pipeline Layer Distribution" icon={<Layers className="h-4 w-4 text-indigo-500" />}>
          <HbarChart data={data.pipelineLayerDist as Record<string, unknown>[]} labelKey="layer" valueKey="count" color="#6366f1" maxBars={8} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="แพลตฟอร์ม" icon={<Globe className="h-4 w-4 text-green-500" />}>
          <PlatformPills data={data.platforms} />
        </Card>
        <Card title="Quick Summary" icon={<BarChart3 className="h-4 w-4 text-orange-500" />}>
          <div className="space-y-3">
            {[
              ["อัตรา Escalation", `${escalationRate}%`, "text-rose-600"],
              ["Bot Disabled", `${data.botDisabledCount} conv`, "text-gray-800"],
              ["Active Rate (7d)", `${activeRate}%`, "text-emerald-600"],
              ["Pinned Conversations", String(data.pinnedCount), "text-amber-600"],
              ["Max msg/conv", String(data.maxMessagesPerConv), "text-indigo-600"],
            ].map(([label, val, cls]) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{label}</span>
                <span className={`text-sm font-bold ${cls}`}>{val}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Topics Tab
// ─────────────────────────────────────────────────────────

interface TopicsData {
  topTopics: { topic: string; count: number }[];
  topKeywords: { word: string; count: number }[];
  topCustomers: { userId: string; displayName: string; topic: string; count: number }[];
  topicTrend: { date: string; total: number; topics: Record<string, number> }[];
  total: number;
}

function TopicsTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<TopicsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?businessId=${businessId}&view=topics`)
      .then((r) => r.json())
      .then((d) => setData(d as TopicsData))
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  if (!data) return <p className="text-sm text-gray-400 text-center py-16">ไม่มีข้อมูล</p>;

  // Trend bar
  const maxTrend = Math.max(...data.topicTrend.map((d) => d.total), 1);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Hash}    label="จำนวน Topic ที่พบ"        value={data.topTopics.length} sub={`จาก ${data.total} บทสนทนา`} color="purple" />
        <StatCard icon={Target}  label="Topic ยอดนิยมอันดับ 1"    value={data.topTopics[0]?.topic || "—"} sub={`${data.topTopics[0]?.count || 0} ครั้ง`} color="indigo" />
        <StatCard icon={Users}   label="คีย์เวิร์ดที่พบ"           value={data.topKeywords.length} sub="จาก AI summaries" color="teal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Topics */}
        <Card title="Topics ที่พูดถึงบ่อยที่สุด" icon={<Hash className="h-4 w-4 text-purple-500" />}>
          <HbarChart data={data.topTopics as Record<string, unknown>[]} labelKey="topic" valueKey="count" color="#a855f7" maxBars={12} />
        </Card>

        {/* Top Keywords */}
        <Card title="คีย์เวิร์ดที่พบบ่อย" icon={<Zap className="h-4 w-4 text-amber-500" />}>
          <div className="flex flex-wrap gap-2">
            {data.topKeywords.slice(0, 30).map((kw, i) => {
              const opacity = Math.max(0.4, kw.count / (data.topKeywords[0]?.count || 1));
              return (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
                  style={{ opacity }}>
                  {kw.word}
                  <span className="text-[10px] text-amber-400">{kw.count}</span>
                </span>
              );
            })}
            {data.topKeywords.length === 0 && <p className="text-xs text-gray-400">ยังไม่มี AI summaries</p>}
          </div>
        </Card>
      </div>

      {/* Topic trend */}
      <Card title="แนวโน้ม Topic รายวัน (14 วันล่าสุด)" icon={<TrendingUp className="h-4 w-4 text-indigo-500" />}>
        <div className="flex items-end gap-1 h-24">
          {data.topicTrend.map((d, i) => (
            <div key={i} className="flex-1 group relative flex flex-col items-center gap-1">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                {d.date}: {d.total} บทสนทนา
              </div>
              <div className="w-full rounded-t bg-purple-400 hover:bg-purple-500 transition-colors"
                style={{ height: `${(d.total / maxTrend) * 100}%`, minHeight: 4 }} />
              <span className="text-[8px] text-gray-400">{d.date.slice(-2)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Customers who talked most */}
      <Card title="ลูกค้าที่พูดถึง Topic บ่อยที่สุด" icon={<Users className="h-4 w-4 text-blue-500" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="text-left pb-2 font-medium">#</th>
                <th className="text-left pb-2 font-medium">ลูกค้า</th>
                <th className="text-left pb-2 font-medium">Topic ล่าสุด</th>
                <th className="text-right pb-2 font-medium">บทสนทนา</th>
              </tr>
            </thead>
            <tbody>
              {data.topCustomers.slice(0, 15).map((c, i) => (
                <tr key={c.userId} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-400 text-xs">{i + 1}</td>
                  <td className="py-2 font-medium text-gray-800">{c.displayName}</td>
                  <td className="py-2 text-gray-500 text-xs truncate max-w-[200px]">{c.topic}</td>
                  <td className="py-2 text-right font-semibold text-indigo-600">{c.count}</td>
                </tr>
              ))}
              {data.topCustomers.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-xs text-gray-400">ยังไม่มีข้อมูล Chat Summary</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Sentiment Tab
// ─────────────────────────────────────────────────────────

interface SentimentData {
  sentCounts: { positive: number; neutral: number; negative: number };
  total: number;
  score: number;
  sentimentTrend: { date: string; positive: number; neutral: number; negative: number }[];
  negativeCustomers: { userId: string; displayName: string; topic: string; pendingAction?: string; date: string }[];
  positiveCustomers: { userId: string; displayName: string; topic: string; date: string }[];
  days: number;
}

function SentimentTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?businessId=${businessId}&view=sentiment&days=${days}`)
      .then((r) => r.json())
      .then((d) => setData(d as SentimentData))
      .finally(() => setLoading(false));
  }, [businessId, days]);

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  if (!data) return null;

  const { sentCounts, total, score } = data;
  const pctPos = total > 0 ? ((sentCounts.positive / total) * 100).toFixed(0) : "0";
  const pctNeg = total > 0 ? ((sentCounts.negative / total) * 100).toFixed(0) : "0";
  const pctNeu = total > 0 ? ((sentCounts.neutral / total) * 100).toFixed(0) : "0";

  const scoreColor = score > 20 ? "text-green-600" : score < -10 ? "text-red-600" : "text-amber-600";

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs text-gray-500">ช่วงเวลา:</span>
        {([7, 30, 90] as const).map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${days === d ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {d} วัน
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Smile}  label="ความพึงพอใจสูง (Positive)" value={`${sentCounts.positive} (${pctPos}%)`} sub={`${data.days} วันล่าสุด`} color="green" />
        <StatCard icon={Meh}    label="เป็นกลาง (Neutral)"         value={`${sentCounts.neutral} (${pctNeu}%)`} sub={`${data.days} วันล่าสุด`} color="amber" />
        <StatCard icon={Frown}  label="ไม่พึงพอใจ (Negative)"      value={`${sentCounts.negative} (${pctNeg}%)`} sub={`${data.days} วันล่าสุด`} color="rose" />
        <StatCard icon={Activity} label="Sentiment Score"           value={`${score > 0 ? "+" : ""}${score}`} sub="(positive − negative) / total × 100" color={score > 0 ? "teal" : "rose"} />
      </div>

      {/* Score gauge */}
      <Card title="Sentiment Score โดยรวม" icon={<Activity className="h-4 w-4 text-indigo-500" />}>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 flex">
              <div className="h-full bg-red-200 rounded-l-full" style={{ width: `${Number(pctNeg)}%` }} />
              <div className="h-full bg-gray-200" style={{ width: `${Number(pctNeu)}%` }} />
              <div className="h-full bg-green-200 rounded-r-full" style={{ width: `${Number(pctPos)}%` }} />
            </div>
          </div>
          <span className={`text-2xl font-bold ${scoreColor}`}>{score > 0 ? "+" : ""}{score}</span>
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-400 inline-block" />Positive {pctPos}%</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-300 inline-block" />Neutral {pctNeu}%</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400 inline-block" />Negative {pctNeg}%</span>
        </div>
      </Card>

      {/* Trend chart */}
      <Card title={`Sentiment Trend (${data.days} วันล่าสุด)`} icon={<TrendingUp className="h-4 w-4 text-purple-500" />}>
        <SentimentBar data={data.sentimentTrend} />
        <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-green-400 inline-block" />Positive</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-gray-300 inline-block" />Neutral</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-400 inline-block" />Negative</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Negative customers — need attention */}
        <Card title="ลูกค้าที่มี Sentiment ลบ (ต้องดูแล)" icon={<Frown className="h-4 w-4 text-red-500" />}>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.negativeCustomers.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">ไม่มีลูกค้า sentiment ลบในช่วงนี้ 🎉</p>
            )}
            {data.negativeCustomers.map((c, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
                <Frown className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{c.displayName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{c.topic}</p>
                  {c.pendingAction && <p className="text-[10px] text-red-600 mt-0.5">⚠ {c.pendingAction}</p>}
                </div>
                <span className="text-[9px] text-gray-400 shrink-0">{c.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Positive customers */}
        <Card title="ลูกค้าที่พึงพอใจ" icon={<Smile className="h-4 w-4 text-green-500" />}>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.positiveCustomers.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">ยังไม่มีข้อมูล</p>
            )}
            {data.positiveCustomers.map((c, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-green-50 border border-green-100">
                <Smile className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{c.displayName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{c.topic}</p>
                </div>
                <span className="text-[9px] text-gray-400 shrink-0">{c.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Team Performance Tab
// ─────────────────────────────────────────────────────────

interface TeamMember {
  username: string;
  messagesSent: number;
  followupsSent: number;
  botToggles: number;
  pins: number;
  conversationsHandled: number;
  avgResponseMinutes: number | null;
  lastActive: number;
  activityDays: { date: string; count: number }[];
}

interface TeamData {
  team: TeamMember[];
  botOnly: number;
  adminHandled: number;
  teamDailyTrend: { date: string; total: number }[];
  days: number;
}

function TeamTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?businessId=${businessId}&view=team&days=${days}`)
      .then((r) => r.json())
      .then((d) => setData(d as TeamData))
      .finally(() => setLoading(false));
  }, [businessId, days]);

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  if (!data) return null;

  const total = data.botOnly + data.adminHandled || 1;
  const adminRate = ((data.adminHandled / total) * 100).toFixed(0);
  const topPerformer = data.team[0];
  const maxTrend = Math.max(...data.teamDailyTrend.map((d) => d.total), 1);

  function formatLastActive(ts: number) {
    if (!ts) return "—";
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "เมื่อกี้";
    if (m < 60) return `${m} นาทีที่แล้ว`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ชม.ที่แล้ว`;
    return `${Math.floor(h / 24)} วันที่แล้ว`;
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs text-gray-500">ช่วงเวลา:</span>
        {([7, 30, 90] as const).map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${days === d ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {d} วัน
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Admin ทั้งหมด"              value={data.team.length} sub={`${data.days} วันล่าสุด`} color="indigo" />
        <StatCard icon={CheckCircle} label="Admin-handled Convs"        value={data.adminHandled.toLocaleString()} sub={`${adminRate}% ของ convs ทั้งหมด`} color="green" />
        <StatCard icon={UserCheck}   label="Bot-only Convs"             value={data.botOnly.toLocaleString()} sub="บอทจัดการคนเดียว" color="teal" />
        <StatCard icon={Trophy}      label="Top Performer"              value={topPerformer?.username || "—"} sub={`${topPerformer?.messagesSent || 0} messages`} color="amber" />
      </div>

      {/* Team daily trend */}
      <Card title={`ปริมาณงาน Team รายวัน (14 วันล่าสุด)`} icon={<TrendingUp className="h-4 w-4 text-indigo-500" />}>
        <div className="flex items-end gap-1 h-24">
          {data.teamDailyTrend.map((d, i) => (
            <div key={i} className="flex-1 group relative flex flex-col items-center gap-1">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                {d.date}: {d.total} actions
              </div>
              <div className="w-full rounded-t bg-indigo-400 hover:bg-indigo-500 transition-colors"
                style={{ height: `${(d.total / maxTrend) * 100}%`, minHeight: 4 }} />
              <span className="text-[8px] text-gray-400">{d.date.slice(-2)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Per-admin table */}
      <Card title="ประสิทธิภาพรายบุคคล" icon={<UserCheck className="h-4 w-4 text-blue-500" />}>
        {data.team.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีกิจกรรม Admin ในช่วงนี้</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="text-left pb-3 font-medium">Admin</th>
                  <th className="text-right pb-3 font-medium">ส่งข้อความ</th>
                  <th className="text-right pb-3 font-medium">Follow-up</th>
                  <th className="text-right pb-3 font-medium">Convs</th>
                  <th className="text-right pb-3 font-medium">Avg Response</th>
                  <th className="text-right pb-3 font-medium">Pins</th>
                  <th className="text-right pb-3 font-medium">Active ล่าสุด</th>
                  <th className="text-right pb-3 font-medium">Activity</th>
                </tr>
              </thead>
              <tbody>
                {data.team.map((m, i) => (
                  <tr key={m.username} className={`border-b border-gray-50 hover:bg-gray-50 ${i === 0 ? "bg-amber-50/40" : ""}`}>
                    <td className="py-3 font-semibold text-gray-800 flex items-center gap-2">
                      {i === 0 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                      {m.username}
                    </td>
                    <td className="py-3 text-right font-medium text-indigo-600">{m.messagesSent.toLocaleString()}</td>
                    <td className="py-3 text-right text-blue-600">{m.followupsSent}</td>
                    <td className="py-3 text-right text-gray-700">{m.conversationsHandled}</td>
                    <td className="py-3 text-right">
                      {m.avgResponseMinutes !== null ? (
                        <span className={`font-medium ${m.avgResponseMinutes < 5 ? "text-green-600" : m.avgResponseMinutes < 30 ? "text-amber-600" : "text-red-600"}`}>
                          {m.avgResponseMinutes < 1 ? `${Math.round(m.avgResponseMinutes * 60)}s` : `${m.avgResponseMinutes}m`}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 text-right text-gray-500">{m.pins}</td>
                    <td className="py-3 text-right text-xs text-gray-400">{formatLastActive(m.lastActive)}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end">
                        <TeamSparkline days={m.activityDays} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Response time legend */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> Avg Response Time:</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />ดีมาก (&lt;5 นาที)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />ปานกลาง (5–30 นาที)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />ช้า (&gt;30 นาที)</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main AnalyticsDashboard
// ─────────────────────────────────────────────────────────

type AnalyticsTab = "overview" | "topics" | "sentiment" | "team";

const TABS: { id: AnalyticsTab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",  label: "Overview",   icon: <BarChart3 size={14} /> },
  { id: "topics",    label: "Topics",     icon: <Hash size={14} /> },
  { id: "sentiment", label: "Sentiment",  icon: <Smile size={14} /> },
  { id: "team",      label: "Team",       icon: <Trophy size={14} /> },
];

export default function AnalyticsDashboard({ businessId }: { businessId: string }) {
  const [tab, setTab] = useState<AnalyticsTab>("overview");
  const [data, setData] = useState<RealAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = useCallback(async (isManual = false) => {
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

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => {
    const t = setInterval(() => { if (tab === "overview") fetchOverview(); }, 60_000);
    return () => clearInterval(t);
  }, [fetchOverview, tab]);

  const lastUpdated = data
    ? new Date(data.computedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Analytics Dashboard
          </h2>
          {lastUpdated && tab === "overview" && (
            <p className="text-xs text-gray-400 mt-0.5">อัพเดตล่าสุด {lastUpdated} น.</p>
          )}
        </div>
        {tab === "overview" && (
          <button onClick={() => fetchOverview(true)} disabled={refreshing || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              tab === t.id ? "border-indigo-600 text-indigo-600 bg-indigo-50" : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && tab === "overview" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">เกิดข้อผิดพลาด: {error}</div>
      )}

      {/* Tab content */}
      {tab === "overview" && (
        loading
          ? <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
          : data ? <OverviewTab data={data} /> : null
      )}
      {tab === "topics"    && <TopicsTab    businessId={businessId} />}
      {tab === "sentiment" && <SentimentTab businessId={businessId} />}
      {tab === "team"      && <TeamTab      businessId={businessId} />}
    </div>
  );
}
