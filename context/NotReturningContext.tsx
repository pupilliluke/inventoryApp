import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { color } from '../theme/tokens';
import { notReturningItems } from '../data/notReturningItems';
import {
  subscribeNotReturningAdded, addNotReturning, removeNotReturning, NotReturningEntry,
} from '../utils/notReturning';

/**
 * Subtle status color for the "not getting back" dot, shared across the
 * inventory grid, pull-list search and the Not Getting Back page so the marker
 * always means the same thing.
 */
export const NOT_RETURNING_COLOR = color.warning;

export interface NotReturningRow extends NotReturningEntry {
  /** True for items from the built-in seed list (not user-removable). */
  seeded: boolean;
}

interface NotReturningContextValue {
  /** Combined seed + user-added items, sorted by name. */
  items: NotReturningRow[];
  /** Lowercased codes, for O(1) membership checks. */
  codes: Set<string>;
  loading: boolean;
  isNotReturning: (code?: string | null) => boolean;
  addItem: (item: NotReturningEntry) => Promise<void>;
  removeItem: (code: string) => Promise<void>;
}

const NotReturningContext = createContext<NotReturningContextValue | null>(null);

export const useNotReturning = (): NotReturningContextValue => {
  const ctx = useContext(NotReturningContext);
  if (!ctx) throw new Error('useNotReturning must be used within a NotReturningProvider');
  return ctx;
};

/**
 * Subscribes once to the user-added not-returning items and merges them with
 * the static seed list. Consumed by InventoryRow / pull lists (for the dot) and
 * the Not Getting Back page (for the full list + add/remove).
 */
export const NotReturningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [added, setAdded] = useState<Record<string, NotReturningEntry>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeNotReturningAdded((items) => {
      setAdded(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  const { items, codes } = useMemo(() => {
    const byCode = new Map<string, NotReturningRow>();
    for (const it of notReturningItems) {
      byCode.set(it.code.toLowerCase(), { code: it.code, name: it.name, seeded: true });
    }
    // User-added items don't override a seeded entry of the same code.
    for (const it of Object.values(added)) {
      const key = it.code.toLowerCase();
      if (!byCode.has(key)) byCode.set(key, { code: it.code, name: it.name, seeded: false });
    }
    const list = Array.from(byCode.values()).sort((a, b) => a.name.localeCompare(b.name));
    return { items: list, codes: new Set(byCode.keys()) };
  }, [added]);

  const isNotReturning = useCallback(
    (code?: string | null) => !!code && codes.has(String(code).toLowerCase()),
    [codes]
  );

  const addItem = useCallback((item: NotReturningEntry) => addNotReturning(item), []);
  const removeItem = useCallback((code: string) => removeNotReturning(code), []);

  const value = useMemo(
    () => ({ items, codes, loading, isNotReturning, addItem, removeItem }),
    [items, codes, loading, isNotReturning, addItem, removeItem]
  );

  return <NotReturningContext.Provider value={value}>{children}</NotReturningContext.Provider>;
};
