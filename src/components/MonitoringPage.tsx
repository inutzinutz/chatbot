"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users, MessageSquare, Clock, AlertTriangle, CheckCircle,
  ChevronRight, RefreshCw, Calendar, TrendingUp, Bot,
  Pin, Wifi, Activity, BarChart2, FileText, Loader2,
  ArrowRight, User, Timer, Cpu, Settings, ToggleLeft, ToggleRight, Save,
} from "lucide-react";
import type { ChatSummary, PendingWork, DailyDigest } from "@/lib/chatStore";

// ── Types ──

interface TokenTotals {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  calls: number;
  costUSD: number;
}

interface TokenModelRow {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  calls: number;
  costUSD: number;
}

interface TokenDailyRow {
  date: string;
  totalTokens: number;
  costUSD: number;
  calls: number;
}

interface TokenSiteRow {
  calls: number;
  totalTokens: number;
  costUSD: number;
}

interface TokenLogEntry {
  id: string;
  model: string;
  callSite: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number;
  timestamp: number;
}

interface TokensData {
  totals: TokenTotals;
  byModel: TokenModelRow[];
  dailyChart: TokenDailyRow[];
  bySite: Record<string, TokenSiteRow>;
  recentLog: TokenLogEntry[];
  days: number;
}

interface AdminUserStats {
  sent: number;
  toggleBot: number;
  pin: number;
  lastActive: number;
  conversationsHandled: number;
  avgResponseMin: number;
  todayMessages: number;
}

interface UsersOverview {
  users: Record<string, AdminUserStats>;
  totalConversations: number;
  totalPending: number;
  highPriorityPending: number;
  since: number;
}

interface UserDetail {
  username: string;
  totalMessages: number;
  totalConversations: number;
  avgResponseMin: number;
  byDay: { date: string; sent: number; toggles: number; pins: number }[];
  recentActivity: {
    id: string;
    action: string;
    displayName?: string;
    detail: string;
    timestamp: number;
  }[];
  conversations: {
    userId: string;
    displayName: string;
    lastMessage: string;
    lastMessageAt: number;
    pinned?: boolean;
    botEnabled: boolean;
    source: string;
  }[];
}

// ── Helpers ──

