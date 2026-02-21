"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { intents as initialIntents, type Intent } from "@/lib/intentPolicies";
import { useLocalStorage } from "@/lib/useLocalStorage";
import {
  Search, Plus, Pencil, Trash2, X, Zap, Save,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
} from "lucide-react";

// ─── Modal ────────────────────────────────────────────────────
function IntentModal({
  intent,
  nextNumber,
  onSave,
  onClose,
}: {
  intent: Intent | null;
  nextNumber: number;
  onSave: (i: Intent) => void;
  onClose: () => void;
}) {
  const isNew = !intent;
  const [form, setForm] = useState<Intent>(
    intent ?? {
      id: `intent_${Date.now()}`,
      number: nextNumber,
      name: "",
      description: "",
      triggers: [],
      policy: "",
      responseTemplate: "",
      active: true,
    }
  );
  const [triggerInput, setTriggerInput] = useState("");

  const addTrigger = () => {
    const t = triggerInput.trim();
    if (t && !form.triggers.includes(t)) {
      setForm((f) => ({ ...f, triggers: [...f.triggers, t] }));
      setTriggerInput("");
    }
  };

  const removeTrigger = (t: string) =>
    setForm((f) => ({ ...f, triggers: f.triggers.filter((x) => x !== t) }));

  const canSave = form.name.trim() && form.policy.trim() && form.responseTemplate.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl mx-4 max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-600">
              {form.number}
            </div>
            <h3 className="text-sm font-bold text-gray-900">{isNew ? "Add Intent" : "Edit Intent"}</h3>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Intent Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                placeholder="e.g. Greeting"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Number</label>
              <input
                type="number"
                value={form.number}
                onChange={(e) => setForm((f) => ({ ...f, number: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
              placeholder="When does this intent trigger?"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">
              Trigger Keywords{" "}
              <span className="text-gray-300 font-normal normal-case">(press Enter to add)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {form.triggers.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {t}
                  <button onClick={() => removeTrigger(t)} className="hover:text-red-500 transition-colors">
                    <X className="h-2.5 w-2.5" />
                  </button>
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
                placeholder="Type keyword..."
              />
              <button onClick={addTrigger} className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                Add
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Policy *</label>
            <textarea
              value={form.policy}
              onChange={(e) => setForm((f) => ({ ...f, policy: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none"
              placeholder="How should the AI handle this intent?"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Response Template *</label>
            <textarea
              value={form.responseTemplate}
              onChange={(e) => setForm((f) => ({ ...f, responseTemplate: e.target.value }))}
              rows={6}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none font-mono leading-relaxed"
              placeholder="Default response template (supports markdown)..."
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</label>
            <button
              onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                form.active
                  ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                  : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
              )}
            >
              {form.active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
              {form.active ? "Active" : "Inactive"}
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { if (canSave) onSave(form); }}
            disabled={!canSave}
            className={cn(
              "px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors",
              canSave ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <Save className="h-3 w-3" />
            {isNew ? "Add Intent" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────
function IntentCard({
  intent,
  onEdit,
  onDelete,
  onToggle,
}: {
  intent: Intent;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "border rounded-xl transition-all group bg-white",
      intent.active
        ? "border-gray-200 hover:border-indigo-200 hover:shadow-sm"
        : "border-gray-100 bg-gray-50/40 opacity-60"
    )}>
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-600 mt-0.5">
          {intent.number}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{intent.name}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-medium border",
              intent.active
                ? "bg-green-50 text-green-600 border-green-200"
                : "bg-gray-100 text-gray-400 border-gray-200"
            )}>
              {intent.active ? "Active" : "Inactive"}
            </span>
            {intent.triggers.length === 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                fallback
              </span>
            )}
          </div>

          {intent.description && (
            <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">{intent.description}</p>
          )}

          {intent.triggers.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {intent.triggers.slice(0, 7).map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                  {t}
                </span>
              ))}
              {intent.triggers.length > 7 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
                  +{intent.triggers.length - 7}
                </span>
              )}
            </div>
          )}

          {expanded && (
            <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Policy</p>
                <p className="text-xs text-gray-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                  {intent.policy}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Response Template</p>
                <pre className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                  {intent.responseTemplate}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-100 hover:text-gray-500 transition-colors"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onToggle}
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100",
              intent.active
                ? "text-green-400 hover:bg-green-50 hover:text-green-600"
                : "text-gray-300 hover:bg-gray-100 hover:text-gray-500"
            )}
            title={intent.active ? "Deactivate" : "Activate"}
          >
            {intent.active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onEdit}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function IntentsPage() {
  const [items, setItems] = useLocalStorage<Intent[]>("dji13_intents", [...initialIntents]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [editing, setEditing] = useState<Intent | null | "new">(null);
  const [deleting, setDeleting] = useState<Intent | null>(null);

  const filtered = items
    .filter((i) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.triggers.some((t) => t.toLowerCase().includes(q)) ||
        i.policy.toLowerCase().includes(q);
      const matchFilter =
        filter === "all" ||
        (filter === "active" && i.active) ||
        (filter === "inactive" && !i.active);
      return matchSearch && matchFilter;
    })
    .sort((a, b) => a.number - b.number);

  const handleSave = (intent: Intent) => {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === intent.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = intent;
        return copy;
      }
      return [...prev, intent];
    });
    setEditing(null);
  };

  const handleDelete = () => {
    if (deleting) {
      setItems((prev) => prev.filter((i) => i.id !== deleting.id));
      setDeleting(null);
    }
  };

  const handleToggle = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, active: !i.active } : i)));
  };

  const activeCount = items.filter((i) => i.active).length;
  const nextNumber = Math.max(...items.map((i) => i.number), 0) + 1;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-5 py-3 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Intents</h2>
              <p className="text-[11px] text-gray-400">
                {activeCount} active / {items.length} total
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Intent
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search intents, triggers, policy..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            />
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-2 font-medium capitalize transition-colors",
                  filter === f ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* List */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">
            <Zap className="h-8 w-8 mx-auto mb-3 text-gray-200" />
            No intents found.
          </div>
        ) : (
          filtered.map((intent) => (
            <IntentCard
              key={intent.id}
              intent={intent}
              onEdit={() => setEditing(intent)}
              onDelete={() => setDeleting(intent)}
              onToggle={() => handleToggle(intent.id)}
            />
          ))
        )}
      </div>

      {/* Edit / Add Modal */}
      {editing && (
        <IntentModal
          intent={editing === "new" ? null : editing}
          nextNumber={nextNumber}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Delete Confirm */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 p-5 space-y-4">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Delete Intent</h3>
              <p className="text-xs text-gray-500 mt-1">
                Delete <strong>&quot;{deleting.name}&quot;</strong>? This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
