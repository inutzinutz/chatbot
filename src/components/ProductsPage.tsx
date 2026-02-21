"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { type Product } from "@/lib/products";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { getBusinessConfig } from "@/lib/businessUnits";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Package,
  Save,
  Filter,
  ChevronDown,
  Image as ImageIcon,
  Tag,
} from "lucide-react";

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "all", label: "All Status", color: "" },
  { value: "active", label: "Active", color: "bg-green-100 text-green-700" },
  { value: "discontinue", label: "Discontinue", color: "bg-red-100 text-red-700" },
];

function StatusBadge({ status }: { status?: string }) {
  if (status === "discontinue") {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">
        Discontinue
      </span>
    );
  }
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 font-medium">
      Active
    </span>
  );
}

function ProductModal({
  product,
  categories,
  onSave,
  onClose,
}: {
  product: Product | null;
  categories: string[];
  onSave: (p: Product) => void;
  onClose: () => void;
}) {
  const isNew = !product;
  const [form, setForm] = useState<Product>(
    product || {
      id: Date.now(),
      name: "",
      description: "",
      price: 0,
      category: categories[0] || "",
      image: "",
      tags: [],
      status: "active",
      recommendedAlternative: "",
    }
  );
  const [tagInput, setTagInput] = useState("");

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm({ ...form, tags: [...form.tags, t] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-900">
            {isNew ? "Add Product" : "Edit Product"}
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Product Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                placeholder="e.g. DJI Mini 4 Pro"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Price (THB)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__new">+ New Category</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Status</label>
              <select
                value={form.status || "active"}
                onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "discontinue" })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white"
              >
                <option value="active">Active</option>
                <option value="discontinue">Discontinue</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Image URL</label>
              <input
                type="text"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                placeholder="https://..."
              />
            </div>
            {form.status === "discontinue" && (
              <div className="col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Recommended Alternative</label>
                <input
                  type="text"
                  value={form.recommendedAlternative || ""}
                  onChange={(e) => setForm({ ...form, recommendedAlternative: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                  placeholder="e.g. DJI Mini 5 Pro"
                />
              </div>
            )}
            <div className="col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none"
                placeholder="Product description..."
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
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
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className={cn(
              "px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors",
              form.name.trim()
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <Save className="h-3 w-3" />
            {isNew ? "Add Product" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 p-5 space-y-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <Trash2 className="h-5 w-5 text-red-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Delete Product</h3>
          <p className="text-xs text-gray-500 mt-1">Are you sure you want to delete <strong>{name}</strong>?</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage({ businessId }: { businessId: string }) {
  const config = getBusinessConfig(businessId);
  const [items, setItems] = useLocalStorage<Product[]>(`${businessId}_products`, [...config.products]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingProduct, setEditingProduct] = useState<Product | null | "new">(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const categories = useMemo(() => {
    const cats = [...new Set(items.map((p) => p.category))];
    return cats.sort();
  }, [items]);

  const filtered = useMemo(() => {
    let result = [...items];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => (p.status || "active") === statusFilter);
    }
    return result;
  }, [items, search, categoryFilter, statusFilter]);

  const handleSave = (p: Product) => {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = p;
        return copy;
      }
      return [...prev, p];
    });
    setEditingProduct(null);
  };

  const handleDelete = () => {
    if (deletingProduct) {
      setItems((prev) => prev.filter((p) => p.id !== deletingProduct.id));
      setDeletingProduct(null);
    }
  };

  const activeCount = items.filter((p) => p.status !== "discontinue").length;
  const discoCount = items.filter((p) => p.status === "discontinue").length;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-5 py-3 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Products</h2>
              <p className="text-[11px] text-gray-400">{items.length} products · {activeCount} active · {discoCount} discontinued</p>
            </div>
          </div>
          <button
            onClick={() => setEditingProduct("new")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full">
          <thead>
            <tr className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-16">Image</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tags</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No products found.</td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="h-10 w-10 rounded-lg object-cover border border-gray-200" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-gray-300" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{p.name}</p>
                    <p className="text-[10px] text-gray-400">ID: {p.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600">{p.category}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-mono font-medium text-gray-900 tabular-nums">
                      ฿{p.price.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{t}</span>
                      ))}
                      {p.tags.length > 3 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">+{p.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingProduct(p)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingProduct(p)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {editingProduct && (
        <ProductModal
          product={editingProduct === "new" ? null : editingProduct}
          categories={categories}
          onSave={handleSave}
          onClose={() => setEditingProduct(null)}
        />
      )}
      {deletingProduct && (
        <DeleteConfirm
          name={deletingProduct.name}
          onConfirm={handleDelete}
          onCancel={() => setDeletingProduct(null)}
        />
      )}
    </div>
  );
}
