"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain, Trash2, ToggleLeft, ToggleRight, RefreshCw,
  TrendingUp, BookOpen, Zap, FileText, AlertCircle,
  ThumbsUp, ThumbsDown, ClipboardList, DatabaseZap,
} from "lucide-react";
import type { LearnedIntent, LearnedKnowledge, LearnedScript, MissEntry, QALogEntry } from "@/lib/learnedStore";

interface Props {
  businessId: string;
}

interface LearnedStats {
  totalIntents: number;
  totalKnowledge: number;
  totalScripts: number;
  totalMissTypes: number;
  topMisses: MissEntry[];
  pendingReview: number;
}

type TabId = "review" | "intents" | "knowledge" | "scripts" | "misses";

export default function LearnedDataPage({ businessId }: Props) {
  const [tab, setTab] = useState<TabId>("review");
  const [intents, setIntents] = useState<LearnedIntent[]>([]);
  const [knowledge, setKnowledge] = useState<LearnedKnowledge[]>([]);
  const [scripts, setScripts] = useState<LearnedScript[]>([]);
  const [stats, setStats] = useState<LearnedStats | null>(null);
  const [qaLog, setQaLog] = useState<QALogEntry[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const loadLearnedData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/learn?businessId=${businessId}`, {
        headers: { "x-internal-secret": "chatbot-internal" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as {
        intents: LearnedIntent[];
        knowledge: LearnedKnowledge[];
        scripts: LearnedScript[];
        stats: LearnedStats;
      };
      setIntents(data.intents ?? []);
      setKnowledge(data.knowledge ?? []);
      setScripts(data.scripts ?? []);
      setStats(data.stats ?? null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const loadQALog = useCallback(async () => {
    setQaLoading(true);
    try {
      const res = await fetch(
        `/api/chat/admin?businessId=${businessId}&view=qalog&limit=100`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { entries: QALogEntry[]; pendingCount: number };
      setQaLog(data.entries ?? []);
    } catch {
      // non-fatal
    } finally {
      setQaLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadLearnedData();
    void loadQALog();
  }, [loadLearnedData, loadQALog]);

  const handleLearnedAction = async (
    type: "intent" | "knowledge" | "script",
    id: string,
    action: "enable" | "disable" | "delete",
  ) => {
    await fetch("/api/learn", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, type, id, action }),
    });
    void loadLearnedData();
  };

  const handleReview = async (qaId: string, verdict: "approved" | "rejected") => {
    setReviewingId(qaId);
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          action: verdict === "approved" ? "approveQA" : "rejectQA",
          qaId,
        }),
      });
      // Update local state optimistically
      setQaLog((prev) =>
        prev.map((e) => (e.id === qaId ? { ...e, reviewStatus: verdict } : e)),
      );
      if (verdict === "rejected") {
        // Reload stats after a short delay (retrain is async)
        setTimeout(() => { void loadLearnedData(); }, 2000);
      }
    } finally {
      setReviewingId(null);
    }
  };

  const handleBackfill = async (dryRun = false) => {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/learn/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, dryRun }),
      });
      const data = await res.json() as { message?: string; skipped?: boolean; reason?: string; backfilled?: number; previousCount?: number };
      if (data.skipped) {
        setBackfillResult(`ดำเนินการแล้วก่อนหน้า (${data.previousCount ?? 0} รายการ) — ลบ flag หรือติดต่อ dev เพื่อรันใหม่`);
      } else {
        setBackfillResult(data.message ?? "เสร็จแล้ว");
        if (!dryRun) void loadQALog();
      }
    } catch (e) {
      setBackfillResult(`Error: ${String(e)}`);
    } finally {
      setBackfilling(false);
    }
  };

  const pendingCount = qaLog.filter((e) => e.reviewStatus === "pending").length;

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "review",    label: "Review Queue",   icon: <ClipboardList className="h-4 w-4" />, count: pendingCount },
    { id: "intents",   label: "Intent Triggers", icon: <Zap className="h-4 w-4" />,          count: intents.length },
    { id: "knowledge", label: "Knowledge Docs",  icon: <BookOpen className="h-4 w-4" />,      count: knowledge.length },
    { id: "scripts",   label: "Sale Scripts",    icon: <FileText className="h-4 w-4" />,      count: scripts.length },
    { id: "misses",    label: "Miss Tracker",    icon: <TrendingUp className="h-4 w-4" />,    count: stats?.totalMissTypes ?? 0 },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Auto-Learn</h1>
              <p className="text-xs text-gray-500">ทบทวนคำตอบของบอท — กด ✓ ถ้าถูก / ✗ ถ้าผิด แล้วระบบจะเรียนรู้เอง</p>
            </div>
          </div>
          <button
            onClick={() => { void loadLearnedData(); void loadQALog(); }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${(loading || qaLoading) ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="mt-4 grid grid-cols-5 gap-3">
            {[
              { label: "รอ Review", value: pendingCount, color: "yellow" },
              { label: "Intent ใหม่", value: stats.totalIntents, color: "blue" },
              { label: "Knowledge ใหม่", value: stats.totalKnowledge, color: "green" },
              { label: "Script ใหม่", value: stats.totalScripts, color: "orange" },
              { label: "คำถามที่พลาด", value: stats.totalMissTypes, color: "red" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                  t.id === "review" && t.count > 0
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-4 mb-4">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* ── Review Queue ── */}
        {tab === "review" && (
          <div className="space-y-3">
            {/* Backfill banner */}
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <DatabaseZap className="h-4 w-4 text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-800">ย้อนดูแชทเก่า</p>
                <p className="text-xs text-blue-600">โหลดบทสนทนาทั้งหมดที่มีอยู่ใน Redis เพื่อ review</p>
                {backfillResult && (
                  <p className="text-xs text-blue-700 mt-1 font-medium">{backfillResult}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => void handleBackfill(true)}
                  disabled={backfilling}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-300 text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50 transition-colors"
                >
                  Preview
                </button>
                <button
                  onClick={() => void handleBackfill(false)}
                  disabled={backfilling}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {backfilling ? <RefreshCw className="h-3 w-3 animate-spin" /> : <DatabaseZap className="h-3 w-3" />}
                  โหลดแชทเก่า
                </button>
              </div>
            </div>

            {qaLoading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : qaLog.length === 0 ? (
              <EmptyState
                label="ยังไม่มีบทสนทนาที่บันทึกไว้"
                icon={<ClipboardList className="h-8 w-8" />}
                hint="กด 'โหลดแชทเก่า' ด้านบนเพื่อดึงข้อมูลบทสนทนาที่มีอยู่ทั้งหมด"
              />
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-1">
                  กด <ThumbsUp className="inline h-3 w-3 text-green-600" /> ถ้าบอทตอบถูก &nbsp;|&nbsp;
                  กด <ThumbsDown className="inline h-3 w-3 text-red-600" /> ถ้าบอทตอบผิด → ระบบจะเรียนรู้อัตโนมัติ
                </p>
                {qaLog.map((entry) => (
                  <QACard
                    key={entry.id}
                    entry={entry}
                    onApprove={() => void handleReview(entry.id, "approved")}
                    onReject={() => void handleReview(entry.id, "rejected")}
                    isReviewing={reviewingId === entry.id}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {loading && tab !== "review" ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Intent Triggers */}
            {tab === "intents" && (
              <div className="space-y-3">
                {intents.length === 0 ? (
                  <EmptyState label="ยังไม่มี intent ที่เรียนรู้" icon={<Zap className="h-8 w-8" />} hint="เมื่อ admin mark ❌ ระบบจะ generate intent ใหม่อัตโนมัติ" />
                ) : intents.map((item) => (
                  <LearnedCard
                    key={item.id}
                    title={item.intentName}
                    subtitle={`Intent ID: ${item.intentId} · Confidence: ${(item.confidence * 100).toFixed(0)}%`}
                    triggers={item.triggers}
                    response={item.responseTemplate}
                    source={item.sourceQuestion}
                    hitCount={item.hitCount}
                    enabled={item.enabled}
                    createdAt={item.createdAt}
                    onEnable={() => handleLearnedAction("intent", item.id, "enable")}
                    onDisable={() => handleLearnedAction("intent", item.id, "disable")}
                    onDelete={() => handleLearnedAction("intent", item.id, "delete")}
                  />
                ))}
              </div>
            )}

            {/* Knowledge Docs */}
            {tab === "knowledge" && (
              <div className="space-y-3">
                {knowledge.length === 0 ? (
                  <EmptyState label="ยังไม่มี knowledge doc ที่เรียนรู้" icon={<BookOpen className="h-8 w-8" />} hint="เมื่อ admin mark ❌ ระบบจะ generate knowledge ใหม่อัตโนมัติ" />
                ) : knowledge.map((item) => (
                  <LearnedCard
                    key={item.id}
                    title={item.title}
                    subtitle={`Confidence: ${(item.confidence * 100).toFixed(0)}%`}
                    triggers={item.triggers}
                    response={item.content}
                    source={item.sourceQuestion}
                    hitCount={item.hitCount}
                    enabled={item.enabled}
                    createdAt={item.createdAt}
                    onEnable={() => handleLearnedAction("knowledge", item.id, "enable")}
                    onDisable={() => handleLearnedAction("knowledge", item.id, "disable")}
                    onDelete={() => handleLearnedAction("knowledge", item.id, "delete")}
                  />
                ))}
              </div>
            )}

            {/* Sale Scripts */}
            {tab === "scripts" && (
              <div className="space-y-3">
                {scripts.length === 0 ? (
                  <EmptyState label="ยังไม่มี script ที่เรียนรู้" icon={<FileText className="h-8 w-8" />} hint="เมื่อ admin mark ❌ ระบบจะ generate script ใหม่อัตโนมัติ" />
                ) : scripts.map((item) => (
                  <LearnedCard
                    key={item.id}
                    title={item.name}
                    subtitle={`Confidence: ${(item.confidence * 100).toFixed(0)}%`}
                    triggers={item.triggers}
                    response={item.adminReply}
                    source={item.sourceQuestion}
                    hitCount={item.hitCount}
                    enabled={item.enabled}
                    createdAt={item.createdAt}
                    onEnable={() => handleLearnedAction("script", item.id, "enable")}
                    onDisable={() => handleLearnedAction("script", item.id, "disable")}
                    onDelete={() => handleLearnedAction("script", item.id, "delete")}
                  />
                ))}
              </div>
            )}

            {/* Miss Tracker */}
            {tab === "misses" && (
              <div className="space-y-3">
                {!stats?.topMisses?.length ? (
                  <EmptyState label="ยังไม่มีคำถามที่พลาด" icon={<TrendingUp className="h-8 w-8" />} hint="คำถามที่บอทตอบผิดจะปรากฏที่นี่" />
                ) : stats.topMisses.map((miss, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {miss.normalizedQuestion}
                          </span>
                          <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            {miss.count} ครั้ง
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {miss.examples.map((ex, j) => (
                            <span key={j} className="px-2 py-0.5 text-xs rounded-md bg-gray-100 text-gray-600">
                              {ex.slice(0, 50)}{ex.length > 50 ? "…" : ""}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          ล่าสุด: {new Date(miss.lastSeenAt).toLocaleString("th-TH")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Q&A Review Card ───────────────────────────────────────────────────

interface QACardProps {
  entry: QALogEntry;
  onApprove: () => void;
  onReject: () => void;
  isReviewing: boolean;
}

function QACard({ entry, onApprove, onReject, isReviewing }: QACardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusColors = {
    pending:  "bg-yellow-50 border-yellow-200",
    approved: "bg-green-50 border-green-200 opacity-70",
    rejected: "bg-red-50 border-red-200 opacity-70",
  };
  const statusLabel = {
    pending:  null,
    approved: <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">ถูก</span>,
    rejected: <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">ผิด — กำลังเรียนรู้</span>,
  };

  return (
    <div className={`rounded-xl border p-4 transition-all ${statusColors[entry.reviewStatus]}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Question */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500">ลูกค้าถาม:</span>
            <span className="text-sm font-semibold text-gray-900">{entry.userQuestion}</span>
            {statusLabel[entry.reviewStatus]}
          </div>

          {/* Layer badge */}
          <div className="mt-1">
            <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">{entry.layer}</span>
            <span className="ml-2 text-xs text-gray-400">{new Date(entry.timestamp).toLocaleString("th-TH")}</span>
          </div>

          {/* Bot answer (expandable) */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-purple-600 hover:underline"
          >
            {expanded ? "ซ่อนคำตอบ" : "ดูคำตอบของบอท"}
          </button>
          {expanded && (
            <div className="mt-2 text-sm text-gray-800 bg-white rounded-lg p-3 whitespace-pre-wrap border border-gray-200">
              {entry.botAnswer}
            </div>
          )}
        </div>

        {/* Review buttons — only shown for pending */}
        {entry.reviewStatus === "pending" && (
          <div className="shrink-0 flex gap-2">
            <button
              onClick={onApprove}
              disabled={isReviewing}
              className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50"
              title="ตอบถูก"
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              onClick={onReject}
              disabled={isReviewing}
              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              title="ตอบผิด — เรียนรู้ใหม่"
            >
              <ThumbsDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

interface LearnedCardProps {
  title: string;
  subtitle: string;
  triggers: string[];
  response: string;
  source: string;
  hitCount: number;
  enabled: boolean;
  createdAt: number;
  onEnable: () => void;
  onDisable: () => void;
  onDelete: () => void;
}

function LearnedCard({
  title, subtitle, triggers, response, source,
  hitCount, enabled, createdAt, onEnable, onDisable, onDelete,
}: LearnedCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white rounded-xl border transition-all ${enabled ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
      <div className="flex items-start gap-3 p-4">
        {/* Toggle */}
        <button
          onClick={enabled ? onDisable : onEnable}
          className="shrink-0 mt-0.5 text-gray-400 hover:text-gray-600 transition-colors"
          title={enabled ? "ปิดใช้งาน" : "เปิดใช้งาน"}
        >
          {enabled
            ? <ToggleRight className="h-5 w-5 text-purple-500" />
            : <ToggleLeft className="h-5 w-5" />
          }
        </button>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{title}</span>
            {hitCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-purple-50 text-purple-600">
                ใช้แล้ว {hitCount} ครั้ง
              </span>
            )}
            {!enabled && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">ปิด</span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>

          {/* Triggers */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {triggers.map((tr, i) => (
              <span key={i} className="px-2 py-0.5 text-xs rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                {tr}
              </span>
            ))}
          </div>

          {/* Expand */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-purple-600 hover:underline"
          >
            {expanded ? "ซ่อน" : "ดูเนื้อหา"}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">คำตอบที่เรียนรู้:</div>
                <div className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap border border-gray-100">
                  {response}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">จากคำถามของลูกค้า:</div>
                <div className="text-sm text-gray-600 italic">"{source}"</div>
              </div>
              <div className="text-xs text-gray-400">
                เรียนรู้เมื่อ: {new Date(createdAt).toLocaleString("th-TH")}
              </div>
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="ลบ"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ label, icon, hint }: { label: string; icon: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
      <div className="opacity-30">{icon}</div>
      <p className="text-sm">{label}</p>
      {hint && <p className="text-xs text-gray-400 text-center max-w-xs">{hint}</p>}
    </div>
  );
}
