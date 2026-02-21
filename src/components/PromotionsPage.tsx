"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/lib/useLocalStorage";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Tag,
  Save,
  Calendar,
  Percent,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface Promotion {
  id: number;
  title: string;
  description: string;
  discountType: "percent" | "fixed" | "freebie";
  discountValue: string;
  conditions: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

const initialPromotions: Promotion[] = [
  {
    id: 1,
    title: "DJI Mini 4 Pro ลด 10%",
    description: "ลดราคา 10% สำหรับ DJI Mini 4 Pro ทุกแพ็กเกจ",
    discountType: "percent",
    discountValue: "10",
    conditions: "ไม่สามารถใช้ร่วมกับโปรโมชั่นอื่นได้",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    active: true,
  },
  {
    id: 2,
    title: "DJI Avata 2 แถม DJI Care Refresh",
    description: "ซื้อ DJI Avata 2 Fly More Combo แถม DJI Care Refresh 1 ปี",
    discountType: "freebie",
    discountValue: "DJI Care Refresh 1 Year",
    conditions: "เฉพาะ Fly More Combo เท่านั้น",
    startDate: "2026-01-15",
    endDate: "2026-02-28",
    active: true,
  },
  {
    id: 3,
    title: "ผ่อน 0% สูงสุด 10 เดือน",
    description: "ผ่อน 0% สำหรับบัตรเครดิตที่ร่วมรายการ ทุกรุ่น",
    discountType: "percent",
    discountValue: "0% installment",
    conditions: "เฉพาะบัตรเครดิต SCB, KBANK, KTC, BAY",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    active: true,
  },
  {
    id: 4,
    title: "ส่งฟรีทั่วประเทศ",
    description: "จัดส่งฟรีทุกรายการสินค้า DJI ทั่วประเทศไทย",
    discountType: "fixed",
    discountValue: "Free shipping",
    conditions: "ไม่มีขั้นต่ำ",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    active: true,
  },
];

function PromoModal({
  promo,
  onSave,
  onClose,
}: {
  promo: Promotion | null;
  onSave: (p: Promotion) => void;
  onClose: () => void;
}) {
  const isNew = !promo;
  const [form, setForm] = useState<Promotion>(
    promo || {
      id: Date.now(),
      title: "",
      description: "",
      discountType: "percent",
      discountValue: "",
      conditions: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      active: true,
    }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-900">{isNew ? "Add Promotion" : "Edit Promotion"}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" placeholder="Promotion title..." />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Discount Type</label>
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as Promotion["discountType"] })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white">
                <option value="percent">Percent</option>
                <option value="fixed">Fixed Amount</option>
                <option value="freebie">Freebie</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Discount Value</label>
              <input type="text" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" placeholder="e.g. 10 or Free item" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">End Date</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Conditions</label>
            <input type="text" value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" placeholder="Conditions..." />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setForm({ ...form, active: !form.active })} className="flex items-center gap-2">
              {form.active ? <ToggleRight className="h-6 w-6 text-green-500" /> : <ToggleLeft className="h-6 w-6 text-gray-400" />}
              <span className="text-sm text-gray-700">{form.active ? "Active" : "Inactive"}</span>
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={() => { if (form.title.trim()) onSave(form); }} disabled={!form.title.trim()} className={cn("px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors", form.title.trim() ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-200 text-gray-400 cursor-not-allowed")}>
            <Save className="h-3 w-3" />
            {isNew ? "Add" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  const [items, setItems] = useLocalStorage<Promotion[]>("dji13_promotions", [...initialPromotions]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Promotion | null | "new">(null);
  const [deleting, setDeleting] = useState<Promotion | null>(null);

  const filtered = search
    ? items.filter((p) => { const q = search.toLowerCase(); return p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q); })
    : items;

  const handleSave = (p: Promotion) => {
    setItems((prev) => { const idx = prev.findIndex((x) => x.id === p.id); if (idx >= 0) { const c = [...prev]; c[idx] = p; return c; } return [...prev, p]; });
    setEditing(null);
  };

  const toggleActive = (id: number) => {
    setItems((prev) => prev.map((p) => p.id === id ? { ...p, active: !p.active } : p));
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white">
      <header className="border-b border-gray-200 px-5 py-3 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-sm"><Tag className="h-4 w-4" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Promotions</h2>
              <p className="text-[11px] text-gray-400">{items.length} promotions · {items.filter((p) => p.active).length} active</p>
            </div>
          </div>
          <button onClick={() => setEditing("new")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="h-3.5 w-3.5" />
            Add Promotion
          </button>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search promotions..." className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No promotions found.</div>
        ) : (
          filtered.map((p) => (
            <div key={p.id} className={cn("border rounded-xl p-4 transition-all group", p.active ? "border-gray-200 hover:border-indigo-200 hover:shadow-sm" : "border-gray-100 bg-gray-50/50 opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">{p.title}</p>
                    {p.active ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 font-medium">Active</span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 font-medium">Inactive</span>
                    )}
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 font-medium capitalize">{p.discountType}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{p.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><Percent className="h-3 w-3" />{p.discountValue}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{p.startDate} → {p.endDate || "∞"}</span>
                  </div>
                  {p.conditions && <p className="text-[10px] text-gray-400 mt-1">{p.conditions}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(p.id)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors" title="Toggle active">
                    {p.active ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setEditing(p)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleting(p)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && <PromoModal promo={editing === "new" ? null : editing} onSave={handleSave} onClose={() => setEditing(null)} />}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 p-5 space-y-4">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-3"><Trash2 className="h-5 w-5 text-red-500" /></div>
              <h3 className="text-sm font-bold text-gray-900">Delete Promotion</h3>
              <p className="text-xs text-gray-500 mt-1">Delete <strong>{deleting.title}</strong>?</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleting(null)} className="flex-1 px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => { setItems((prev) => prev.filter((p) => p.id !== deleting.id)); setDeleting(null); }} className="flex-1 px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
