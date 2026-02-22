/**
 * Shared UI Primitives
 * Single source of truth for all design tokens and reusable components
 */

"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────

export const tokens = {
  radius: {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
    full: "rounded-full",
  },
  shadow: {
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
  },
  text: {
    label: "text-xs font-medium text-gray-500",
    labelSm: "text-[11px] font-medium text-gray-400 uppercase tracking-wide",
    body: "text-sm text-gray-700",
    heading: "text-base font-semibold text-gray-900",
    muted: "text-xs text-gray-400",
  },
  input: "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors",
};

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────

const STAT_COLOR_MAP: Record<string, string> = {
  indigo:  "from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-600",
  blue:    "from-blue-50 to-blue-100 border-blue-200 text-blue-600",
  emerald: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600",
  green:   "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600",
  amber:   "from-amber-50 to-amber-100 border-amber-200 text-amber-600",
  orange:  "from-orange-50 to-orange-100 border-orange-200 text-orange-600",
  red:     "from-red-50 to-red-100 border-red-200 text-red-600",
  purple:  "from-purple-50 to-purple-100 border-purple-200 text-purple-600",
  gray:    "from-gray-50 to-gray-100 border-gray-200 text-gray-500",
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  color?: keyof typeof STAT_COLOR_MAP;
  trend?: { value: number; label?: string };
  className?: string;
}

export function StatCard({ label, value, sub, icon, color = "indigo", trend, className }: StatCardProps) {
  const colorClass = STAT_COLOR_MAP[color] ?? STAT_COLOR_MAP.indigo;
  return (
    <div className={cn(
      "bg-gradient-to-br border rounded-xl p-4 flex flex-col gap-1 transition-all hover:shadow-md",
      colorClass, className
    )}>
      <div className="flex items-center justify-between">
        <span className={cn("text-[11px] font-semibold uppercase tracking-wide opacity-70")}>
          {label}
        </span>
        {icon && (
          <span className="opacity-60">{icon}</span>
        )}
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-[11px] opacity-60">{sub}</div>}
      {trend && (
        <div className={cn(
          "text-[11px] font-medium mt-0.5",
          trend.value > 0 ? "text-emerald-600" : trend.value < 0 ? "text-red-500" : "text-gray-400"
        )}>
          {trend.value > 0 ? "↑" : trend.value < 0 ? "↓" : "→"} {Math.abs(trend.value)}%{trend.label ? ` ${trend.label}` : ""}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// BADGE
// ─────────────────────────────────────────────

const BADGE_COLOR_MAP: Record<string, string> = {
  indigo:  "bg-indigo-100 text-indigo-700 border-indigo-200",
  blue:    "bg-blue-100 text-blue-700 border-blue-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  green:   "bg-green-100 text-green-700 border-green-200",
  amber:   "bg-amber-100 text-amber-700 border-amber-200",
  orange:  "bg-orange-100 text-orange-700 border-orange-200",
  red:     "bg-red-100 text-red-700 border-red-200",
  purple:  "bg-purple-100 text-purple-700 border-purple-200",
  gray:    "bg-gray-100 text-gray-600 border-gray-200",
  facebook:"bg-blue-100 text-blue-600 border-blue-200",
  line:    "bg-green-100 text-green-600 border-green-200",
  web:     "bg-gray-100 text-gray-500 border-gray-200",
};

interface BadgeProps {
  label: string;
  color?: keyof typeof BADGE_COLOR_MAP;
  size?: "xs" | "sm";
  dot?: boolean;
  className?: string;
}

export function Badge({ label, color = "gray", size = "xs", dot, className }: BadgeProps) {
  const colorClass = BADGE_COLOR_MAP[color] ?? BADGE_COLOR_MAP.gray;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-semibold border rounded-full uppercase tracking-wide",
      size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5",
      colorClass, className
    )}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", `bg-current opacity-70`)} />}
      {label}
    </span>
  );
}

// Platform-specific badge
export function PlatformBadge({ source }: { source?: "line" | "web" | "facebook" | string }) {
  if (source === "facebook") return <Badge label="FB" color="facebook" />;
  if (source === "line") return <Badge label="LINE" color="line" />;
  if (source === "web") return <Badge label="WEB" color="web" />;
  return null;
}

// ─────────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────────

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-5 w-5";
  return (
    <svg
      className={cn("animate-spin text-indigo-500", sizeClass, className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="กำลังโหลด..."
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}>
      {icon && (
        <div className="mb-4 h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {description && <p className="mt-1 text-xs text-gray-400 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// CARD
// ─────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export function Card({ children, className, title, action }: CardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  error:   <XCircle className="h-4 w-4 text-red-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  info:    <Info className="h-4 w-4 text-blue-500" />,
};

const TOAST_STYLES: Record<ToastType, string> = {
  success: "border-emerald-200 bg-emerald-50",
  error:   "border-red-200 bg-red-50",
  warning: "border-amber-200 bg-amber-50",
  info:    "border-blue-200 bg-blue-50",
};

// Global toast state (module-level so it works without Context)
let addToastFn: ((type: ToastType, message: string) => void) | null = null;

export function toast(message: string, type: ToastType = "info") {
  addToastFn?.(type, message);
}
toast.success = (msg: string) => toast(msg, "success");
toast.error   = (msg: string) => toast(msg, "error");
toast.warning = (msg: string) => toast(msg, "warning");
toast.info    = (msg: string) => toast(msg, "info");

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID?.() ?? Date.now().toString();
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    addToastFn = add;
    return () => { addToastFn = null; };
  }, [add]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg",
            "text-sm font-medium text-gray-800 pointer-events-auto",
            "animate-in slide-in-from-bottom-2 fade-in duration-200",
            TOAST_STYLES[t.type]
          )}
        >
          {TOAST_ICONS[t.type]}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="ml-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE WRAPPER (with fade transition)
// ─────────────────────────────────────────────

export function PageWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("animate-in fade-in duration-200 flex-1 min-h-0 overflow-auto", className)}>
      {children}
    </div>
  );
}
