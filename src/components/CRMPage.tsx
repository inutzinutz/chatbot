"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Download,
  RefreshCw,
  Phone,
  Mail,
  Package,
  Flame,
  TrendingUp,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
  MapPin,
  Briefcase,
  ShoppingBag,
  User,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CRMProfile } from "@/lib/chatStore";

interface CRMPageProps {
  businessId: string;
}

// ── Intent badge ──
function IntentBadge({ intent }: { intent?: CRMProfile["purchaseIntent"] }) {
  if (!intent) return <span className="text-[10px] text-gray-300">—</span>;
  const map: Record<string, string> = {
    hot:       "bg-red-100 text-red-700 border-red-200",
    warm:      "bg-orange-100 text-orange-700 border-orange-200",
    cold:      "bg-blue-100 text-blue-700 border-blue-200",
    purchased: "bg-green-100 text-green-700 border-green-200",
  };
  const label: Record<string, string> = {
    hot: "Hot 🔥", warm: "Warm", cold: "Cold", purchased: "ซื้อแล้ว ✓",
  };
  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold", map[intent])}>
      {label[intent]}
    </span>
  );
}

// ── Stage badge ──
function StageBadge({ stage }: { stage?: CRMProfile["stage"] }) {
  if (!stage) return <span className="text-[10px] text-gray-300">—</span>;
  const map: Record<string, string> = {
    lead:     "bg-gray-100 text-gray-600 border-gray-200",
    prospect: "bg-indigo-100 text-indigo-700 border-indigo-200",
    customer: "bg-emerald-100 text-emerald-700 border-emerald-200",
    churned:  "bg-red-50 text-red-500 border-red-100",
  };
  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold", map[stage])}>
      {stage.charAt(0).toUpperCase() + stage.slice(1)}
    </span>
  );
}

