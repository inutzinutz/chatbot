"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * A hook that syncs React state to localStorage.
 * - SSR-safe: only reads localStorage after mount
 * - Falls back to `initialValue` when nothing is stored or on parse error
 * - Provides a `reset` function to clear saved data and return to initial
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  // Initialize from localStorage (SSR-safe: always start with initialValue)
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored) as T);
      }
    } catch {
      // corrupt data — ignore and use initial
    }
    setHydrated(true);
  }, [key]);

  // Persist to localStorage on every change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or unavailable — silently fail
    }
  }, [key, value, hydrated]);

  // Reset to initial value and clear storage
  const reset = useCallback(() => {
    localStorage.removeItem(key);
    setValue(initialValue);
  }, [key, initialValue]);

  return [value, setValue, reset];
}
