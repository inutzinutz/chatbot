"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { type SaleScript } from "@/lib/saleScripts";
import { useTuning } from "@/lib/useTuning";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  FileText,
  Save,
  MessageSquare,
  Tag,
} from "lucide-react";

function ScriptModal({
  script,
  onSave,
  onClose,
}: {
  script: SaleScript | null;
  onSave: (s: SaleScript) => void;
  onClose: () => void;
}) {
  const isNew = !script;
  const [form, setForm] = useState<SaleScript>(
    script || {
      id: Date.now(),
      triggers: [],
      customerExample: "",
      adminReply: "",
      tags: [],
    }
  );
  const [triggerInput, setTriggerInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const addTrigger = () => {
    const t = triggerInput.trim();
    if (t && !form.triggers.includes(t)) {
      setForm({ ...form, triggers: [...form.triggers, t] });
      setTriggerInput("");
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm({ ...form, tags: [...form.tags, t] });
      setTagInput("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-900">{isNew ? "Add Sale Script" : "Edit Sale Script"}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Customer Example *</label>
            <input
              type="text"
              value={form.customerExample}
              onChange={(e) => setForm({ ...form, customerExample: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
              placeholder="e.g. โดรน"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Admin Reply *</label>
            <textarea
              value={form.adminReply}
              onChange={(e) => setForm({ ...form, adminReply: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none"
              placeholder="Bot response..."
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Triggers</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.triggers.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  {t}
                  <button onClick={() => setForm({ ...form, triggers: form.triggers.filter((x) => x !== t) })} className="hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={triggerInput}
                onChange={(e) => setTriggerInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTrigger())}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                placeholder="Add trigger keyword..."
              />
              <button onClick={addTrigger} className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Add</button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {t}
                  <button onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })} className="hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                placeholder="Add tag..."
              />
              <button onClick={addTag} className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Add</button>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button
            onClick={() => { if (form.customerExample.trim() && form.adminReply.trim()) onSave(form); }}
            disabled={!form.customerExample.trim() || !form.adminReply.trim()}
            className={cn(
              "px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors",
              form.customerExample.trim() && form.adminReply.trim()
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <Save className="h-3 w-3" />
            {isNew ? "Add Script" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SaleScriptsPage({ businessId }: { businessId: string }) {
  const [items, setItems, loading] = useTuning<SaleScript>(businessId, "sale-scripts");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SaleScript | null | "new">(null);
  const [deleting, setDeleting] = useState<SaleScript | null>(null);

  const filtered = search
    ? items.filter((s) => {
        const q = search.toLowerCase();
        return (
          s.customerExample.toLowerCase().includes(q) ||
          s.adminReply.toLowerCase().includes(q) ||
          s.triggers.some((t) => t.toLowerCase().includes(q)) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
    : items;

  const handleSave = (s: SaleScript) => {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = s; return copy; }
      return [...prev, s];
    });
    setEditing(null);
  };

  const handleDelete = () => {
    if (deleting) {
      setItems((prev) => prev.filter((s) => s.id !== deleting.id));
      setDeleting(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white">
      <header className="border-b border-gray-200 px-5 py-3 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-sm">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Sale Scripts</h2>
              <p className="text-[11px] text-gray-400">{items.length} scripts</p>
            </div>
          </div>
          <button onClick={() => setEditing("new")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="h-3.5 w-3.5" />
            Add Script
          </button>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search scripts..." className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No scripts found.</div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <p className="text-sm font-medium text-gray-900 truncate">{s.customerExample}</p>
                    <span className="text-[10px] text-gray-400">#{s.id}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mb-2">{s.adminReply}</p>
                  <div className="flex flex-wrap gap-1">
                    {s.triggers.map((t) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">{t}</span>
                    ))}
                    {s.tags.map((t) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => setEditing(s)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleting(s)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <ScriptModal script={editing === "new" ? null : editing} onSave={handleSave} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 p-5 space-y-4">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-3"><Trash2 className="h-5 w-5 text-red-500" /></div>
              <h3 className="text-sm font-bold text-gray-900">Delete Script</h3>
              <p className="text-xs text-gray-500 mt-1">Delete script <strong>#{deleting.id}</strong>?</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleting(null)} className="flex-1 px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
