"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Clock,
  RefreshCw,
  Zap,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Cpu,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

interface TokenLogEntry {
  id: string;
  model: string;
  callSite: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number;
  timestamp: number;
}

interface AIInspectorProps {
  businessId: string;
}

type SortField = "timestamp" | "totalTokens" | "costUSD";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 20;

const CALLSITE_COLORS: Record<string, string> = {
  line_claude:       "bg-purple-50 border-purple-200 text-purple-700",
  line_openai:       "bg-emerald-50 border-emerald-200 text-emerald-700",
  line_vision_image: "bg-cyan-50 border-cyan-200 text-cyan-700",
  line_vision_pdf:   "bg-blue-50 border-blue-200 text-blue-700",
  chat_claude:       "bg-indigo-50 border-indigo-200 text-indigo-700",
  chat_openai:       "bg-teal-50 border-teal-200 text-teal-700",
  agent:             "bg-amber-50 border-amber-200 text-amber-700",
  crm_extract:       "bg-pink-50 border-pink-200 text-pink-700",
  monitoring_summary:"bg-gray-100 border-gray-300 text-gray-700",
};

function CallSiteBadge({ site }: { site: string }) {
  const cls = CALLSITE_COLORS[site] ?? "bg-gray-50 border-gray-200 text-gray-600";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", cls)}>
      {site}
    </span>
  );
}

function CostBadge({ cost }: { cost: number }) {
  const color = cost < 0.001 ? "text-green-600" : cost < 0.01 ? "text-amber-600" : "text-red-600";
  return <span className={cn("text-sm font-mono tabular-nums", color)}>${cost.toFixed(5)}</span>;
}

function TokensBadge({ tokens }: { tokens: number }) {
  const color = tokens < 1000 ? "text-green-600" : tokens < 5000 ? "text-amber-600" : "text-red-600";
  return <span className={cn("text-sm font-mono tabular-nums", color)}>{tokens.toLocaleString()}</span>;
}

// ── Component ─────────────────────────────────────────────────────────

export default function AIInspector({ businessId }: AIInspectorProps) {
  const [logs, setLogs] = useState<TokenLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<7 | 30 | 1>(7);

  const [siteFilter, setSiteFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  // ── Fetch ──
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/monitoring?businessId=${encodeURIComponent(businessId)}&view=tokens&days=${days}`
      );
      if (res.ok) {
        const data = await res.json() as { tokens?: { recentLog?: TokenLogEntry[] } };
        setLogs(data.tokens?.recentLog ?? []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [businessId, days]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Filter + Sort ──
  const filtered = useMemo(() => {
    let result = [...logs];
    if (siteFilter) result = result.filter((l) => l.callSite === siteFilter);
    if (modelFilter) result = result.filter((l) => l.model.includes(modelFilter));
    result.sort((a, b) => {
      let diff = 0;
      if (sortField === "timestamp")   diff = a.timestamp - b.timestamp;
      if (sortField === "totalTokens") diff = a.totalTokens - b.totalTokens;
      if (sortField === "costUSD")     diff = a.costUSD - b.costUSD;
      return sortDirection === "asc" ? diff : -diff;
    });
    return result;
  }, [logs, siteFilter, modelFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const allSites = useMemo(() => [...new Set(logs.map((l) => l.callSite))].sort(), [logs]);
  const allModels = useMemo(() => [...new Set(logs.map((l) => l.model))].sort(), [logs]);

  const totalCost = filtered.reduce((s, l) => s + l.costUSD, 0);
  const totalTokens = filtered.reduce((s, l) => s + l.totalTokens, 0);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDirection("desc"); }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDirection === "asc"
        ? <ChevronUp className="h-3 w-3 text-indigo-500" />
        : <ChevronDown className="h-3 w-3 text-indigo-500" />
    ) : null;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-5 py-3 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">AI Inspector</h2>
              <p className="text-[11px] text-gray-400">Token usage log จาก AI pipeline จริง</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {([1, 7, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => { setDays(d); setPage(1); }}
                  className={cn(
                    "px-3 py-1.5 font-medium transition-colors",
                    days === d ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {d === 1 ? "วันนี้" : `${d}d`}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setPage(1); fetchLogs(); }}
              className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            {filtered.length} calls
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            {totalTokens.toLocaleString()} tokens
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-green-500" />
            ${totalCost.toFixed(4)} USD
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-2">
          <select
            value={siteFilter}
            onChange={(e) => { setSiteFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">All Call Sites</option>
            {allSites.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={modelFilter}
            onChange={(e) => { setModelFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">All Models</option>
            {allModels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {(siteFilter || modelFilter) && (
            <button
              onClick={() => { setSiteFilter(""); setModelFilter(""); setPage(1); }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="h-3 w-3" /> ล้างตัวกรอง
            </button>
          )}
        </div>
      </header>

      {/* Table */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-300" />
              <span className="text-sm">กำลังโหลด...</span>
            </div>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Zap className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">
                {logs.length === 0 ? "ยังไม่มี AI calls ในช่วงเวลานี้" : "ไม่พบรายการที่ตรงกับตัวกรอง"}
              </p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort("timestamp")} className="flex items-center gap-1 hover:text-gray-700">
                      เวลา <SortIcon field="timestamp" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Model</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Call Site</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort("totalTokens")} className="flex items-center gap-1 ml-auto hover:text-gray-700">
                      Tokens <SortIcon field="totalTokens" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">In / Out</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort("costUSD")} className="flex items-center gap-1 ml-auto hover:text-gray-700">
                      Cost <SortIcon field="costUSD" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paged.map((log) => (
                  <tr key={log.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString("th-TH", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 font-mono max-w-[180px] truncate">{log.model}</td>
                    <td className="px-4 py-3"><CallSiteBadge site={log.callSite} /></td>
                    <td className="px-4 py-3 text-right"><TokensBadge tokens={log.totalTokens} /></td>
                    <td className="px-4 py-3 text-right text-[10px] text-gray-400 font-mono">
                      {log.promptTokens.toLocaleString()} / {log.completionTokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right"><CostBadge cost={log.costUSD} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && paged.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between bg-white">
            <p className="text-xs text-gray-500">
              แสดง <span className="font-medium text-gray-700">{(safePage - 1) * ITEMS_PER_PAGE + 1}</span>–
              <span className="font-medium text-gray-700">{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}</span>
              {" "}จาก <span className="font-medium text-gray-700">{filtered.length}</span> รายการ
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className={cn("h-8 w-8 flex items-center justify-center rounded-lg transition-colors", safePage <= 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100")}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span key={`dots-${idx}`} className="px-1 text-xs text-gray-400">...</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item as number)}
                      className={cn(
                        "h-8 min-w-8 px-2 flex items-center justify-center rounded-lg text-xs font-medium transition-colors",
                        safePage === item ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {item}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className={cn("h-8 w-8 flex items-center justify-center rounded-lg transition-colors", safePage >= totalPages ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100")}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
