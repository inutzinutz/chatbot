"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, RefreshCw, TrendingUp, Trophy, Flame, Snowflake,
  UserCheck, ShoppingCart, X, ChevronRight, Phone, Mail, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CRMProfile } from "@/lib/chatStore";

/* ------------------------------------------------------------------ */
/*  C1: Sales Kanban Board                                             */
/*  Columns: Lead → Prospect → Customer → Churned                     */
/*  Drag & drop cards between columns to update CRM stage             */
/* ------------------------------------------------------------------ */

interface KanbanPageProps {
  businessId: string;
}

type Stage = "lead" | "prospect" | "customer" | "churned";

const COLUMNS: { id: Stage; label: string; color: string; bg: string; icon: React.ReactNode }[] = [
  { id: "lead",     label: "Lead",     color: "text-gray-600",    bg: "bg-gray-100",    icon: <Users className="h-4 w-4" /> },
  { id: "prospect", label: "Prospect", color: "text-indigo-600",  bg: "bg-indigo-50",   icon: <TrendingUp className="h-4 w-4" /> },
  { id: "customer", label: "Customer", color: "text-emerald-600", bg: "bg-emerald-50",  icon: <UserCheck className="h-4 w-4" /> },
  { id: "churned",  label: "Churned",  color: "text-red-500",     bg: "bg-red-50",      icon: <X className="h-4 w-4" /> },
];

const INTENT_MAP: Record<string, { label: string; cls: string }> = {
  hot:       { label: "Hot 🔥", cls: "bg-red-100 text-red-700 border-red-200" },
  warm:      { label: "Warm",   cls: "bg-orange-100 text-orange-700 border-orange-200" },
  cold:      { label: "Cold",   cls: "bg-blue-100 text-blue-700 border-blue-200" },
  purchased: { label: "Bought", cls: "bg-green-100 text-green-700 border-green-200" },
};

function IntentPill({ intent }: { intent?: CRMProfile["purchaseIntent"] }) {
  if (!intent) return null;
  const m = INTENT_MAP[intent];
  return (
    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-semibold", m.cls)}>
      {m.label}
    </span>
  );
}

