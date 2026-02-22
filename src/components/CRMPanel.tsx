"use client";

import { useState, useEffect, useCallback } from "react";
import {
  User,
  Phone,
  Mail,
  Package,
  MapPin,
  Briefcase,
  Tag,
  Edit3,
  Save,
  X,
  RefreshCw,
  Flame,
  TrendingUp,
  Minus,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CRMProfile } from "@/lib/chatStore";

interface CRMPanelProps {
  businessId: string;
  userId: string;
  displayName: string;
}

// ── Intent badge ──
function IntentBadge({ intent }: { intent?: CRMProfile["purchaseIntent"] }) {
  const map = {
    hot:       { label: "Hot 🔥",      cls: "bg-red-100 text-red-700 border-red-200" },
    warm:      { label: "Warm",         cls: "bg-orange-100 text-orange-700 border-orange-200" },
    cold:      { label: "Cold",         cls: "bg-blue-100 text-blue-700 border-blue-200" },
    purchased: { label: "ซื้อแล้ว ✓",  cls: "bg-green-100 text-green-700 border-green-200" },
  };
  if (!intent) return null;
  const b = map[intent];
  return <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold", b.cls)}>{b.label}</span>;
}

// ── Stage badge ──
function StageBadge({ stage }: { stage?: CRMProfile["stage"] }) {
  const map = {
    lead:      { label: "Lead",      cls: "bg-gray-100 text-gray-600 border-gray-200" },
    prospect:  { label: "Prospect",  cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    customer:  { label: "Customer",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    churned:   { label: "Churned",   cls: "bg-red-50 text-red-500 border-red-100" },
  };
  if (!stage) return null;
  const b = map[stage];
  return <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold", b.cls)}>{b.label}</span>;
}

export default function CRMPanel({ businessId, userId, displayName }: CRMPanelProps) {
  const [profile, setProfile] = useState<CRMProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Edit form state
  const [form, setForm] = useState<Partial<CRMProfile>>({});
  const [tagInput, setTagInput] = useState("");
  const [productInput, setProductInput] = useState("");

  // ── Fetch profile ──
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm?businessId=${encodeURIComponent(businessId)}&userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile ?? null);
        if (data.profile) setForm(data.profile);
      }
    } catch {}
    setLoading(false);
  }, [businessId, userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Extract ──
  const handleExtract = async () => {
    setExtracting(true);
    try {
      const res = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extract", businessId, userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setForm(data.profile);
      }
    } catch {}
    setExtracting(false);
  };

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", businessId, profile: { ...form, userId, businessId } }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setForm(data.profile);
        setEditing(false);
      }
    } catch {}
    setSaving(false);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    setForm((f) => ({ ...f, tags: [...(f.tags ?? []), t] }));
    setTagInput("");
  };

  const removeTag = (tag: string) => setForm((f) => ({ ...f, tags: f.tags?.filter((t) => t !== tag) }));

  const addProduct = () => {
    const p = productInput.trim();
    if (!p) return;
    setForm((f) => ({ ...f, interestedProducts: [...(f.interestedProducts ?? []), p] }));
    setProductInput("");
  };

  const removeProduct = (p: string) => setForm((f) => ({ ...f, interestedProducts: f.interestedProducts?.filter((x) => x !== p) }));

  return (
    <div className="w-[260px] shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gray-50/70">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
        >
          <User className="h-3.5 w-3.5 text-indigo-500" />
          CRM Profile
          {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>
        <div className="flex gap-1">
          <button
            onClick={handleExtract}
            disabled={extracting}
            title="AI Extract จากบทสนทนา"
            className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Sparkles className={cn("h-3.5 w-3.5", extracting && "animate-spin text-indigo-500")} />
          </button>
          {!editing ? (
            <button
              onClick={() => { setEditing(true); setForm(profile ?? { userId, businessId }); }}
              title="แก้ไข"
              className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving} title="บันทึก" className="p-1 rounded-md text-green-600 hover:bg-green-50 transition-colors">
                <Save className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => { setEditing(false); setForm(profile ?? {}); }} title="ยกเลิก" className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {collapsed ? null : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-4 w-4 text-gray-300 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Status badges */}
          {(profile?.purchaseIntent || profile?.stage) && (
            <div className="flex gap-1.5 flex-wrap">
              <IntentBadge intent={profile.purchaseIntent} />
              <StageBadge stage={profile.stage} />
            </div>
          )}

          {/* No data state */}
          {!profile && !extracting && (
            <div className="text-center py-6 space-y-2">
              <User className="h-8 w-8 text-gray-200 mx-auto" />
              <p className="text-xs text-gray-400">ยังไม่มีข้อมูล CRM</p>
              <button
                onClick={handleExtract}
                className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 mx-auto"
              >
                <Sparkles className="h-3 w-3" />
                AI Extract ข้อมูล
              </button>
            </div>
          )}

          {/* Profile fields */}
          {(profile || editing) && (
            <div className="space-y-2.5">
              {/* Name */}
              <Field
                icon={<User className="h-3.5 w-3.5 text-gray-400" />}
                label="ชื่อจริง"
                editing={editing}
                value={form.name}
                placeholder={displayName}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              />

              {/* Phone */}
              <Field
                icon={<Phone className="h-3.5 w-3.5 text-gray-400" />}
                label="เบอร์โทร"
                editing={editing}
                value={form.phone}
                placeholder="0XX-XXX-XXXX"
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              />

              {/* Email */}
              <Field
                icon={<Mail className="h-3.5 w-3.5 text-gray-400" />}
                label="Email"
                editing={editing}
                value={form.email}
                placeholder="example@email.com"
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              />

              {/* Province */}
              <Field
                icon={<MapPin className="h-3.5 w-3.5 text-gray-400" />}
                label="จังหวัด"
                editing={editing}
                value={form.province}
                placeholder="กรุงเทพฯ"
                onChange={(v) => setForm((f) => ({ ...f, province: v }))}
              />

              {/* Occupation */}
              <Field
                icon={<Briefcase className="h-3.5 w-3.5 text-gray-400" />}
                label="อาชีพ"
                editing={editing}
                value={form.occupation}
                placeholder="พนักงานบริษัท"
                onChange={(v) => setForm((f) => ({ ...f, occupation: v }))}
              />

              {/* Budget */}
              <Field
                icon={<ShoppingBag className="h-3.5 w-3.5 text-gray-400" />}
                label="งบประมาณ"
                editing={editing}
                value={form.budget}
                placeholder="10,000 บาท"
                onChange={(v) => setForm((f) => ({ ...f, budget: v }))}
              />

              {/* Purchase Intent select */}
              {editing && (
                <div className="space-y-0.5">
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Flame className="h-3 w-3" /> ระดับความสนใจ
                  </p>
                  <select
                    value={form.purchaseIntent ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, purchaseIntent: e.target.value as CRMProfile["purchaseIntent"] || undefined }))}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  >
                    <option value="">— ยังไม่ระบุ —</option>
                    <option value="hot">🔥 Hot (พร้อมซื้อ)</option>
                    <option value="warm">Warm (สนใจ)</option>
                    <option value="cold">Cold (แค่ถาม)</option>
                    <option value="purchased">✓ ซื้อแล้ว</option>
                  </select>
                </div>
              )}

              {/* Stage select */}
              {editing && (
                <div className="space-y-0.5">
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Stage
                  </p>
                  <select
                    value={form.stage ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as CRMProfile["stage"] || undefined }))}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  >
                    <option value="">— ยังไม่ระบุ —</option>
                    <option value="lead">Lead</option>
                    <option value="prospect">Prospect</option>
                    <option value="customer">Customer</option>
                    <option value="churned">Churned</option>
                  </select>
                </div>
              )}

              {/* Interested Products */}
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Package className="h-3 w-3" /> สินค้าที่สนใจ
                </p>
                <div className="flex flex-wrap gap-1">
                  {(editing ? form.interestedProducts : profile?.interestedProducts)?.map((p) => (
                    <span key={p} className="flex items-center gap-0.5 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                      {p}
                      {editing && <button onClick={() => removeProduct(p)} className="ml-0.5 text-indigo-400 hover:text-red-500"><X className="h-2.5 w-2.5" /></button>}
                    </span>
                  ))}
                  {!(editing ? form.interestedProducts : profile?.interestedProducts)?.length && !editing && (
                    <span className="text-[10px] text-gray-300">—</span>
                  )}
                </div>
                {editing && (
                  <div className="flex gap-1">
                    <input
                      value={productInput}
                      onChange={(e) => setProductInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addProduct()}
                      placeholder="เพิ่มสินค้า..."
                      className="flex-1 px-2 py-1 text-[10px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                    <button onClick={addProduct} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded-md"><Plus className="h-3 w-3" /></button>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {(editing ? form.tags : profile?.tags)?.map((t) => (
                    <span key={t} className="flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full">
                      {t}
                      {editing && <button onClick={() => removeTag(t)} className="ml-0.5 text-amber-400 hover:text-red-500"><X className="h-2.5 w-2.5" /></button>}
                    </span>
                  ))}
                  {!(editing ? form.tags : profile?.tags)?.length && !editing && (
                    <span className="text-[10px] text-gray-300">—</span>
                  )}
                </div>
                {editing && (
                  <div className="flex gap-1">
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTag()}
                      placeholder="เพิ่ม tag เช่น VIP..."
                      className="flex-1 px-2 py-1 text-[10px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-300"
                    />
                    <button onClick={addTag} className="p-1 text-amber-500 hover:bg-amber-50 rounded-md"><Plus className="h-3 w-3" /></button>
                  </div>
                )}
              </div>

              {/* Metadata */}
              {profile?.extractedAt && (
                <p className="text-[9px] text-gray-300 border-t border-gray-50 pt-2">
                  AI extract: {new Date(profile.extractedAt).toLocaleString("th-TH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {profile.updatedBy && profile.updatedBy !== "auto" && ` · แก้โดย ${profile.updatedBy}`}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reusable text field ──
function Field({
  icon, label, editing, value, placeholder, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  editing: boolean;
  value?: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  if (!editing && !value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-gray-400 flex items-center gap-1">{icon} {label}</p>
      {editing ? (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      ) : (
        <p className="text-xs text-gray-800 font-medium truncate">{value}</p>
      )}
    </div>
  );
}
