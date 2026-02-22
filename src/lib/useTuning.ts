"use client";

/**
 * useTuning — drop-in replacement for useLocalStorage in all Tuning AI pages.
 *
 * Fetches from /api/tuning on mount, and persists back on every write.
 * API is Redis-backed so data is shared across all browsers/devices.
 */

import { useState, useEffect, useCallback } from "react";

type TuningType =
  | "products"
  | "sale-scripts"
  | "knowledge"
  | "intents"
  | "promotions"
  | "quick-replies"
  | "shipping";

export function useTuning<T>(
  businessId: string,
  type: TuningType
): [T[], (updater: T[] | ((prev: T[]) => T[])) => void, boolean] {
  const [items, setItemsState] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load from API on mount ──
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tuning?businessId=${encodeURIComponent(businessId)}&type=${type}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: { items: T[] }) => {
        if (!cancelled) setItemsState(data.items ?? []);
      })
      .catch(() => { /* keep empty state on error */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [businessId, type]);

  // ── Save to API on every change ──
  const save = useCallback(
    (newItems: T[]) => {
      fetch("/api/tuning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", businessId, type, items: newItems }),
      }).catch(() => { /* non-critical — UI already updated */ });
    },
    [businessId, type]
  );

  const setItems = useCallback(
    (updater: T[] | ((prev: T[]) => T[])) => {
      setItemsState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        save(next);
        return next;
      });
    },
    [save]
  );

  return [items, setItems, loading];
}