function KanbanCard({
  profile,
  onDragStart,
  onClick,
}: {
  profile: CRMProfile;
  onDragStart: (e: React.DragEvent, profile: CRMProfile) => void;
  onClick: (p: CRMProfile) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, profile)}
      onClick={() => onClick(profile)}
      className="bg-white rounded-xl border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-indigo-200 transition-all select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-900 truncate">
            {profile.name || <span className="text-gray-400 italic">ไม่ระบุชื่อ</span>}
          </p>
          {profile.phone && (
            <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
              <Phone className="h-2.5 w-2.5" />{profile.phone}
            </p>
          )}
        </div>
        <IntentPill intent={profile.purchaseIntent} />
      </div>

      {/* Products */}
      {profile.interestedProducts && profile.interestedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {profile.interestedProducts.slice(0, 2).map((p) => (
            <span key={p} className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full">
              {p}
            </span>
          ))}
          {profile.interestedProducts.length > 2 && (
            <span className="text-[9px] text-gray-400">+{profile.interestedProducts.length - 2}</span>
          )}
        </div>
      )}

      {/* Tags */}
      {profile.tags && profile.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {profile.tags.slice(0, 2).map((t) => (
            <span key={t} className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Tag className="h-2 w-2" />{t}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
        <span className="text-[9px] text-gray-300">
          {profile.updatedAt
            ? new Date(profile.updatedAt).toLocaleDateString("th-TH", { month: "short", day: "numeric" })
            : "—"}
        </span>
        {profile.budget && (
          <span className="text-[9px] text-emerald-600 font-medium">{profile.budget}</span>
        )}
      </div>
    </div>
  );
}

// Quick edit modal (click on card)
function CardModal({
  profile,
  businessId,
  onClose,
  onSaved,
}: {
  profile: CRMProfile;
  businessId: string;
  onClose: () => void;
  onSaved: (p: CRMProfile) => void;
}) {
  const [form, setForm] = useState<CRMProfile>(profile);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", businessId, profile: form }),
      });
      onSaved(form);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">{profile.name || "แก้ไขโปรไฟล์"}</h3>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>

        {/* Stage */}
        <div className="space-y-1">
          <p className="text-[10px] text-gray-400">Stage</p>
          <div className="grid grid-cols-4 gap-1">
            {COLUMNS.map((col) => (
              <button
                key={col.id}
                onClick={() => setForm((f) => ({ ...f, stage: col.id }))}
                className={cn(
                  "py-1.5 text-[10px] font-semibold rounded-lg border transition-all",
                  form.stage === col.id
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
              >
                {col.label}
              </button>
            ))}
          </div>
        </div>

        {/* Intent */}
        <div className="space-y-1">
          <p className="text-[10px] text-gray-400">Purchase Intent</p>
          <div className="grid grid-cols-4 gap-1">
            {Object.entries(INTENT_MAP).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setForm((f) => ({ ...f, purchaseIntent: k as CRMProfile["purchaseIntent"] }))}
                className={cn(
                  "py-1.5 text-[9px] font-semibold rounded-lg border transition-all",
                  form.purchaseIntent === k
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="space-y-1">
          <p className="text-[10px] text-gray-400">งบประมาณ</p>
          <input
            value={form.budget ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
            placeholder="เช่น 50,000 บาท"
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">ยกเลิก</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 text-xs rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "บันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KanbanPage({ businessId }: KanbanPageProps) {
  const [profiles, setProfiles] = useState<CRMProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<CRMProfile | null>(null);
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const [selected, setSelected] = useState<CRMProfile | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm?businessId=${encodeURIComponent(businessId)}&view=all`);
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles ?? []);
      }
    } catch {}
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const handleDragStart = (e: React.DragEvent, profile: CRMProfile) => {
    setDragging(profile);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (targetStage: Stage) => {
    if (!dragging || dragging.stage === targetStage) {
      setDragging(null);
      setDragOver(null);
      return;
    }

    const updated: CRMProfile = { ...dragging, stage: targetStage, updatedAt: Date.now() };
    // Optimistic update
    setProfiles((prev) => prev.map((p) => p.userId === dragging.userId ? updated : p));
    setDragging(null);
    setDragOver(null);

    try {
      await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", businessId, profile: updated }),
      });
    } catch {
      // Revert on error
      fetchProfiles();
    }
  };

  const handleSaved = (updated: CRMProfile) => {
    setProfiles((prev) => prev.map((p) => p.userId === updated.userId ? updated : p));
    setSelected(null);
  };

  // Stats
  const byStage = (stage: Stage) => profiles.filter((p) => (p.stage ?? "lead") === stage);
  const noStage = profiles.filter((p) => !p.stage);
  // "lead" column shows both explicit leads and unassigned
  const getColumn = (stage: Stage) => stage === "lead"
    ? [...byStage("lead"), ...noStage]
    : byStage(stage);

  // Summary stats
  const hotCount = profiles.filter((p) => p.purchaseIntent === "hot").length;
  const purchasedCount = profiles.filter((p) => p.purchaseIntent === "purchased").length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-indigo-600" />
            Sales Pipeline
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">ลาก card เพื่อเปลี่ยน Stage</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg">
            <Flame className="h-3.5 w-3.5" />{hotCount} Hot
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
            <Trophy className="h-3.5 w-3.5" />{purchasedCount} Purchased
          </div>
          <button
            onClick={fetchProfiles}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full min-w-[800px]">
          {COLUMNS.map((col) => {
            const cards = getColumn(col.id);
            const isDragTarget = dragOver === col.id;
            return (
              <div
                key={col.id}
                className="flex flex-col w-[220px] shrink-0"
                onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.id)}
              >
                {/* Column header */}
                <div className={cn("flex items-center justify-between px-3 py-2.5 rounded-xl mb-3", col.bg)}>
                  <div className={cn("flex items-center gap-2 font-semibold text-sm", col.color)}>
                    {col.icon}
                    {col.label}
                  </div>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full bg-white", col.color)}>
                    {cards.length}
                  </span>
                </div>

                {/* Drop zone */}
                <div
                  className={cn(
                    "flex-1 space-y-2.5 rounded-xl transition-all min-h-[200px] p-1",
                    isDragTarget && "bg-indigo-50/60 ring-2 ring-indigo-300 ring-dashed"
                  )}
                >
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="h-5 w-5 border-2 border-indigo-300/30 border-t-indigo-400 rounded-full animate-spin" />
                    </div>
                  ) : cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                      <Snowflake className="h-8 w-8 mb-2" />
                      <p className="text-xs">ว่างอยู่</p>
                    </div>
                  ) : (
                    cards.map((p) => (
                      <KanbanCard
                        key={p.userId}
                        profile={p}
                        onDragStart={handleDragStart}
                        onClick={setSelected}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card quick-edit modal */}
      {selected && (
        <CardModal
          profile={selected}
          businessId={businessId}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
