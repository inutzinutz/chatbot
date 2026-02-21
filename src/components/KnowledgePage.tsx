"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { knowledgeDocs as initialDocs, type KnowledgeDoc } from "@/lib/knowledgeDocs";
import { useLocalStorage } from "@/lib/useLocalStorage";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  BookOpen,
  Save,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

function DocModal({
  doc,
  onSave,
  onClose,
}: {
  doc: KnowledgeDoc | null;
  onSave: (d: KnowledgeDoc) => void;
  onClose: () => void;
}) {
  const isNew = !doc;
  const [form, setForm] = useState<KnowledgeDoc>(
    doc || { id: Date.now(), title: "", content: "", triggers: [], tags: [] }
  );
  const [triggerInput, setTriggerInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const addItem = (field: "triggers" | "tags", value: string, setter: (v: string) => void) => {
    const t = value.trim();
    if (t && !form[field].includes(t)) {
      setForm({ ...form, [field]: [...form[field], t] });
      setter("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-900">{isNew ? "Add Document" : "Edit Document"}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" placeholder="Document title..." />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Content *</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none font-mono" placeholder="Knowledge content..." />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Triggers</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.triggers.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {t}
                  <button onClick={() => setForm({ ...form, triggers: form.triggers.filter((x) => x !== t) })} className="hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={triggerInput} onChange={(e) => setTriggerInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem("triggers", triggerInput, setTriggerInput))} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" placeholder="Add trigger..." />
              <button onClick={() => addItem("triggers", triggerInput, setTriggerInput)} className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Add</button>
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
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem("tags", tagInput, setTagInput))} className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" placeholder="Add tag..." />
              <button onClick={() => addItem("tags", tagInput, setTagInput)} className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Add</button>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button
            onClick={() => { if (form.title.trim() && form.content.trim()) onSave(form); }}
            disabled={!form.title.trim() || !form.content.trim()}
            className={cn(
              "px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors",
              form.title.trim() && form.content.trim() ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <Save className="h-3 w-3" />
            {isNew ? "Add Document" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KnowledgePage() {
  const [items, setItems] = useLocalStorage<KnowledgeDoc[]>("dji13_knowledge", [...initialDocs]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<KnowledgeDoc | null | "new">(null);
  const [deleting, setDeleting] = useState<KnowledgeDoc | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = search
    ? items.filter((d) => {
        const q = search.toLowerCase();
        return d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q) || d.triggers.some((t) => t.toLowerCase().includes(q)) || d.tags.some((t) => t.toLowerCase().includes(q));
      })
    : items;

  const handleSave = (d: KnowledgeDoc) => {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === d.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = d; return copy; }
      return [...prev, d];
    });
    setEditing(null);
  };

  const handleDelete = () => {
    if (deleting) { setItems((prev) => prev.filter((d) => d.id !== deleting.id)); setDeleting(null); }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white">
      <header className="border-b border-gray-200 px-5 py-3 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Knowledge Base</h2>
              <p className="text-[11px] text-gray-400">{items.length} documents</p>
            </div>
          </div>
          <button onClick={() => setEditing("new")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="h-3.5 w-3.5" />
            Add Document
          </button>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search knowledge..." className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300" />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No documents found.</div>
        ) : (
          filtered.map((d) => (
            <div key={d.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-indigo-200 hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between gap-3 p-4">
                <button onClick={() => setExpanded(expanded === d.id ? null : d.id)} className="flex items-start gap-2 flex-1 min-w-0 text-left">
                  {expanded === d.id ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{d.title}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {d.tags.map((t) => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">{t}</span>
                      ))}
                      {d.triggers.slice(0, 4).map((t) => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">{t}</span>
                      ))}
                      {d.triggers.length > 4 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">+{d.triggers.length - 4}</span>}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => setEditing(d)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleting(d)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              {expanded === d.id && (
                <div className="px-4 pb-4 pt-0 ml-6">
                  <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">{d.content}</pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {editing && <DocModal doc={editing === "new" ? null : editing} onSave={handleSave} onClose={() => setEditing(null)} />}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 p-5 space-y-4">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-3"><Trash2 className="h-5 w-5 text-red-500" /></div>
              <h3 className="text-sm font-bold text-gray-900">Delete Document</h3>
              <p className="text-xs text-gray-500 mt-1">Delete <strong>{deleting.title}</strong>?</p>
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
