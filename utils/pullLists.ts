import { getDatabase, ref, push, set, update, remove, onValue } from 'firebase/database';
import { ActiveUser } from '../types/session';

export interface PullListItem {
  code: string;
  name: string;
  quantity: number;
}

export interface PullList {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  items: Record<string, PullListItem>;
  createdAt: string;
  updatedAt: string;
}

const PATH = 'pullLists';

/**
 * Create a new pull list owned by the active user. Returns the new list id.
 */
export async function createPullList(
  owner: ActiveUser,
  title: string,
  items: Record<string, PullListItem> = {}
): Promise<string> {
  const db = getDatabase();
  const listRef = push(ref(db, PATH));
  const now = new Date().toISOString();
  await set(listRef, {
    id: listRef.key,
    title: title.trim(),
    ownerId: owner.id,
    ownerName: owner.name,
    items,
    createdAt: now,
    updatedAt: now,
  });
  return listRef.key as string;
}

/**
 * Replace the title and items of an existing pull list.
 */
export async function savePullList(
  id: string,
  patch: { title?: string; items?: Record<string, PullListItem> }
): Promise<void> {
  const db = getDatabase();
  await update(ref(db, `${PATH}/${id}`), {
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.items !== undefined ? { items: patch.items } : {}),
    updatedAt: new Date().toISOString(),
  });
}

export async function deletePullList(id: string): Promise<void> {
  const db = getDatabase();
  await remove(ref(db, `${PATH}/${id}`));
}

/**
 * Subscribe to all pull lists (everyone's), newest first. Returns an unsubscribe.
 */
export function subscribePullLists(callback: (lists: PullList[]) => void): () => void {
  const db = getDatabase();
  const listsRef = ref(db, PATH);
  return onValue(listsRef, (snapshot) => {
    const data = snapshot.val() || {};
    const lists: PullList[] = Object.entries(data).map(([id, raw]: [string, any]) => ({
      id,
      title: raw?.title ?? 'Untitled',
      ownerId: raw?.ownerId ?? '',
      ownerName: raw?.ownerName ?? 'Unknown',
      items: raw?.items ?? {},
      createdAt: raw?.createdAt ?? '',
      updatedAt: raw?.updatedAt ?? raw?.createdAt ?? '',
    }));
    lists.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    callback(lists);
  });
}

/**
 * Subscribe to a single pull list by id. Calls back with null if it doesn't
 * exist (or was deleted). Returns an unsubscribe.
 */
export function subscribePullList(id: string, callback: (list: PullList | null) => void): () => void {
  const db = getDatabase();
  return onValue(ref(db, `${PATH}/${id}`), (snapshot) => {
    const raw = snapshot.val();
    if (!raw) {
      callback(null);
      return;
    }
    callback({
      id,
      title: raw.title ?? 'Untitled',
      ownerId: raw.ownerId ?? '',
      ownerName: raw.ownerName ?? 'Unknown',
      items: raw.items ?? {},
      createdAt: raw.createdAt ?? '',
      updatedAt: raw.updatedAt ?? raw.createdAt ?? '',
    });
  });
}

/** Total units across all items in a pull list. */
export function pullListTotal(list: Pick<PullList, 'items'>): number {
  return Object.values(list.items || {}).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
}

/** Number of distinct line items in a pull list. */
export function pullListLineCount(list: Pick<PullList, 'items'>): number {
  return Object.keys(list.items || {}).length;
}
