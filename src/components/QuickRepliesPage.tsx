"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTuning } from "@/lib/useTuning";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Reply,
  Save,
  MessageCircle,
  FolderOpen,
} from "lucide-react";

interface QuickReplyItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

function QRModal({
  item,
  categories: cats,
  onSave,
  onClose,
}: {
  item: QuickReplyItem | null;
  categories: string[];
  onSave: (q: QuickReplyItem) => void;
  onClose: () => void;
}) {
  const isNew = !item;
  const [form, setForm] = useState<QuickReplyItem>(
    item || { id: Date.now(), question: "", answer: "", category: cats[0] || "" }
  );
  const [newCat, setNewCat] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-900">{isNew ? "Add Quick Reply" : "Edit Quick Reply"}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Question *</label>
            <input type="text" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" placeholder="e.g. วิธีสั่งซื้อสินค้า" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Answer *</label>
            <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={6} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none" placeholder="Reply content..." />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Category</label>
            {showNewCat ? (
              <div className="flex gap-2">
                <input type="text" value={newCat} onChange={(e) => setNewCat(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" placeholder="New category name..." autoFocus />
                <button onClick={() => { if (newCat.trim()) { setForm({ ...form, category: newCat.trim() }); setShowNewCat(false); } }} className="px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Add</button>
                <button onClick={() => setShowNewCat(false)} className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select value={form.category} onChange={(e) => { if (e.target.value === "__new") { setShowNewCat(true); } else { setForm({ ...form, category: e.target.value }); } }} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white">
                  {cats.map((c) => (<option key={c} value={c}>{c}</option>))}
                  <option value="__new">+ New Category</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={() => { if (form.question.trim() && form.answer.trim()) onSave(form); }} disabled={!form.question.trim() || !form.answer.trim()} className={cn("px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors", form.question.trim() && form.answer.trim() ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-200 text-gray-400 cursor-not-allowed")}>
            <Save className="h-3 w-3" />
            {isNew ? "Add" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuickRepliesPage({ businessId }: { businessId: string }) {
  const [items, setItems, loading] = useTuning<QuickReplyItem>(businessId, "quick-replies");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [editing, setEditing] = useState<QuickReplyItem | null | "new">(null);
  const [deleting, setDeleting] = useState<QuickReplyItem | null>(null);

  const categories = [...new Set(items.map((i) => i.category))].sort();

  const filtered = items.filter((i) => {
    const matchCat = catFilter === "all" || i.category === catFilter;
    const matchSearch = !search || i.question.toLowerCase().includes(search.toLowerCase()) || i.answer.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleSave = (q: QuickReplyItem) => {
    setItems((prev) => { const idx = prev.findIndex((x) => x.id === q.id); if (idx >= 0) { const c = [...prev]; c[idx] = q; return c; } return [...prev, q]; });
    setEditing(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white">
      <header className="border-b border-gray-200 px-5 py-3 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm"><Reply className="h-4 w-4" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Quick Replies</h2>
              <p className="text-[11px] text-gray-400">{items.length} replies · {categories.length} categories</p>
            </div>
          </div>
          <button onClick={() => setEditing("new")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="h-3.5 w-3.5" />
            Add Reply
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search replies..." className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" />
          </div>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white">
            <option value="all">All Categories</option>
            {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No replies found.</div>
        ) : (
          filtered.map((q) => (
            <div key={q.id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                    <p className="text-sm font-medium text-gray-900">{q.question}</p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2 ml-5.5">{q.answer}</p>
                  <div className="ml-5.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-50 text-cyan-600 border border-cyan-200 font-medium flex items-center gap-1 w-fit">
                      <FolderOpen className="h-2.5 w-2.5" />
                      {q.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => setEditing(q)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleting(q)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && <QRModal item={editing === "new" ? null : editing} categories={categories} onSave={handleSave} onClose={() => setEditing(null)} />}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 p-5 space-y-4">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-3"><Trash2 className="h-5 w-5 text-red-500" /></div>
              <h3 className="text-sm font-bold text-gray-900">Delete Quick Reply</h3>
              <p className="text-xs text-gray-500 mt-1">Delete <strong>{deleting.question}</strong>?</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleting(null)} className="flex-1 px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => { setItems((prev) => prev.filter((i) => i.id !== deleting.id)); setDeleting(null); }} className="flex-1 px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