// ── Detail Modal ──
function ProfileModal({
  profile,
  onClose,
  onSave,
}: {
  profile: CRMProfile;
  onClose: () => void;
  onSave: (p: CRMProfile) => void;
}) {
  const [form, setForm] = useState<CRMProfile>(profile);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [productInput, setProductInput] = useState("");

  const handleSave = async () => {
    setSaving(true);
    onSave(form);
    setSaving(false);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    setForm((f) => ({ ...f, tags: [...(f.tags ?? []), t] }));
    setTagInput("");
  };

  const removeTag = (t: string) =>
    setForm((f) => ({ ...f, tags: f.tags?.filter((x) => x !== t) }));

  const addProduct = () => {
    const p = productInput.trim();
    if (!p) return;
    setForm((f) => ({ ...f, interestedProducts: [...(f.interestedProducts ?? []), p] }));
    setProductInput("");
  };

  const removeProduct = (p: string) =>
    setForm((f) => ({ ...f, interestedProducts: f.interestedProducts?.filter((x) => x !== p) }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-900">{profile.name || profile.userId.slice(0, 16)}</h3>
            <IntentBadge intent={profile.purchaseIntent} />
            <StageBadge stage={profile.stage} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-3">
            <FormField icon={<User className="h-3.5 w-3.5" />} label="ชื่อจริง" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="ชื่อ-นามสกุล" />
            <FormField icon={<Phone className="h-3.5 w-3.5" />} label="เบอร์โทร" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="0XX-XXX-XXXX" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="email@example.com" />
            <FormField icon={<MapPin className="h-3.5 w-3.5" />} label="จังหวัด" value={form.province} onChange={(v) => setForm((f) => ({ ...f, province: v }))} placeholder="กรุงเทพฯ" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField icon={<Briefcase className="h-3.5 w-3.5" />} label="อาชีพ" value={form.occupation} onChange={(v) => setForm((f) => ({ ...f, occupation: v }))} placeholder="พนักงานบริษัท" />
            <FormField icon={<ShoppingBag className="h-3.5 w-3.5" />} label="งบประมาณ" value={form.budget} onChange={(v) => setForm((f) => ({ ...f, budget: v }))} placeholder="10,000 บาท" />
          </div>

          {/* Intent + Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 flex items-center gap-1"><Flame className="h-3 w-3" /> ระดับความสนใจ</p>
              <select
                value={form.purchaseIntent ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, purchaseIntent: (e.target.value as CRMProfile["purchaseIntent"]) || undefined }))}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="">— ยังไม่ระบุ —</option>
                <option value="hot">🔥 Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
                <option value="purchased">✓ ซื้อแล้ว</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Stage</p>
              <select
                value={form.stage ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, stage: (e.target.value as CRMProfile["stage"]) || undefined }))}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="">— ยังไม่ระบุ —</option>
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="customer">Customer</option>
                <option value="churned">Churned</option>
              </select>
            </div>
          </div>

          {/* Interested Products */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-gray-400 flex items-center gap-1"><Package className="h-3 w-3" /> สินค้าที่สนใจ</p>
            <div className="flex flex-wrap gap-1 min-h-[24px]">
              {form.interestedProducts?.map((p) => (
                <span key={p} className="flex items-center gap-0.5 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                  {p}
                  <button onClick={() => removeProduct(p)} className="ml-0.5 text-indigo-400 hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                value={productInput}
                onChange={(e) => setProductInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addProduct()}
                placeholder="เพิ่มสินค้า..."
                className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-300"
              />
              <button onClick={addProduct} className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100">เพิ่ม</button>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-gray-400 flex items-center gap-1"><Tag className="h-3 w-3" /> Tags</p>
            <div className="flex flex-wrap gap-1 min-h-[24px]">
              {form.tags?.map((t) => (
                <span key={t} className="flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full">
                  {t}
                  <button onClick={() => removeTag(t)} className="ml-0.5 text-amber-400 hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="เพิ่ม tag เช่น VIP..."
                className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-300"
              />
              <button onClick={addTag} className="px-2 py-1 text-xs bg-amber-50 text-amber-600 rounded-md hover:bg-amber-100">เพิ่ม</button>
            </div>
          </div>

          {/* Metadata */}
          {(profile.extractedAt || profile.updatedAt) && (
            <p className="text-[10px] text-gray-300 border-t border-gray-50 pt-2">
              {profile.extractedAt && `AI extract: ${new Date(profile.extractedAt).toLocaleString("th-TH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
              {profile.updatedBy && profile.updatedBy !== "auto" && ` · แก้โดย ${profile.updatedBy}`}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  icon, label, value, onChange, placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-gray-400 flex items-center gap-1">{icon} {label}</p>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
    </div>
  );
}

// ── Sort helper ──
type SortKey = "updatedAt" | "name" | "purchaseIntent" | "stage";
type SortDir = "asc" | "desc";

const INTENT_ORDER: Record<string, number> = { hot: 0, warm: 1, cold: 2, purchased: 3 };
const STAGE_ORDER: Record<string, number>  = { customer: 0, prospect: 1, lead: 2, churned: 3 };

function sortProfiles(profiles: CRMProfile[], key: SortKey, dir: SortDir): CRMProfile[] {
  return [...profiles].sort((a, b) => {
    let diff = 0;
    if (key === "updatedAt") {
      diff = (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    } else if (key === "name") {
      diff = (a.name ?? "").localeCompare(b.name ?? "", "th");
    } else if (key === "purchaseIntent") {
      diff = (INTENT_ORDER[a.purchaseIntent ?? ""] ?? 99) - (INTENT_ORDER[b.purchaseIntent ?? ""] ?? 99);
    } else if (key === "stage") {
      diff = (STAGE_ORDER[a.stage ?? ""] ?? 99) - (STAGE_ORDER[b.stage ?? ""] ?? 99);
    }
    return dir === "asc" ? diff : -diff;
  });
}

export default function CRMPage({ businessId }: CRMPageProps) {
  const [profiles, setProfiles] = useState<CRMProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterIntent, setFilterIntent] = useState<string>("");
  const [filterStage, setFilterStage] = useState<string>("");
  const [filterHasPhone, setFilterHasPhone] = useState<boolean | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedProfile, setSelectedProfile] = useState<CRMProfile | null>(null);
  const [exporting, setExporting] = useState(false);

  // ── Fetch all profiles ──
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

  // ── Save profile (from modal) ──
  const handleSave = async (profile: CRMProfile) => {
    try {
      await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", businessId, profile }),
      });
      await fetchProfiles();
    } catch {}
    setSelectedProfile(null);
  };

  // ── Export CSV ──
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/crm?businessId=${encodeURIComponent(businessId)}&view=export`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `crm_${businessId}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {}
    setExporting(false);
  };

  // ── Toggle sort ──
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // ── Filter + Sort ──
  const visible = sortProfiles(
    profiles.filter((p) => {
      if (searchText) {
        const q = searchText.toLowerCase();
        const match =
          (p.name ?? "").toLowerCase().includes(q) ||
          (p.phone ?? "").includes(q) ||
          (p.email ?? "").toLowerCase().includes(q) ||
          (p.interestedProducts ?? []).some((x) => x.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (filterIntent && p.purchaseIntent !== filterIntent) return false;
      if (filterStage && p.stage !== filterStage) return false;
      if (filterHasPhone === true && !p.phone) return false;
      if (filterHasPhone === false && p.phone) return false;
      return true;
    }),
    sortKey,
    sortDir
  );

  // ── Summary stats ──
  const stats = {
    total:    profiles.length,
    hot:      profiles.filter((p) => p.purchaseIntent === "hot").length,
    warm:     profiles.filter((p) => p.purchaseIntent === "warm").length,
    withPhone: profiles.filter((p) => p.phone).length,
    customers: profiles.filter((p) => p.stage === "customer").length,
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
    ) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              CRM Contacts
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">ข้อมูลลูกค้าที่ AI สกัดจากบทสนทนา LINE</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchProfiles}
              className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || profiles.length === 0}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-all",
                !exporting && profiles.length > 0
                  ? "bg-white border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
                  : "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
              )}
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "ทั้งหมด",    value: stats.total,     color: "text-gray-700",    bg: "bg-white" },
            { label: "Hot 🔥",     value: stats.hot,       color: "text-red-600",     bg: "bg-red-50" },
            { label: "Warm",       value: stats.warm,      color: "text-orange-600",  bg: "bg-orange-50" },
            { label: "มีเบอร์",    value: stats.withPhone, color: "text-indigo-600",  bg: "bg-indigo-50" },
            { label: "Customer",   value: stats.customers, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-xl border border-gray-200 p-4 shadow-sm", s.bg)}>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{s.label}</p>
              <p className={cn("text-2xl font-bold mt-1", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="ค้นหาชื่อ, เบอร์, email, สินค้า..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          {/* Intent filter */}
          <select
            value={filterIntent}
            onChange={(e) => setFilterIntent(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">ทุก Intent</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
            <option value="purchased">✓ ซื้อแล้ว</option>
          </select>

          {/* Stage filter */}
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">ทุก Stage</option>
            <option value="lead">Lead</option>
            <option value="prospect">Prospect</option>
            <option value="customer">Customer</option>
            <option value="churned">Churned</option>
          </select>

          {/* Phone filter */}
          <select
            value={filterHasPhone === null ? "" : filterHasPhone ? "yes" : "no"}
            onChange={(e) =>
              setFilterHasPhone(e.target.value === "" ? null : e.target.value === "yes")
            }
            className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">เบอร์โทร: ทั้งหมด</option>
            <option value="yes">มีเบอร์</option>
            <option value="no">ไม่มีเบอร์</option>
          </select>

          {/* Clear filters */}
          {(searchText || filterIntent || filterStage || filterHasPhone !== null) && (
            <button
              onClick={() => {
                setSearchText("");
                setFilterIntent("");
                setFilterStage("");
                setFilterHasPhone(null);
              }}
              className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              ล้างตัวกรอง
            </button>
          )}

          <span className="text-[10px] text-gray-400 ml-auto">
            แสดง {visible.length} / {profiles.length} รายการ
          </span>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-300" />
              <span className="text-sm">กำลังโหลด...</span>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Users className="h-12 w-12 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">ไม่มีข้อมูล CRM</p>
              <p className="text-xs mt-1 text-center max-w-sm">
                {profiles.length === 0
                  ? "ข้อมูล CRM จะถูก AI สกัดจากบทสนทนา LINE โดยอัตโนมัติ หรือกดปุ่ม Extract ใน Live Chat"
                  : "ไม่พบรายการที่ตรงกับตัวกรอง"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                      >
                        ชื่อลูกค้า <SortIcon k="name" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      ติดต่อ
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("purchaseIntent")}
                        className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                      >
                        Intent <SortIcon k="purchaseIntent" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("stage")}
                        className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                      >
                        Stage <SortIcon k="stage" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      สินค้าที่สนใจ
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort("updatedAt")}
                        className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                      >
                        อัปเดต <SortIcon k="updatedAt" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.map((p) => (
                    <tr
                      key={p.userId}
                      onClick={() => setSelectedProfile(p)}
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0">
                            <User className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate max-w-[140px]">
                              {p.name || <span className="text-gray-400 italic">ไม่ระบุชื่อ</span>}
                            </p>
                            <p className="text-[9px] text-gray-400 font-mono truncate max-w-[140px]">
                              {p.userId.slice(0, 20)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {p.phone ? (
                            <p className="flex items-center gap-1 text-gray-700">
                              <Phone className="h-3 w-3 text-gray-400" />{p.phone}
                            </p>
                          ) : (
                            <p className="text-gray-300 text-[10px]">ไม่มีเบอร์</p>
                          )}
                          {p.email && (
                            <p className="flex items-center gap-1 text-gray-500 text-[10px]">
                              <Mail className="h-3 w-3 text-gray-400" />{p.email}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Intent */}
                      <td className="px-4 py-3">
                        <IntentBadge intent={p.purchaseIntent} />
                      </td>

                      {/* Stage */}
                      <td className="px-4 py-3">
                        <StageBadge stage={p.stage} />
                      </td>

                      {/* Products */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {p.interestedProducts?.slice(0, 3).map((prod) => (
                            <span key={prod} className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                              {prod}
                            </span>
                          ))}
                          {(p.interestedProducts?.length ?? 0) > 3 && (
                            <span className="text-[10px] text-gray-400">+{p.interestedProducts!.length - 3}</span>
                          )}
                          {!p.interestedProducts?.length && <span className="text-[10px] text-gray-300">—</span>}
                        </div>
                      </td>

                      {/* Tags */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[120px]">
                          {p.tags?.slice(0, 2).map((t) => (
                            <span key={t} className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-full">
                              {t}
                            </span>
                          ))}
                          {(p.tags?.length ?? 0) > 2 && (
                            <span className="text-[10px] text-gray-400">+{p.tags!.length - 2}</span>
                          )}
                          {!p.tags?.length && <span className="text-[10px] text-gray-300">—</span>}
                        </div>
                      </td>

                      {/* Updated */}
                      <td className="px-4 py-3 text-[10px] text-gray-400 whitespace-nowrap">
                        {p.updatedAt
                          ? new Date(p.updatedAt).toLocaleDateString("th-TH", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── AI Extract hint ── */}
        {profiles.length > 0 && (
          <p className="text-[10px] text-gray-400 flex items-center gap-1.5 px-1">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            ข้อมูลถูกสกัดอัตโนมัติจากบทสนทนา · คลิกแถวเพื่อแก้ไข
          </p>
        )}
      </div>

      {/* ── Profile Detail Modal ── */}
      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
