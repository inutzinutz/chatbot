"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  inspectorLogs,
  AGENT_TYPES,
  type InspectorLog,
} from "@/lib/inspector";
import {
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Clock,
  User,
  MessageSquare,
  Bot,
  Shield,
  Zap,
  Brain,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type SortField = "time" | "processingDuration";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 15;

function AgentBadge({ agent }: { agent: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    "Supervise Agent": {
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-700",
      icon: <Shield className="h-3 w-3" />,
    },
    "Response Agent": {
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-700",
      icon: <MessageSquare className="h-3 w-3" />,
    },
    "Intent Agent": {
      bg: "bg-purple-50 border-purple-200",
      text: "text-purple-700",
      icon: <Brain className="h-3 w-3" />,
    },
  };
  const c = config[agent] || { bg: "bg-gray-50 border-gray-200", text: "text-gray-700", icon: null };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
        c.bg,
        c.text
      )}
    >
      {c.icon}
      {agent}
    </span>
  );
}

function DurationBadge({ ms }: { ms: number }) {
  const color =
    ms < 1000
      ? "text-green-600"
      : ms < 2000
        ? "text-amber-600"
        : "text-red-600";
  return (
    <span className={cn("text-sm font-mono tabular-nums", color)}>
      {ms.toLocaleString()} ms
    </span>
  );
}

function DetailModal({
  log,
  onClose,
}: {
  log: InspectorLog;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Log #{log.id}
              </h3>
              <p className="text-[10px] text-gray-400">{log.time}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                Customer
              </p>
              <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-gray-400" />
                {log.customer}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                Agent
              </p>
              <AgentBadge agent={log.agent} />
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                Duration
              </p>
              <DurationBadge ms={log.processingDuration} />
            </div>
            {log.intent && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
                  Intent
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {log.intent}
                  {log.confidence && (
                    <span className="ml-1.5 text-[10px] text-gray-400">
                      ({Math.round(log.confidence * 100)}%)
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
              Customer Message
            </p>
            <p className="text-sm text-gray-800">{log.message}</p>
          </div>

          {log.response && (
            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
              <p className="text-[10px] uppercase tracking-wider text-indigo-400 mb-1">
                AI Response
              </p>
              <p className="text-sm text-indigo-900">{log.response}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AIInspector() {
  const [customerSearch, setCustomerSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [sortField, setSortField] = useState<SortField | "">("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<InspectorLog | null>(null);

  const filtered = useMemo(() => {
    let result = [...inspectorLogs];

    if (customerSearch) {
      const q = customerSearch.toLowerCase();
      result = result.filter((l) => l.customer.toLowerCase().includes(q));
    }
    if (messageSearch) {
      const q = messageSearch.toLowerCase();
      result = result.filter((l) => l.message.toLowerCase().includes(q));
    }
    if (agentFilter) {
      result = result.filter((l) => l.agent === agentFilter);
    }
    if (sortField) {
      result.sort((a, b) => {
        let cmp = 0;
        if (sortField === "time") {
          cmp = a.id - b.id;
        } else {
          cmp = a.processingDuration - b.processingDuration;
        }
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [customerSearch, messageSearch, agentFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortButton = ({ field }: { field: SortField }) => {
    const isActive = sortField === field;
    return (
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => {
            setSortField(field);
            setSortDirection("asc");
          }}
          className={cn(
            "p-0.5 rounded hover:bg-gray-200 transition-colors",
            isActive && sortDirection === "asc"
              ? "text-indigo-600"
              : "text-gray-400"
          )}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            setSortField(field);
            setSortDirection("desc");
          }}
          className={cn(
            "p-0.5 rounded hover:bg-gray-200 transition-colors",
            isActive && sortDirection === "desc"
              ? "text-indigo-600"
              : "text-gray-400"
          )}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 min-h-14 h-14 px-5 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
            <Zap className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">AI Inspector</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          {filtered.length} logs
        </div>
      </header>

      {/* Table */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="min-w-full">
            <thead>
              {/* Column headers */}
              <tr className="sticky top-0 bg-gray-50 z-20 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Processing Duration
                </th>
              </tr>

              {/* Filter row */}
              <tr className="sticky top-[41px] bg-white z-10 border-b border-gray-200 shadow-sm">
                <td className="px-4 py-2">
                  <SortButton field="time" />
                </td>
                <td className="px-4 py-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search customer..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-2.5 py-1.5 pr-8 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                    />
                    {customerSearch ? (
                      <button
                        onClick={() => {
                          setCustomerSearch("");
                          setPage(1);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search message..."
                      value={messageSearch}
                      onChange={(e) => {
                        setMessageSearch(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-2.5 py-1.5 pr-8 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
                    />
                    {messageSearch ? (
                      <button
                        onClick={() => {
                          setMessageSearch("");
                          setPage(1);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <select
                    value={agentFilter}
                    onChange={(e) => {
                      setAgentFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white transition-all"
                  >
                    <option value="">All Agents</option>
                    {AGENT_TYPES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end">
                    <SortButton field="processingDuration" />
                  </div>
                </td>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    No logs found matching your filters.
                  </td>
                </tr>
              ) : (
                paged.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-500">
                      {log.time}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {log.customer}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-900">
                      <div className="truncate max-w-xs group-hover:text-indigo-700 transition-colors">
                        {log.message}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <AgentBadge agent={log.agent} />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <DurationBadge ms={log.processingDuration} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between bg-white">
          <p className="text-xs text-gray-500">
            Showing{" "}
            <span className="font-medium text-gray-700">
              {(safePage - 1) * ITEMS_PER_PAGE + 1}
            </span>
            –
            <span className="font-medium text-gray-700">
              {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-gray-700">{filtered.length}</span>{" "}
            logs
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-lg text-sm transition-colors",
                safePage <= 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - safePage) <= 1
              )
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                  acc.push("...");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span
                    key={`dots-${idx}`}
                    className="px-1 text-xs text-gray-400"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item as number)}
                    className={cn(
                      "h-8 min-w-8 px-2 flex items-center justify-center rounded-lg text-xs font-medium transition-colors",
                      safePage === item
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-lg text-sm transition-colors",
                safePage >= totalPages
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <DetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
