"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users, MessageSquare, Clock, AlertTriangle, CheckCircle,
  ChevronRight, RefreshCw, Calendar, TrendingUp, Bot,
  Pin, Wifi, Activity, BarChart2, FileText, Loader2,
  ArrowRight, User, Timer,
} from "lucide-react";
import type { ChatSummary, PendingWork, DailyDigest } from "@/lib/chatStore";

// ── Types ──

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

type Tab = "users" | "pending" | "summaries" | "daily";

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

  const sinceMap = {
    today: new Date(todayThai() + "T00:00:00+07:00").getTime(),
    "7d": Date.now() - 7 * 24 * 60 * 60 * 1000,
    "30d": Date.now() - 30 * 24 * 60 * 60 * 1000,
  };

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

  // Effects
  useEffect(() => {
    if (tab === "users") fetchUsers();
    if (tab === "pending") fetchPending();
    if (tab === "summaries") fetchSummaries();
    if (tab === "daily") fetchDigest();
  }, [tab, fetchUsers, fetchPending, fetchSummaries, fetchDigest]);

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
      </div>
    </div>
  );
}
