import { getDatabase, ref, update, onValue } from 'firebase/database';

export interface LowQuantityItem {
  code: string;
  name: string;
  quantity: number;
}

export interface LowQuantityList {
  /** Free-form text notes, one entry per card. */
  notes: string[];
  /** Inventory items running low or out, keyed by code. */
  items: Record<string, LowQuantityItem>;
  updatedAt: string;
}

// Single shared list (not a collection like trucks/pullLists).
const PATH = 'lowQuantity';

/** Coerce stored notes (array, object, or legacy string) into a string[]. */
function normalizeNotes(raw: any): string[] {
  if (Array.isArray(raw)) return raw.filter((n) => typeof n === 'string');
  if (raw && typeof raw === 'object') return Object.values(raw).filter((n): n is string => typeof n === 'string');
  if (typeof raw === 'string' && raw.trim()) return [raw];
  return [];
}

function toLowQuantityList(raw: any): LowQuantityList {
  return {
    notes: normalizeNotes(raw?.notes),
    items: raw?.items ?? {},
    updatedAt: raw?.updatedAt ?? '',
  };
}

/** Replace fields of the shared low-quantity list. */
export async function saveLowQuantity(
  patch: { notes?: string[]; items?: Record<string, LowQuantityItem> }
): Promise<void> {
  const db = getDatabase();
  await update(ref(db, PATH), {
    ...(patch.notes !== undefined ? { notes: patch.notes.filter((n) => n.trim().length > 0) } : {}),
    ...(patch.items !== undefined ? { items: patch.items } : {}),
    updatedAt: new Date().toISOString(),
  });
}

/** Subscribe to the shared low-quantity list. Returns an unsubscribe. */
export function subscribeLowQuantity(callback: (list: LowQuantityList) => void): () => void {
  const db = getDatabase();
  return onValue(ref(db, PATH), (snapshot) => {
    callback(toLowQuantityList(snapshot.val()));
  });
}

/** Total units across all items in the list. */
export function lowQuantityTotal(list: Pick<LowQuantityList, 'items'>): number {
  return Object.values(list.items || {}).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
}

/** Number of distinct line items in the list. */
export function lowQuantityLineCount(list: Pick<LowQuantityList, 'items'>): number {
  return Object.keys(list.items || {}).length;
}
