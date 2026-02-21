"use client";

import { useState, useEffect } from "react";
import { analyticsData } from "@/lib/analytics";
import { getChatEvents, computeAnalytics, clearChatEvents } from "@/lib/chatEvents";
import type { ComputedAnalytics } from "@/lib/chatEvents";
import {
  Users,
  MessageSquare,
  Flame,
  TrendingUp,
  BarChart3,
  Globe,
  Languages,
  Search,
  Clock,
  Layers,
  Cpu,
  Trash2,
  Activity,
} from "lucide-react";

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
            <span className="text-xs text-gray-500 w-28 truncate text-right shrink-0">
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
    FACEBOOK: "bg-blue-500",
    LINE: "bg-green-500",
    WHATS_APP: "bg-emerald-500",
    WEB_EMBED: "bg-indigo-500",
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
    </div>
  );
}

function LanguagePills({
  data,
}: {
  data: { language: string; count: number }[];
}) {
  const total = data.reduce((a, b) => a + b.count, 0);
  const langNames: Record<string, string> = {
    th: "Thai",
    en: "English",
    my: "Myanmar",
    fr: "French",
    lo: "Lao",
    es: "Spanish",
    ar: "Arabic",
  };

  return (
    <div className="flex flex-wrap gap-2">
      {data.map((d) => {
        const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : "0";
        return (
          <div
            key={d.language}
            className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5"
          >
            <span className="text-xs font-semibold text-gray-700">
              {langNames[d.language] || d.language}
            </span>
            <span className="text-[10px] text-gray-400">
              {d.count} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Mode label mapping */
const MODE_LABELS: Record<string, string> = {
  claude_stream: "Claude Stream",
  claude_fallback: "Claude Fallback",
  openai_stream: "OpenAI Stream",
  openai_fallback: "OpenAI Fallback",
  fallback: "Smart Fallback",
};

export default function AnalyticsDashboard() {
  const d = analyticsData;
  const usagePct = Math.round((d.package.currentUsage / d.package.monthlyLimit) * 100);

  const [liveStats, setLiveStats] = useState<ComputedAnalytics | null>(null);
  const [tab, setTab] = useState<"baseline" | "live">("baseline");

  // Load live stats from localStorage
  useEffect(() => {
    const events = getChatEvents();
    if (events.length > 0) {
      setLiveStats(computeAnalytics(events));
    }

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      const freshEvents = getChatEvents();
      if (freshEvents.length > 0) {
        setLiveStats(computeAnalytics(freshEvents));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearLive = () => {
    clearChatEvents();
    setLiveStats(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Customer Summary &mdash; Last 30 Days
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setTab("baseline")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === "baseline"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Baseline Data
              </button>
              <button
                onClick={() => setTab("live")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                  tab === "live"
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Activity className="h-3 w-3" />
                Live Tracking
                {liveStats && liveStats.totalMessages > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                    {liveStats.totalMessages}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {tab === "baseline" ? (
          /* ── BASELINE TAB ── */
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Users}
                label="Current Usage"
                value={d.package.currentUsage.toLocaleString()}
                sub="customers this month"
                color="blue"
              />
              <StatCard
                icon={TrendingUp}
                label="Monthly Limit"
                value={d.package.monthlyLimit.toLocaleString()}
                sub={`${usagePct}% used`}
                color="green"
              />
              <StatCard
                icon={MessageSquare}
                label="Avg Messages"
                value={d.conversation.avgMessages}
                sub="per customer"
                color="indigo"
              />
              <StatCard
                icon={Flame}
                label="Max Messages"
                value={d.conversation.maxMessages}
                sub="longest conversation"
                color="orange"
              />
            </div>

            {/* Hourly Contact Pattern */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Contact Time Pattern
                </h3>
              </div>
              <HourlyChart data={d.hourlyContacts} />
              <div className="flex justify-between mt-2 text-[9px] text-gray-400 px-1">
                <span>12AM</span>
                <span>6AM</span>
                <span>12PM</span>
                <span>6PM</span>
                <span>11PM</span>
              </div>
            </div>

            {/* Two Column: Intents + Keywords */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-orange-500" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Popular Intents
                  </h3>
                </div>
                <BarChartSimple
                  data={d.intents as unknown as Record<string, unknown>[]}
                  labelKey="intent"
                  valueKey="count"
                  color="#f97316"
                />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Top Keywords
                  </h3>
                </div>
                <BarChartSimple
                  data={d.topKeywords as unknown as Record<string, unknown>[]}
                  labelKey="keyword"
                  valueKey="count"
                  color="#6366f1"
                />
              </div>
            </div>

            {/* Two Column: Platform + Language */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Platform Distribution
                  </h3>
                </div>
                <PlatformPills data={d.platforms} />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Languages className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Language Distribution
                  </h3>
                </div>
                <LanguagePills data={d.languages} />
              </div>
            </div>
          </>
        ) : (
          /* ── LIVE TRACKING TAB ── */
          <>
            {!liveStats || liveStats.totalMessages === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm text-center">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4">
                  <Activity className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  No Live Data Yet
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Start chatting with the AI in the Chat or AI Testing page.
                  Events will be tracked automatically and displayed here.
                </p>
              </div>
            ) : (
              <>
                {/* Live stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={MessageSquare}
                    label="Messages Sent"
                    value={liveStats.totalMessages}
                    sub="from this browser"
                    color="blue"
                  />
                  <StatCard
                    icon={Cpu}
                    label="AI Responses"
                    value={liveStats.totalResponses}
                    sub="pipeline processed"
                    color="green"
                  />
                  <StatCard
                    icon={Clock}
                    label="Avg Response"
                    value={`${liveStats.avgResponseTimeMs}ms`}
                    sub="response time"
                    color="violet"
                  />
                  <StatCard
                    icon={Layers}
                    label="Sessions"
                    value={liveStats.totalSessions}
                    sub="chat resets"
                    color="orange"
                  />
                </div>

                {/* Live hourly pattern */}
                {liveStats.hourlyDistribution.some((h) => h.count > 0) && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="h-4 w-4 text-emerald-500" />
                      <h3 className="text-sm font-semibold text-gray-900">
                        Live Contact Pattern
                      </h3>
                      <span className="text-[10px] text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                        Live
                      </span>
                    </div>
                    <HourlyChart data={liveStats.hourlyDistribution} />
                    <div className="flex justify-between mt-2 text-[9px] text-gray-400 px-1">
                      <span>12AM</span>
                      <span>6AM</span>
                      <span>12PM</span>
                      <span>6PM</span>
                      <span>11PM</span>
                    </div>
                  </div>
                )}

                {/* Two Column: Mode + Layer Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {liveStats.modeDistribution.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Cpu className="h-4 w-4 text-violet-500" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          AI Mode Distribution
                        </h3>
                      </div>
                      <BarChartSimple
                        data={liveStats.modeDistribution.map((m) => ({
                          mode: MODE_LABELS[m.mode] || m.mode,
                          count: m.count,
                        })) as unknown as Record<string, unknown>[]}
                        labelKey="mode"
                        valueKey="count"
                        color="#8b5cf6"
                      />
                    </div>
                  )}

                  {liveStats.layerDistribution.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Layers className="h-4 w-4 text-indigo-500" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Pipeline Layer Resolution
                        </h3>
                      </div>
                      <BarChartSimple
                        data={liveStats.layerDistribution as unknown as Record<string, unknown>[]}
                        labelKey="layer"
                        valueKey="count"
                        color="#6366f1"
                      />
                    </div>
                  )}
                </div>

                {/* Two Column: Intents + Keywords (from live data) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {liveStats.topIntents.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="h-4 w-4 text-orange-500" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Detected Intents (Live)
                        </h3>
                      </div>
                      <BarChartSimple
                        data={liveStats.topIntents as unknown as Record<string, unknown>[]}
                        labelKey="intent"
                        valueKey="count"
                        color="#f97316"
                      />
                    </div>
                  )}

                  {liveStats.topKeywords.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Search className="h-4 w-4 text-indigo-500" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          Top Keywords (Live)
                        </h3>
                      </div>
                      <BarChartSimple
                        data={liveStats.topKeywords as unknown as Record<string, unknown>[]}
                        labelKey="keyword"
                        valueKey="count"
                        color="#6366f1"
                      />
                    </div>
                  )}
                </div>

                {/* Clear button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleClearLive}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear Live Data
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