function formatTime(ts: number): string {
  if (!ts) return "—";
  const d = new Date(ts + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(11, 16) + " น.";
}

function formatDate(ts: number): string {
  if (!ts) return "—";
  const d = new Date(ts + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function formatRelative(ts: number): string {
  const diffMin = (Date.now() - ts) / 60000;
  if (diffMin < 1) return "เมื่อกี้";
  if (diffMin < 60) return `${Math.round(diffMin)} นาทีที่แล้ว`;
  const diffH = diffMin / 60;
  if (diffH < 24) return `${Math.round(diffH)} ชม.ที่แล้ว`;
  return `${Math.round(diffH / 24)} วันที่แล้ว`;
}

function todayThai(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  send: { label: "ส่งข้อความ", color: "bg-blue-100 text-blue-700" },
  sendFollowup: { label: "ส่ง Follow-up", color: "bg-purple-100 text-purple-700" },
  toggleBot: { label: "Toggle Bot", color: "bg-yellow-100 text-yellow-700" },
  pin: { label: "Pin", color: "bg-red-100 text-red-700" },
  unpin: { label: "Unpin", color: "bg-green-100 text-green-700" },
  globalToggleBot: { label: "Global Bot", color: "bg-orange-100 text-orange-700" },
};

const SENTIMENT_CONFIG = {
  positive: { label: "ดี", color: "text-green-600", bg: "bg-green-50" },
  neutral: { label: "ปกติ", color: "text-gray-600", bg: "bg-gray-50" },
  negative: { label: "ไม่ดี", color: "text-red-600", bg: "bg-red-50" },
};

const PRIORITY_CONFIG = {
  high: { label: "ด่วน", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  medium: { label: "ปานกลาง", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  low: { label: "ต่ำ", color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

interface MonitoringPageProps {
  businessId: string;
}

type Tab = "users" | "pending" | "summaries" | "daily" | "tokens" | "settings";

export default function MonitoringPage({ businessId }: MonitoringPageProps) {
  const [tab, setTab] = useState<Tab>("users");
  const [loading, setLoading] = useState(false);

  // Users tab state
  const [usersData, setUsersData] = useState<UsersOverview | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("7d");

  // Pending tab state
  const [pending, setPending] = useState<PendingWork[]>([]);

  // Summaries tab state
  const [summaries, setSummaries] = useState<ChatSummary[]>([]);
  const [summaryDate, setSummaryDate] = useState(todayThai());
  const [summaryLoading, setSummaryLoading] = useState<string | null>(null);
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);

  // Daily digest state
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [digestDate, setDigestDate] = useState(todayThai());

  // Tokens tab state
  const [tokensData, setTokensData] = useState<TokensData | null>(null);
  const [tokenDays, setTokenDays] = useState<30 | 7 | 1>(30);

  // Settings tab — Business Hours state
  interface BHSchedule { day: string; open: string; close: string; active: boolean; }
  interface BHConfig { enabled: boolean; timezone: string; offHoursMessage: string; schedule: BHSchedule[]; }
  const [bhConfig, setBhConfig] = useState<BHConfig | null>(null);
  const [bhStatus, setBhStatus] = useState<{ isOpen: boolean; dayName: string; currentTime: string; openTime: string; closeTime: string } | null>(null);
  const [bhLoading, setBhLoading] = useState(false);
  const [bhSaving, setBhSaving] = useState(false);
  const [bhSaved, setBhSaved] = useState(false);
  const [bhError, setBhError] = useState<string | null>(null);

  const sinceMap = {
    today: new Date(todayThai() + "T00:00:00+07:00").getTime(),
    "7d": Date.now() - 7 * 24 * 60 * 60 * 1000,
    "30d": Date.now() - 30 * 24 * 60 * 60 * 1000,
  };

  // ── Fetch business hours ──
  const fetchBizHours = useCallback(async () => {
    setBhLoading(true);
    try {
      const r = await fetch(`/api/business-hours?businessId=${businessId}`);
      if (r.ok) {
        const data = await r.json() as { config: BHConfig; status: typeof bhStatus };
        setBhConfig(data.config);
        setBhStatus(data.status);
      }
    } finally {
      setBhLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // ── Fetch users overview ──
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const since = sinceMap[period];
      const r = await fetch(
        `/api/monitoring?businessId=${businessId}&view=users&since=${since}`
      );
      const data = await r.json() as UsersOverview;
      setUsersData(data);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, period]);

  // ── Fetch user detail ──
  const fetchUserDetail = useCallback(async (username: string) => {
    setUserDetailLoading(true);
    try {
      const since = sinceMap[period];
      const r = await fetch(
        `/api/monitoring?businessId=${businessId}&view=user_detail&username=${username}&since=${since}`
      );
      const data = await r.json() as UserDetail;
      setUserDetail(data);
    } finally {
      setUserDetailLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, period]);

  // ── Fetch pending work ──
  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/monitoring?businessId=${businessId}&view=pending`
      );
      const data = await r.json() as { pending: PendingWork[] };
      setPending(data.pending || []);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // ── Fetch summaries ──
  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/monitoring?businessId=${businessId}&view=summaries&date=${summaryDate}`
      );
      const data = await r.json() as { summaries: ChatSummary[] };
      setSummaries(data.summaries || []);
    } finally {
      setLoading(false);
    }
  }, [businessId, summaryDate]);

  // ── Generate AI summary for a conversation ──
  const generateSummary = async (userId: string) => {
    setSummaryLoading(userId);
    try {
      const r = await fetch("/api/monitoring/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, userId, force: true }),
      });
      const data = await r.json() as { summary: ChatSummary };
      if (data.summary) {
        setSummaries((prev) => {
          const exists = prev.find((s) => s.userId === userId);
          if (exists) return prev.map((s) => (s.userId === userId ? data.summary : s));
          return [data.summary, ...prev];
        });
        setExpandedSummary(userId);
      }
    } finally {
      setSummaryLoading(null);
    }
  };

  // ── Fetch daily digest ──
  const fetchDigest = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/monitoring?businessId=${businessId}&view=daily&date=${digestDate}`
      );
      const data = await r.json() as { digest: DailyDigest };
      setDigest(data.digest);
    } finally {
      setLoading(false);
    }
  }, [businessId, digestDate]);

  // ── Fetch token usage ──
  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/monitoring?businessId=${businessId}&view=tokens&days=${tokenDays}`
      );
      const data = await r.json() as TokensData;
      setTokensData(data);
    } finally {
      setLoading(false);
    }
  }, [businessId, tokenDays]);

  // Effects
  useEffect(() => {
    if (tab === "users") fetchUsers();
    if (tab === "pending") fetchPending();
    if (tab === "summaries") fetchSummaries();
    if (tab === "daily") fetchDigest();
    if (tab === "tokens") fetchTokens();
    if (tab === "settings") fetchBizHours();
  }, [tab, fetchUsers, fetchPending, fetchSummaries, fetchDigest, fetchTokens, fetchBizHours]);

  useEffect(() => {
    if (selectedUser) fetchUserDetail(selectedUser);
    else setUserDetail(null);
  }, [selectedUser, fetchUserDetail]);

  // ── Tab bar ──
  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "users", label: "ผู้ใช้งาน", icon: <Users size={15} /> },
    {
      id: "pending",
      label: "งานค้าง",
      icon: <AlertTriangle size={15} />,
      badge: usersData?.highPriorityPending,
    },
    { id: "summaries", label: "สรุปแชท", icon: <FileText size={15} /> },
    { id: "daily", label: "Daily Digest", icon: <Calendar size={15} /> },
    { id: "tokens", label: "Tokens", icon: <Cpu size={15} /> },
    { id: "settings", label: "ตั้งค่า", icon: <Settings size={15} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity size={20} className="text-blue-600" />
            Monitoring
          </h1>
          <p className="text-sm text-gray-500">ติดตามการทำงานของทีมและลูกค้า</p>
        </div>
        <button
          onClick={() => {
            if (tab === "users") fetchUsers();
            if (tab === "pending") fetchPending();
            if (tab === "summaries") fetchSummaries();
            if (tab === "daily") fetchDigest();
            if (tab === "tokens") fetchTokens();
            if (tab === "settings") fetchBizHours();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          รีเฟรช
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-6 flex gap-1 pt-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSelectedUser(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors relative ${
              tab === t.id
                ? "border-blue-600 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge ? (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div className="space-y-4">
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">ช่วงเวลา:</span>
              {(["today", "7d", "30d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-sm rounded-full border ${
                    period === p
                      ? "bg-blue-600 text-white border-blue-600"
                      : "text-gray-600 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {p === "today" ? "วันนี้" : p === "7d" ? "7 วัน" : "30 วัน"}
                </button>
              ))}
            </div>

            {/* Overview cards */}
            {usersData && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <MessageSquare size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{usersData.totalConversations}</div>
                    <div className="text-xs text-gray-500">Conversations ทั้งหมด</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <AlertTriangle size={18} className="text-red-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{usersData.highPriorityPending}</div>
                    <div className="text-xs text-gray-500">งานด่วนที่ค้างอยู่</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Users size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{Object.keys(usersData.users).length}</div>
                    <div className="text-xs text-gray-500">Admin ที่ active</div>
                  </div>
                </div>
              </div>
            )}

            {/* User cards grid */}
            {loading && !usersData ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin text-blue-500" size={28} />
              </div>
            ) : usersData && Object.keys(usersData.users).length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p>ยังไม่มีกิจกรรม admin ในช่วงนี้</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(usersData?.users || {}).map(([username, stats]) => (
                  <button
                    key={username}
                    onClick={() => setSelectedUser(selectedUser === username ? null : username)}
                    className={`bg-white rounded-xl border p-5 text-left hover:shadow-md transition-all ${
                      selectedUser === username ? "ring-2 ring-blue-500 border-blue-300" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{username}</div>
                          <div className="text-xs text-gray-500">
                            Active {formatRelative(stats.lastActive)}
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className={`text-gray-400 transition-transform ${selectedUser === username ? "rotate-90" : ""}`}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-blue-700">{stats.sent}</div>
                        <div className="text-xs text-blue-600">ข้อความส่ง</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-purple-700">{stats.conversationsHandled}</div>
                        <div className="text-xs text-purple-600">แชทที่ดูแล</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-green-700">{stats.todayMessages}</div>
                        <div className="text-xs text-green-600">วันนี้</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* User detail panel */}
            {selectedUser && (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                      {selectedUser.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">{selectedUser}</div>
                      <div className="text-sm text-blue-100">รายละเอียดการทำงาน</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-white/70 hover:text-white text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>

                {userDetailLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-blue-500" size={24} />
                  </div>
                ) : userDetail ? (
                  <div className="p-5 space-y-5">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-700">{userDetail.totalMessages}</div>
                        <div className="text-xs text-gray-500">ข้อความทั้งหมด</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-700">{userDetail.totalConversations}</div>
                        <div className="text-xs text-gray-500">แชทที่ดูแล</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-700">
                          {userDetail.avgResponseMin > 0 ? `${userDetail.avgResponseMin}` : "—"}
                        </div>
                        <div className="text-xs text-gray-500">avg. response (นาที)</div>
                      </div>
                    </div>

                    {/* Activity by day */}
                    {userDetail.byDay.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <BarChart2 size={14} /> กิจกรรมรายวัน
                        </h3>
                        <div className="space-y-1.5">
                          {userDetail.byDay.slice(0, 7).map((d) => (
                            <div key={d.date} className="flex items-center gap-3 text-sm">
                              <span className="w-24 text-gray-500 text-xs">{d.date}</span>
                              <div className="flex gap-2 flex-1">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                                  {d.sent} ส่ง
                                </span>
                                {d.toggles > 0 && (
                                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs">
                                    {d.toggles} toggle
                                  </span>
                                )}
                                {d.pins > 0 && (
                                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">
                                    {d.pins} pin
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Conversations handled */}
                    {userDetail.conversations.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <MessageSquare size={14} /> แชทที่ดูแล ({userDetail.conversations.length})
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {userDetail.conversations.map((c) => (
                            <div
                              key={c.userId}
                              className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg text-sm"
                            >
                              <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
                                {c.displayName.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-800 truncate">{c.displayName}</div>
                                <div className="text-xs text-gray-500 truncate">{c.lastMessage}</div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {c.pinned && <Pin size={12} className="text-red-500" />}
                                {!c.botEnabled && <Bot size={12} className="text-yellow-500" />}
                                <span className="text-xs text-gray-400">{formatRelative(c.lastMessageAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent activity log */}
                    {userDetail.recentActivity.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Activity size={14} /> กิจกรรมล่าสุด
                        </h3>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {userDetail.recentActivity.slice(0, 20).map((e) => {
                            const cfg = ACTION_LABELS[e.action] || { label: e.action, color: "bg-gray-100 text-gray-600" };
                            return (
                              <div key={e.id} className="flex items-start gap-2 text-sm py-1.5 border-b last:border-0">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${cfg.color}`}>
                                  {cfg.label}
                                </span>
                                <span className="text-gray-600 flex-1">{e.detail}</span>
                                <span className="text-xs text-gray-400 shrink-0">{formatTime(e.timestamp)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* ── PENDING WORK TAB ── */}
        {tab === "pending" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                งานที่ค้างอยู่ ({pending.length})
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin text-blue-500" size={28} />
              </div>
            ) : pending.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white rounded-xl border">
                <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
                <p className="text-green-600 font-medium">ไม่มีงานค้าง!</p>
                <p className="text-sm">ทุก conversation ได้รับการดูแลแล้ว</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((item) => {
                  const cfg = PRIORITY_CONFIG[item.priority];
                  return (
                    <div
                      key={`${item.businessId}:${item.userId}`}
                      className={`bg-white rounded-xl border-2 p-4 ${cfg.bg}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                            {item.displayName.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{item.displayName}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg} border`}>
                                {cfg.label}
                              </span>
                              {item.source === "line" ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">LINE</span>
                              ) : (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Web</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-0.5">{item.reason}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                            <Timer size={13} />
                            {item.waitingHours >= 24
                              ? `${Math.round(item.waitingHours / 24)} วัน`
                              : `${item.waitingHours} ชม.`}
                          </div>
                          <div className="text-xs text-gray-400">{formatRelative(item.lastMessageAt)}</div>
                        </div>
                      </div>

                      {/* Last message preview */}
                      <div className="mt-3 p-3 bg-white/70 rounded-lg border border-gray-200">
                        <div className="text-xs text-gray-400 mb-1">ข้อความล่าสุด:</div>
                        <div className="text-sm text-gray-700 truncate">{item.lastMessage}</div>
                      </div>

                      {/* Status indicators */}
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                        {item.pinned && (
                          <span className="flex items-center gap-1 text-red-600">
                            <Pin size={11} /> Pinned
                          </span>
                        )}
                        {!item.botEnabled && (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <Bot size={11} /> Bot ปิด
                          </span>
                        )}
                        {item.assignedAdmin && (
                          <span className="flex items-center gap-1">
                            <User size={11} /> {item.assignedAdmin}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SUMMARIES TAB ── */}
        {tab === "summaries" && (
          <div className="space-y-4">
            {/* Date picker */}
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-gray-500" />
              <input
                type="date"
                value={summaryDate}
                max={todayThai()}
                onChange={(e) => setSummaryDate(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm"
              />
              <span className="text-sm text-gray-500">
                {summaries.length} สรุปแชท
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin text-blue-500" size={28} />
              </div>
            ) : summaries.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white rounded-xl border">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p>ยังไม่มีสรุปแชทสำหรับวันนี้</p>
                <p className="text-sm mt-1">กดปุ่ม &quot;สรุป AI&quot; บน conversation เพื่อสร้างสรุป</p>
              </div>
            ) : (
              <div className="space-y-3">
                {summaries.map((s) => {
                  const sentCfg = SENTIMENT_CONFIG[s.sentiment];
                  const isExpanded = expandedSummary === s.userId;
                  return (
                    <div key={s.userId} className="bg-white rounded-xl border overflow-hidden">
                      <button
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedSummary(isExpanded ? null : s.userId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-sm font-bold">
                              {s.displayName.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{s.displayName}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${sentCfg.bg} ${sentCfg.color}`}>
                                  {sentCfg.label}
                                </span>
                                {s.adminHandled && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    Admin ตอบ
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mt-0.5">{s.topic}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-gray-400">{s.messageCount} ข้อความ</span>
                            <ChevronRight
                              size={16}
                              className={`text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            />
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t bg-gray-50 space-y-3">
                          <div className="pt-3">
                            <div className="text-xs text-gray-500 mb-1">ผลลัพธ์</div>
                            <div className="text-sm font-medium text-gray-800">{s.outcome}</div>
                          </div>

                          {s.keyPoints.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">ประเด็นสำคัญ</div>
                              <ul className="space-y-1">
                                {s.keyPoints.map((point, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                    <ArrowRight size={12} className="mt-0.5 text-blue-500 shrink-0" />
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {s.pendingAction && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <div className="text-xs text-yellow-600 font-medium mb-1">งานที่ยังค้างอยู่</div>
                              <div className="text-sm text-yellow-800">{s.pendingAction}</div>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {s.adminNames.length > 0 && (
                              <span className="flex items-center gap-1">
                                <User size={11} /> {s.adminNames.join(", ")}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock size={11} /> {s.duration} นาที
                            </span>
                          </div>

                          <button
                            onClick={() => generateSummary(s.userId)}
                            disabled={summaryLoading === s.userId}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {summaryLoading === s.userId ? (
                              <><Loader2 size={11} className="animate-spin" /> กำลังสร้างสรุปใหม่...</>
                            ) : (
                              <><RefreshCw size={11} /> สร้างสรุปใหม่</>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── DAILY DIGEST TAB ── */}
        {tab === "daily" && (
          <div className="space-y-4">
            {/* Date picker */}
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-gray-500" />
              <input
                type="date"
                value={digestDate}
                max={todayThai()}
                onChange={(e) => setDigestDate(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin text-blue-500" size={28} />
              </div>
            ) : !digest ? (
              <div className="text-center py-16 text-gray-400 bg-white rounded-xl border">
                <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                <p>ยังไม่มีข้อมูลสำหรับวันนี้</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Conversations", value: digest.totalConversations, icon: <MessageSquare size={16} />, color: "blue" },
                    { label: "ใหม่วันนี้", value: digest.newConversations, icon: <TrendingUp size={16} />, color: "green" },
                    { label: "Escalated", value: digest.escalatedConversations, icon: <Pin size={16} />, color: "red" },
                    { label: "ค้างอยู่", value: digest.pendingConversations, icon: <AlertTriangle size={16} />, color: "yellow" },
                  ].map((card) => (
                    <div key={card.label} className="bg-white rounded-xl border p-4 text-center">
                      <div className={`flex justify-center mb-2 text-${card.color}-500`}>{card.icon}</div>
                      <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                      <div className="text-xs text-gray-500">{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* Top topics */}
                {digest.topTopics.length > 0 && (
                  <div className="bg-white rounded-xl border p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <BarChart2 size={15} /> หัวข้อที่ลูกค้าถามมากที่สุด
                    </h3>
                    <div className="space-y-2">
                      {digest.topTopics.map((t, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full"
                              style={{
                                width: `${(t.count / (digest.topTopics[0]?.count || 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-700 flex-1">{t.topic}</span>
                          <span className="text-sm font-semibold text-gray-600">{t.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin activity */}
                {digest.adminActivity.length > 0 && (
                  <div className="bg-white rounded-xl border p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Users size={15} /> การทำงานของทีมวันนี้
                    </h3>
                    <div className="space-y-3">
                      {digest.adminActivity
                        .sort((a, b) => b.messagesSent - a.messagesSent)
                        .map((a) => (
                          <div key={a.username} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                              {a.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-800">{a.username}</div>
                              <div className="text-xs text-gray-500">
                                {a.conversationsHandled} แชท · {a.messagesSent} ข้อความ
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-blue-600">{a.messagesSent}</div>
                              <div className="text-xs text-gray-400">msgs</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Pending work */}
                {digest.pendingWork.length > 0 && (
                  <div className="bg-white rounded-xl border p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <AlertTriangle size={15} className="text-red-500" /> งานค้างที่ต้องติดตาม
                    </h3>
                    <div className="space-y-2">
                      {digest.pendingWork.slice(0, 5).map((p) => {
                        const cfg = PRIORITY_CONFIG[p.priority];
                        return (
                          <div key={p.userId} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg} border font-medium`}>
                              {cfg.label}
                            </span>
                            <span className="font-medium text-sm text-gray-800">{p.displayName}</span>
                            <span className="text-xs text-gray-500 flex-1 truncate">{p.reason}</span>
                            <span className="text-xs text-gray-400 flex items-center gap-0.5 shrink-0">
                              <Clock size={10} />
                              {p.waitingHours >= 24
                                ? `${Math.round(p.waitingHours / 24)} วัน`
                                : `${p.waitingHours} ชม.`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-400 text-right flex items-center justify-end gap-1">
                  <Wifi size={11} />
                  อัปเดตล่าสุด: {new Date(digest.generatedAt + 7 * 60 * 60 * 1000).toISOString().slice(11, 16)} น.
                </div>
              </div>
            )}
          </div>
        )}
        {/* ── TOKENS TAB ── */}
        {tab === "tokens" && (
          <div className="space-y-4">
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">ช่วงเวลา:</span>
              {([1, 7, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setTokenDays(d)}
                  className={`px-3 py-1 text-sm rounded-full border ${
                    tokenDays === d
                      ? "bg-blue-600 text-white border-blue-600"
                      : "text-gray-600 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {d === 1 ? "วันนี้" : d === 7 ? "7 วัน" : "30 วัน"}
                </button>
              ))}
            </div>

            {loading && !tokensData && (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 size={20} className="animate-spin mr-2" /> กำลังโหลด...
              </div>
            )}

            {tokensData && (() => {
              const THB_RATE = 34;
              const { totals, byModel, dailyChart, bySite, recentLog } = tokensData;

              // Colour map for models
              const MODEL_COLORS: Record<string, string> = {
                "gpt-4o": "bg-green-500",
                "gpt-4o-mini": "bg-emerald-400",
                "claude-sonnet-4-20250514": "bg-purple-500",
                "claude-opus-4-5": "bg-violet-600",
                "claude-haiku-4-5": "bg-indigo-400",
              };

              const SITE_LABELS: Record<string, string> = {
                agent: "AI Agent",
                vision_image: "Vision (รูป)",
                vision_pdf: "Vision (PDF)",
                chat_claude: "Chat Claude",
                chat_openai: "Chat OpenAI",
                line_claude: "LINE Claude",
                line_openai: "LINE OpenAI",
                line_vision_image: "LINE Vision (รูป)",
                line_vision_pdf: "LINE Vision (PDF)",
                monitoring_summary: "AI Summary",
              };

              const maxDailyTokens = Math.max(...dailyChart.map((r) => r.totalTokens), 1);

              return (
                <div className="space-y-4">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border p-4">
                      <div className="flex items-center gap-2 mb-1 text-blue-600">
                        <Cpu size={16} /> <span className="text-xs font-medium text-gray-500">Total Tokens</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {totals.totalTokens >= 1_000_000
                          ? `${(totals.totalTokens / 1_000_000).toFixed(2)}M`
                          : totals.totalTokens >= 1_000
                          ? `${(totals.totalTokens / 1_000).toFixed(1)}K`
                          : totals.totalTokens}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{totals.calls.toLocaleString()} calls</div>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                      <div className="flex items-center gap-2 mb-1 text-green-600">
                        <TrendingUp size={16} /> <span className="text-xs font-medium text-gray-500">Cost (USD)</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        ${totals.costUSD.toFixed(4)}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">≈ ฿{(totals.costUSD * THB_RATE).toFixed(2)}</div>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                      <div className="flex items-center gap-2 mb-1 text-orange-500">
                        <ArrowRight size={16} /> <span className="text-xs font-medium text-gray-500">Input Tokens</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {totals.promptTokens >= 1_000
                          ? `${(totals.promptTokens / 1_000).toFixed(1)}K`
                          : totals.promptTokens}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">prompt tokens</div>
                    </div>
                    <div className="bg-white rounded-xl border p-4">
                      <div className="flex items-center gap-2 mb-1 text-purple-500">
                        <Bot size={16} /> <span className="text-xs font-medium text-gray-500">Output Tokens</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {totals.completionTokens >= 1_000
                          ? `${(totals.completionTokens / 1_000).toFixed(1)}K`
                          : totals.completionTokens}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">completion tokens</div>
                    </div>
                  </div>

                  {/* Daily usage bar chart */}
                  {dailyChart.length > 0 && (
                    <div className="bg-white rounded-xl border p-4">
                      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <BarChart2 size={15} /> Token Usage รายวัน
                      </h3>
                      <div className="flex items-end gap-1 h-28 overflow-x-auto">
                        {dailyChart.map((row) => (
                          <div key={row.date} className="flex flex-col items-center gap-1 min-w-[32px] flex-1">
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              {row.totalTokens >= 1_000 ? `${(row.totalTokens / 1_000).toFixed(0)}K` : row.totalTokens}
                            </div>
                            <div
                              className="w-full bg-blue-500 rounded-t"
                              style={{ height: `${Math.max(4, (row.totalTokens / maxDailyTokens) * 80)}px` }}
                              title={`${row.date}: ${row.totalTokens.toLocaleString()} tokens · $${row.costUSD.toFixed(4)}`}
                            />
                            <div className="text-xs text-gray-400 whitespace-nowrap" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: "36px", fontSize: "10px" }}>
                              {row.date.slice(5)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* By model */}
                  {byModel.length > 0 && (
                    <div className="bg-white rounded-xl border p-4">
                      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Cpu size={15} /> ค่าใช้จ่ายแยกตาม Model
                      </h3>
                      <div className="space-y-3">
                        {byModel.map((row) => {
                          const barColor = MODEL_COLORS[row.model] ?? "bg-gray-400";
                          const pct = totals.costUSD > 0 ? (row.costUSD / totals.costUSD) * 100 : 0;
                          return (
                            <div key={row.model}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">{row.model}</span>
                                <div className="text-right">
                                  <span className="text-sm font-bold text-gray-900">${row.costUSD.toFixed(4)}</span>
                                  <span className="text-xs text-gray-400 ml-1">≈ ฿{(row.costUSD * THB_RATE).toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div className={`${barColor} h-full rounded-full`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-gray-500 w-16 text-right">
                                  {row.totalTokens >= 1_000 ? `${(row.totalTokens / 1_000).toFixed(1)}K` : row.totalTokens} tok · {row.calls} calls
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* By call site */}
                  {Object.keys(bySite).length > 0 && (
                    <div className="bg-white rounded-xl border p-4">
                      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Activity size={15} /> ค่าใช้จ่ายแยกตาม Call Site
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(bySite)
                          .sort(([, a], [, b]) => b.costUSD - a.costUSD)
                          .map(([site, stats]) => (
                            <div key={site} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                                {SITE_LABELS[site] ?? site}
                              </span>
                              <span className="text-sm text-gray-600 flex-1">{stats.calls} calls</span>
                              <span className="text-xs text-gray-500">
                                {stats.totalTokens >= 1_000 ? `${(stats.totalTokens / 1_000).toFixed(1)}K` : stats.totalTokens} tokens
                              </span>
                              <span className="text-sm font-semibold text-gray-800 w-20 text-right">
                                ${stats.costUSD.toFixed(4)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Recent log */}
                  {recentLog.length > 0 && (
                    <div className="bg-white rounded-xl border p-4">
                      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Clock size={15} /> Recent Calls (50 รายการล่าสุด)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500 border-b">
                              <th className="text-left py-1 pr-3 font-medium">เวลา</th>
                              <th className="text-left py-1 pr-3 font-medium">Model</th>
                              <th className="text-left py-1 pr-3 font-medium">Site</th>
                              <th className="text-right py-1 pr-3 font-medium">In</th>
                              <th className="text-right py-1 pr-3 font-medium">Out</th>
                              <th className="text-right py-1 font-medium">Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentLog.map((entry) => (
                              <tr key={entry.id} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">
                                  {new Date(entry.timestamp + 7 * 3600000).toISOString().slice(11, 19)}
                                </td>
                                <td className="py-1.5 pr-3 font-mono text-gray-700 truncate max-w-[120px]">{entry.model}</td>
                                <td className="py-1.5 pr-3 text-gray-600">{SITE_LABELS[entry.callSite] ?? entry.callSite}</td>
                                <td className="py-1.5 pr-3 text-right text-gray-600">{entry.promptTokens.toLocaleString()}</td>
                                <td className="py-1.5 pr-3 text-right text-gray-600">{entry.completionTokens.toLocaleString()}</td>
                                <td className="py-1.5 text-right font-semibold text-gray-800">${entry.costUSD.toFixed(5)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                   {totals.calls === 0 && (
                    <div className="text-center py-16 text-gray-400">
                      <Cpu size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">ยังไม่มีข้อมูล Token Usage</p>
                      <p className="text-xs mt-1">จะเริ่มแสดงหลังจากมี AI call ครั้งแรก</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ══════════════════════════ SETTINGS TAB ══════════════════════════ */}
        {tab === "settings" && (
          <div className="p-6 max-w-2xl mx-auto space-y-6">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Clock size={18} className="text-indigo-500" />
              เวลาทำการ (Business Hours)
            </h2>

            {bhLoading && !bhConfig && (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 size={28} className="animate-spin mr-3" />
                <span className="text-sm">กำลังโหลด...</span>
              </div>
            )}

            {bhConfig && (() => {
              const DAY_LABELS: Record<string, string> = {
                Sunday: "อาทิตย์", Monday: "จันทร์", Tuesday: "อังคาร",
                Wednesday: "พุธ", Thursday: "พฤหัส", Friday: "ศุกร์", Saturday: "เสาร์",
              };

              const updateSchedule = (idx: number, field: "open" | "close" | "active", val: string | boolean) => {
                const newSchedule = bhConfig.schedule.map((s, i) =>
                  i === idx ? { ...s, [field]: val } : s
                );
                setBhConfig({ ...bhConfig, schedule: newSchedule });
              };

              const handleSave = async () => {
                setBhSaving(true);
                setBhError(null);
                try {
                  const res = await fetch("/api/business-hours", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ businessId, config: bhConfig }),
                  });
                  if (res.ok) {
                    const data = await res.json() as { config: BHConfig; status: typeof bhStatus };
                    setBhConfig(data.config);
                    setBhStatus(data.status);
                    setBhSaved(true);
                    setTimeout(() => setBhSaved(false), 2500);
                  } else {
                    const err = await res.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
                    setBhError(err.error || `HTTP ${res.status}`);
                  }
                } catch (e) {
                  setBhError(String(e));
                } finally {
                  setBhSaving(false);
                }
              };

              return (
                <>
                  {/* Status badge */}
                  {bhStatus && (
                    <div className={`rounded-xl px-4 py-3 flex items-center gap-3 border ${bhStatus.isOpen ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                      <div className={`h-3 w-3 rounded-full ${bhStatus.isOpen ? "bg-green-500" : "bg-amber-400"} animate-pulse`} />
                      <div>
                        <p className={`text-sm font-semibold ${bhStatus.isOpen ? "text-green-700" : "text-amber-700"}`}>
                          {bhStatus.isOpen ? "อยู่ในเวลาทำการ" : "นอกเวลาทำการ"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {bhStatus.dayName} เวลา {bhStatus.currentTime} น. | เปิด {bhStatus.openTime}–{bhStatus.closeTime} น.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Enable toggle */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                    <button
                      type="button"
                      onClick={() => setBhConfig({ ...bhConfig, enabled: !bhConfig.enabled })}
                      className="flex items-center gap-3 w-full text-left"
                    >
                      {bhConfig.enabled
                        ? <ToggleRight size={24} className="text-indigo-500 shrink-0" />
                        : <ToggleLeft size={24} className="text-gray-300 shrink-0" />}
                      <div>
                        <p className="text-sm font-medium text-gray-800">เปิดใช้ Business Hours</p>
                        <p className="text-xs text-gray-400">
                          เปิด: AI จะรู้ว่าอยู่นอกเวลาทำการและแจ้งลูกค้าตามที่ตั้งค่า<br />
                          ปิด: AI ตอบปกติตลอด 24 ชม. โดยไม่มีบริบทเวลาทำการ
                        </p>
                      </div>
                    </button>

                    {/* Timezone */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-gray-700">Timezone</label>
                      <select
                        value={bhConfig.timezone}
                        onChange={(e) => setBhConfig({ ...bhConfig, timezone: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 text-sm text-gray-900 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                      >
                        <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                        <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                        <option value="UTC">UTC (GMT+0)</option>
                      </select>
                    </div>

                    {/* Off-hours message */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-gray-700">
                        ข้อความบริบทนอกเวลาทำการ (สำหรับ AI)
                      </label>
                      <textarea
                        value={bhConfig.offHoursMessage}
                        onChange={(e) => setBhConfig({ ...bhConfig, offHoursMessage: e.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none resize-none"
                      />
                      <p className="text-[11px] text-gray-400">
                        ข้อความนี้จะถูก inject เข้า system prompt เพื่อให้ AI รู้บริบทว่าอยู่นอกเวลาทำการ
                      </p>
                    </div>
                  </div>

                  {/* Weekly schedule */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-xs font-semibold text-gray-700">ตารางรายสัปดาห์</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {bhConfig.schedule.map((day, idx) => (
                        <div
                          key={day.day}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm ${!day.active ? "opacity-50" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => updateSchedule(idx, "active", !day.active)}
                            className="shrink-0"
                          >
                            {day.active
                              ? <ToggleRight size={20} className="text-indigo-500" />
                              : <ToggleLeft size={20} className="text-gray-300" />}
                          </button>
                          <span className="w-16 text-xs font-medium text-gray-700">
                            {DAY_LABELS[day.day] || day.day}
                          </span>
                          <input
                            type="time"
                            value={day.open}
                            onChange={(e) => updateSchedule(idx, "open", e.target.value)}
                            disabled={!day.active}
                            className="rounded border border-gray-200 bg-gray-50/60 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-indigo-300 disabled:opacity-40"
                          />
                          <span className="text-xs text-gray-400">ถึง</span>
                          <input
                            type="time"
                            value={day.close}
                            onChange={(e) => updateSchedule(idx, "close", e.target.value)}
                            disabled={!day.active}
                            className="rounded border border-gray-200 bg-gray-50/60 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-indigo-300 disabled:opacity-40"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error */}
                  {bhError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
                      {bhError}
                    </div>
                  )}

                  {/* Save button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={bhSaving}
                      className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                        bhSaved
                          ? "bg-green-500 text-white"
                          : bhSaving
                          ? "bg-indigo-400 text-white cursor-wait"
                          : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                      }`}
                    >
                      <Save size={14} />
                      {bhSaved ? "บันทึกแล้ว!" : bhSaving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
