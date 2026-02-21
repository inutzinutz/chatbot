"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Truck,
  Save,
  MapPin,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface ShippingRule {
  id: number;
  zone: string;
  description: string;
  fee: number;
  freeAbove: number | null;
  estimatedDays: string;
  active: boolean;
}

const initialRules: ShippingRule[] = [
  {
    id: 1,
    zone: "กรุงเทพและปริมณฑล",
    description: "จัดส่งด่วนภายใน 1-2 วันทำการ",
    fee: 0,
    freeAbove: null,
    estimatedDays: "1-2 วันทำการ",
    active: true,
  },
  {
    id: 2,
    zone: "ต่างจังหวัด",
    description: "จัดส่งทั่วประเทศ ส่งฟรีสำหรับสินค้า DJI ทุกรายการ",
    fee: 0,
    freeAbove: null,
    estimatedDays: "2-4 วันทำการ",
    active: true,
  },
  {
    id: 3,
    zone: "จัดส่งด่วน (Express)",
    description: "บริการจัดส่งด่วนพิเศษ ถึงภายใน 1 วัน",
    fee: 100,
    freeAbove: 10000,
    estimatedDays: "1 วันทำการ",
    active: true,
  },
  {
    id: 4,
    zone: "ต่างประเทศ (International)",
    description: "สำหรับลูกค้าต่างประเทศ กรุณาติดต่อ LINE @dji13store",
    fee: 0,
    freeAbove: null,
    estimatedDays: "ติดต่อสอบถาม",
    active: false,
  },
];

function RuleModal({
  rule,
  onSave,
  onClose,
}: {
  rule: ShippingRule | null;
  onSave: (r: ShippingRule) => void;
  onClose: () => void;
}) {
  const isNew = !rule;
  const [form, setForm] = useState<ShippingRule>(
    rule || {
      id: Date.now(),
      zone: "",
      description: "",
      fee: 0,
      freeAbove: null,
      estimatedDays: "",
      active: true,
    }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-900">{isNew ? "Add Shipping Rule" : "Edit Shipping Rule"}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Zone Name *</label>
            <input type="text" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" placeholder="e.g. กรุงเทพและปริมณฑล" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Shipping Fee (THB)</label>
              <input type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Free Above (THB)</label>
              <input type="number" value={form.freeAbove ?? ""} onChange={(e) => setForm({ ...form, freeAbove: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" placeholder="Leave empty = always free" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Estimated Delivery</label>
            <input type="text" value={form.estimatedDays} onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" placeholder="e.g. 1-2 วันทำการ" />
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
          <button onClick={() => { if (form.zone.trim()) onSave(form); }} disabled={!form.zone.trim()} className={cn("px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors", form.zone.trim() ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-200 text-gray-400 cursor-not-allowed")}>
            <Save className="h-3 w-3" />
            {isNew ? "Add Rule" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShippingPage() {
  const [items, setItems] = useState<ShippingRule[]>([...initialRules]);
  const [editing, setEditing] = useState<ShippingRule | null | "new">(null);
  const [deleting, setDeleting] = useState<ShippingRule | null>(null);

  const handleSave = (r: ShippingRule) => {
    setItems((prev) => { const idx = prev.findIndex((x) => x.id === r.id); if (idx >= 0) { const c = [...prev]; c[idx] = r; return c; } return [...prev, r]; });
    setEditing(null);
  };

  const toggleActive = (id: number) => {
    setItems((prev) => prev.map((r) => r.id === id ? { ...r, active: !r.active } : r));
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white">
      <header className="border-b border-gray-200 px-5 py-3 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-sm"><Truck className="h-4 w-4" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Shipping Fee</h2>
              <p className="text-[11px] text-gray-400">{items.length} zones · {items.filter((r) => r.active).length} active</p>
            </div>
          </div>
          <button onClick={() => setEditing("new")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="h-3.5 w-3.5" />
            Add Zone
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No shipping rules.</div>
        ) : (
          items.map((r) => (
            <div key={r.id} className={cn("border rounded-xl p-4 transition-all group", r.active ? "border-gray-200 hover:border-indigo-200 hover:shadow-sm" : "border-gray-100 bg-gray-50/50 opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    <p className="text-sm font-medium text-gray-900">{r.zone}</p>
                    {r.active ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 font-medium">Active</span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 font-medium">Inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2 ml-5.5">{r.description}</p>
                  <div className="flex items-center gap-4 ml-5.5 text-[11px]">
                    <span className={cn("font-medium", r.fee === 0 ? "text-green-600" : "text-gray-700")}>
                      {r.fee === 0 ? "ฟรี" : `฿${r.fee.toLocaleString()}`}
                    </span>
                    {r.freeAbove && (
                      <span className="text-gray-400">ฟรีเมื่อซื้อ ≥ ฿{r.freeAbove.toLocaleString()}</span>
                    )}
                    <span className="text-gray-400">{r.estimatedDays}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(r.id)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors" title="Toggle">
                    {r.active ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setEditing(r)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleting(r)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && <RuleModal rule={editing === "new" ? null : editing} onSave={handleSave} onClose={() => setEditing(null)} />}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 p-5 space-y-4">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-3"><Trash2 className="h-5 w-5 text-red-500" /></div>
              <h3 className="text-sm font-bold text-gray-900">Delete Zone</h3>
              <p className="text-xs text-gray-500 mt-1">Delete <strong>{deleting.zone}</strong>?</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleting(null)} className="flex-1 px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => { setItems((prev) => prev.filter((r) => r.id !== deleting.id)); setDeleting(null); }} className="flex-1 px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
