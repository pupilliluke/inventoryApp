import { getDatabase, ref, push, set, update, remove, onValue } from 'firebase/database';
import { ActiveUser } from '../types/session';

export interface TruckItem {
  code: string;
  name: string;
  quantity: number;
}

export interface TruckList {
  id: string;
  title: string;
  /** Free-form text notes, one entry per line/card. */
  notes: string[];
  /** Inventory items gathered for this truck, keyed by code. */
  items: Record<string, TruckItem>;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

const PATH = 'trucks';

/** Coerce stored notes (array, object, or legacy string) into a string[]. */
function normalizeNotes(raw: any): string[] {
  if (Array.isArray(raw)) return raw.filter((n) => typeof n === 'string');
  if (raw && typeof raw === 'object') return Object.values(raw).filter((n): n is string => typeof n === 'string');
  if (typeof raw === 'string' && raw.trim()) return [raw];
  return [];
}

function toTruckList(id: string, raw: any): TruckList {
  return {
    id,
    title: raw?.title ?? 'Untitled',
    notes: normalizeNotes(raw?.notes),
    items: raw?.items ?? {},
    ownerId: raw?.ownerId ?? '',
    ownerName: raw?.ownerName ?? 'Unknown',
    createdAt: raw?.createdAt ?? '',
    updatedAt: raw?.updatedAt ?? raw?.createdAt ?? '',
  };
}

/** Create a new truck list owned by the active user. Returns the new list id. */
export async function createTruck(owner: ActiveUser, title: string): Promise<string> {
  const db = getDatabase();
  const listRef = push(ref(db, PATH));
  const now = new Date().toISOString();
  await set(listRef, {
    id: listRef.key,
    title: title.trim(),
    notes: [],
    items: {},
    ownerId: owner.id,
    ownerName: owner.name,
    createdAt: now,
    updatedAt: now,
  });
  return listRef.key as string;
}

/** Replace fields of an existing truck list. */
export async function saveTruck(
  id: string,
  patch: { title?: string; notes?: string[]; items?: Record<string, TruckItem> }
): Promise<void> {
  const db = getDatabase();
  await update(ref(db, `${PATH}/${id}`), {
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    // Firebase drops empty arrays/objects; store [] explicitly via null-safe write.
    ...(patch.notes !== undefined ? { notes: patch.notes.filter((n) => n.trim().length > 0) } : {}),
    ...(patch.items !== undefined ? { items: patch.items } : {}),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTruck(id: string): Promise<void> {
  const db = getDatabase();
  await remove(ref(db, `${PATH}/${id}`));
}

/** Subscribe to all truck lists, newest first. Returns an unsubscribe. */
export function subscribeTrucks(callback: (lists: TruckList[]) => void): () => void {
  const db = getDatabase();
  return onValue(ref(db, PATH), (snapshot) => {
    const data = snapshot.val() || {};
    const lists = Object.entries(data).map(([id, raw]) => toTruckList(id, raw));
    lists.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    callback(lists);
  });
}

/** Subscribe to a single truck list by id (null if missing). Returns an unsubscribe. */
export function subscribeTruck(id: string, callback: (list: TruckList | null) => void): () => void {
  const db = getDatabase();
  return onValue(ref(db, `${PATH}/${id}`), (snapshot) => {
    const raw = snapshot.val();
    callback(raw ? toTruckList(id, raw) : null);
  });
}

/** Total units across all items in a truck list. */
export function truckTotal(list: Pick<TruckList, 'items'>): number {
  return Object.values(list.items || {}).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
}

/** Number of distinct line items in a truck list. */
export function truckLineCount(list: Pick<TruckList, 'items'>): number {
  return Object.keys(list.items || {}).length;
}
