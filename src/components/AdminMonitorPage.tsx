"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Shield,
  Activity,
  MessageSquare,
  ToggleRight,
  Pin,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types (mirrors chatStore AdminActivityEntry)                       */
/* ------------------------------------------------------------------ */

interface AdminActivityEntry {
  id: string;
  businessId: string;
  username: string;
  action: "send" | "toggleBot" | "pin" | "unpin" | "globalToggleBot" | "sendFollowup";
  userId: string;
  displayName?: string;
  detail: string;
  timestamp: number;
}

interface AdminStats {
  [username: string]: {
    sent: number;
    toggleBot: number;
    pin: number;
    lastActive: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อกี้";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
}

const ACTION_META: Record<
  AdminActivityEntry["action"],
  { label: string; color: string; icon: React.ReactNode }
> = {
  send:           { label: "ส่งข้อความ",      color: "bg-indigo-100 text-indigo-700", icon: <MessageSquare className="h-3 w-3" /> },
  sendFollowup:   { label: "Follow-up",        color: "bg-blue-100 text-blue-700",    icon: <MessageSquare className="h-3 w-3" /> },
  toggleBot:      { label: "Toggle Bot",       color: "bg-amber-100 text-amber-700",  icon: <ToggleRight className="h-3 w-3" /> },
  globalToggleBot:{ label: "Global Bot",       color: "bg-orange-100 text-orange-700",icon: <ToggleRight className="h-3 w-3" /> },
  pin:            { label: "ปักหมุด",          color: "bg-red-100 text-red-700",      icon: <Pin className="h-3 w-3" /> },
  unpin:          { label: "ถอดหมุด",          color: "bg-gray-100 text-gray-600",    icon: <Pin className="h-3 w-3" /> },
};

const USER_COLORS = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500",   "bg-cyan-500",    "bg-purple-500",
];

function userColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  username,
  stats,
}: {
  username: string;
  stats: { sent: number; toggleBot: number; pin: number; lastActive: number };
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0",
            userColor(username)
          )}
        >
          {username[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{username}</p>
          <p className="text-[11px] text-gray-400">
            {stats.lastActive > 0 ? `Active ${formatTimeAgo(stats.lastActive)}` : "ยังไม่มีกิจกรรม"}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-indigo-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-indigo-600">{stats.sent}</p>
          <p className="text-[10px] text-indigo-400">ข้อความ</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-amber-600">{stats.toggleBot}</p>
          <p className="text-[10px] text-amber-400">Toggle Bot</p>
        </div>
        <div className="bg-red-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-red-600">{stats.pin}</p>
          <p className="text-[10px] text-red-400">ปักหมุด</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity Log Row                                                   */
/* ------------------------------------------------------------------ */

function LogRow({ entry }: { entry: AdminActivityEntry }) {
  const meta = ACTION_META[entry.action];
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      {/* User avatar */}
      <div
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5",
          userColor(entry.username)
        )}
      >
        {entry.username[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-800 text-sm">{entry.username}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
              meta.color
            )}
          >
            {meta.icon}
            {meta.label}
          </span>
          {entry.displayName && (
            <span className="text-xs text-gray-500">→ {entry.displayName}</span>
          )}
        </div>
        {entry.detail && (
          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md" title={entry.detail}>
            {entry.detail}
          </p>
        )}
      </div>

      <span className="text-[10px] text-gray-400 shrink-0 mt-1">
        {formatDateTime(entry.timestamp)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main AdminMonitorPage                                              */
/* ------------------------------------------------------------------ */

export default function AdminMonitorPage({ businessId }: { businessId: string }) {
  const [stats, setStats] = useState<AdminStats>({});
  const [log, setLog] = useState<AdminActivityEntry[]>([]);
  const [filterUser, setFilterUser] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("7d");
  const [showAll, setShowAll] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const periodMs: Record<typeof period, number> = {
        today: Date.now() - 24 * 60 * 60 * 1000,
        "7d":  Date.now() - 7  * 24 * 60 * 60 * 1000,
        "30d": Date.now() - 30 * 24 * 60 * 60 * 1000,
      };
      const since = periodMs[period];
      const [statsRes, logRes] = await Promise.all([
        fetch(`/api/chat/admin?businessId=${businessId}&view=adminstats&since=${since}`),
        fetch(`/api/chat/admin?businessId=${businessId}&view=adminlog&limit=200`),
      ]);
      if (statsRes.ok) setStats((await statsRes.json()).stats ?? {});
      if (logRes.ok)   setLog((await logRes.json()).entries ?? []);
    } catch { /* silently fail */ }

    setLoading(false);
    setRefreshing(false);
  }, [businessId, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredLog = filterUser
    ? log.filter((e) => e.username === filterUser)
    : log;
  const displayedLog = showAll ? filteredLog : filteredLog.slice(0, 50);
  const usernames = Object.keys(stats);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              Admin Monitor
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">ติดตามกิจกรรมของทีมงาน</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Period selector */}
            {(["today", "7d", "30d"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                  period === p
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                {p === "today" ? "วันนี้" : p === "7d" ? "7 วัน" : "30 วัน"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">กำลังโหลด...</div>
        ) : (
          <>
            {/* Stat cards */}
            {usernames.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">ยังไม่มีข้อมูลกิจกรรม</p>
                <p className="text-xs mt-1">กิจกรรมจะแสดงเมื่อทีมงานเริ่มใช้งาน</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {usernames.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setFilterUser(filterUser === u ? "" : u)}
                    className={cn(
                      "text-left transition-all rounded-xl",
                      filterUser === u ? "ring-2 ring-indigo-500" : ""
                    )}
                  >
                    <StatCard username={u} stats={stats[u]} />
                  </button>
                ))}
              </div>
            )}

            {/* Filter bar */}
            {usernames.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">กรอง:</span>
                <button
                  type="button"
                  onClick={() => setFilterUser("")}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full font-medium transition-colors",
                    filterUser === ""
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  ทั้งหมด ({log.length})
                </button>
                {usernames.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setFilterUser(filterUser === u ? "" : u)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1",
                      filterUser === u
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        userColor(u)
                      )}
                    />
                    {u} ({log.filter((e) => e.username === u).length})
                  </button>
                ))}
              </div>
            )}

            {/* Activity Log */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">
                    Activity Log
                  </span>
                  <span className="text-xs text-gray-400">
                    ({filteredLog.length} รายการ)
                  </span>
                </div>
                {filterUser && (
                  <div className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-xs font-medium text-indigo-600">{filterUser}</span>
                    <button
                      type="button"
                      onClick={() => setFilterUser("")}
                      className="text-xs text-gray-400 hover:text-gray-600 ml-1"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="px-4 divide-y divide-gray-50">
                {filteredLog.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">ไม่มีกิจกรรม</p>
                ) : (
                  <>
                    {displayedLog.map((entry) => (
                      <LogRow key={entry.id} entry={entry} />
                    ))}
                    {filteredLog.length > 50 && (
                      <div className="py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setShowAll(!showAll)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mx-auto"
                        >
                          {showAll ? (
                            <><ChevronUp className="h-3.5 w-3.5" /> ย่อลง</>
                          ) : (
                            <><ChevronDown className="h-3.5 w-3.5" /> ดูทั้งหมด {filteredLog.length} รายการ</>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
