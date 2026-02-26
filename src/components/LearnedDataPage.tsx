"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, Trash2, ToggleLeft, ToggleRight, RefreshCw, TrendingUp, BookOpen, Zap, FileText, AlertCircle } from "lucide-react";
import type { LearnedIntent, LearnedKnowledge, LearnedScript, MissEntry } from "@/lib/learnedStore";

interface Props {
  businessId: string;
}

interface LearnedStats {
  totalIntents: number;
  totalKnowledge: number;
  totalScripts: number;
  totalMissTypes: number;
  topMisses: MissEntry[];
}

type TabId = "intents" | "knowledge" | "scripts" | "misses";

export default function LearnedDataPage({ businessId }: Props) {
  const [tab, setTab] = useState<TabId>("intents");
  const [intents, setIntents] = useState<LearnedIntent[]>([]);
  const [knowledge, setKnowledge] = useState<LearnedKnowledge[]>([]);
  const [scripts, setScripts] = useState<LearnedScript[]>([]);
  const [stats, setStats] = useState<LearnedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
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

  useEffect(() => { void load(); }, [load]);

  const handleAction = async (
    type: "intent" | "knowledge" | "script",
    id: string,
    action: "enable" | "disable" | "delete"
  ) => {
    await fetch("/api/learn", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, type, id, action }),
    });
    void load();
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "intents",   label: "Intent Triggers", icon: <Zap className="h-4 w-4" />,     count: intents.length },
    { id: "knowledge", label: "Knowledge Docs",  icon: <BookOpen className="h-4 w-4" />, count: knowledge.length },
    { id: "scripts",   label: "Sale Scripts",    icon: <FileText className="h-4 w-4" />, count: scripts.length },
    { id: "misses",    label: "Miss Tracker",    icon: <TrendingUp className="h-4 w-4" />, count: stats?.totalMissTypes ?? 0 },
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
              <p className="text-xs text-gray-500">บอทเรียนรู้จากการแก้ไขของ admin อัตโนมัติ</p>
            </div>
          </div>
          <button
            onClick={() => void load()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {[
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
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-4">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <>
            {/* Intent Triggers */}
            {tab === "intents" && (
              <div className="space-y-3">
                {intents.length === 0 ? (
                  <EmptyState label="ยังไม่มี intent ที่เรียนรู้" icon={<Zap className="h-8 w-8" />} />
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
                    onEnable={() => handleAction("intent", item.id, "enable")}
                    onDisable={() => handleAction("intent", item.id, "disable")}
                    onDelete={() => handleAction("intent", item.id, "delete")}
                  />
                ))}
              </div>
            )}

            {/* Knowledge Docs */}
            {tab === "knowledge" && (
              <div className="space-y-3">
                {knowledge.length === 0 ? (
                  <EmptyState label="ยังไม่มี knowledge doc ที่เรียนรู้" icon={<BookOpen className="h-8 w-8" />} />
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
                    onEnable={() => handleAction("knowledge", item.id, "enable")}
                    onDisable={() => handleAction("knowledge", item.id, "disable")}
                    onDelete={() => handleAction("knowledge", item.id, "delete")}
                  />
                ))}
              </div>
            )}

            {/* Sale Scripts */}
            {tab === "scripts" && (
              <div className="space-y-3">
                {scripts.length === 0 ? (
                  <EmptyState label="ยังไม่มี script ที่เรียนรู้" icon={<FileText className="h-8 w-8" />} />
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
                    onEnable={() => handleAction("script", item.id, "enable")}
                    onDisable={() => handleAction("script", item.id, "disable")}
                    onDelete={() => handleAction("script", item.id, "delete")}
                  />
                ))}
              </div>
            )}

            {/* Miss Tracker */}
            {tab === "misses" && (
              <div className="space-y-3">
                {!stats?.topMisses?.length ? (
                  <EmptyState label="ยังไม่มีคำถามที่พลาด" icon={<TrendingUp className="h-8 w-8" />} />
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

function EmptyState({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
      <div className="opacity-30">{icon}</div>
      <p className="text-sm">{label}</p>
      <p className="text-xs text-gray-400">เมื่อ admin แก้ไขคำตอบ bot ระบบจะเรียนรู้อัตโนมัติครับ</p>
    </div>
  );
}
